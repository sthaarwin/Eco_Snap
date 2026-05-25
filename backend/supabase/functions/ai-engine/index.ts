// EcoSnap AI Engine Edge Function
// User 3: Intelligence Lead
// Core AI service: image verification, narrative generation, behavioral clustering
import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { encodeBase64 } from 'https://deno.land/std@0.210.0/encoding/base64.ts';
import { corsHeaders, supabaseAdmin } from '../_shared/supabase.ts';
const AI_SERVICE_KEY = Deno.env.get('AI_SERVICE_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const GEMINI_TEXT_MODEL = 'gemini-flash-latest';
const GEMINI_VISION_MODEL = 'gemini-flash-latest';
const FALLBACK_VISION_MODEL = 'gemini-flash-latest';
const VERIFY_APPROVAL_CONFIDENCE = 0.85;
const VERIFY_REJECTION_CONFIDENCE = 0.75;
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  const url = new URL(req.url);
  const method = req.method;
  const pathname = url.pathname;
  try {
    // POST /verify-image - Verify a submission image via Gemini Vision
    if (method === 'POST' && pathname.endsWith('/verify-image')) {
      return await handleVerifyImage(req);
    }
    // POST /generate-narrative - Generate mission narrative from weather data
    if (method === 'POST' && pathname.endsWith('/generate-narrative')) {
      return await handleGenerateNarrative(req);
    }
    // POST /cluster-users - Compute behavioral clusters for all users
    if (method === 'POST' && pathname.endsWith('/cluster-users')) {
      return await handleClusterUsers(req);
    }
    return new Response(JSON.stringify({
      error: 'Not found',
      code: 'NOT_FOUND'
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('ai-engine error:', err);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: err.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
// ─── Verify Image ─────────────────────────────────────────────────────────
async function handleVerifyImage(req) {
  const { submission_id } = await req.json();
  if (!submission_id) {
    return new Response(JSON.stringify({
      error: 'Missing submission_id',
      code: 'BAD_REQUEST'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  // Fetch submission + mission details
  const { data: submission, error: subError } = await supabaseAdmin.from('mission_submissions').select('id, mission_id, image_url, verification_status').eq('id', submission_id).single();
  if (subError || !submission) {
    return new Response(JSON.stringify({
      error: 'Submission not found',
      code: 'NOT_FOUND'
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  if (submission.verification_status !== 'pending') {
    return new Response(JSON.stringify({
      error: 'Submission already verified',
      code: 'ALREADY_VERIFIED'
    }), {
      status: 409,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  const { data: mission, error: misError } = await supabaseAdmin.from('missions').select('title, narrative').eq('id', submission.mission_id).single();
  if (misError || !mission) {
    return new Response(JSON.stringify({
      error: 'Mission not found',
      code: 'NOT_FOUND'
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  // Download image from Supabase storage
  let imageBase64;
  try {
    imageBase64 = await downloadImageAsBase64(submission.image_url);
  } catch {
    return new Response(JSON.stringify({
      error: 'Failed to download image',
      code: 'IMAGE_DOWNLOAD_FAILED'
    }), {
      status: 502,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  // Call Gemini Vision for verification
  const result = await callGeminiVision(imageBase64, mission.narrative);
  // Send result to ai-verification-receiver
  const receiverUrl = `${SUPABASE_URL}/functions/v1/ai-verification-receiver/verify`;
  const receiverRes = await fetch(receiverUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AI-SERVICE-KEY': AI_SERVICE_KEY
    },
    body: JSON.stringify({
      submission_id: submission.id,
      confidence_score: result.confidence_score,
      verdict: result.verdict,
      ai_reasoning: result.ai_reasoning
    })
  });
  if (!receiverRes.ok) {
    const errBody = await receiverRes.text();
    console.error('ai-verification-receiver error:', receiverRes.status, errBody);
    return new Response(JSON.stringify({
      error: 'AI verification receiver failed',
      code: 'RECEIVER_ERROR'
    }), {
      status: 502,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  const receiverData = await receiverRes.json();
  return new Response(JSON.stringify({
    submission_id: submission.id,
    confidence_score: result.confidence_score,
    verification_status: receiverData.verdict,
    label: result.label,
    ai_reasoning: result.ai_reasoning,
    auto_approved: receiverData.auto_approved,
    reward_awarded: receiverData.reward_awarded
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
// ─── Generate Narrative ────────────────────────────────────────────────────
async function handleGenerateNarrative(req) {
  const body = await req.json();
  const { temperature, condition, wind_speed, humidity, location_name, lat, lng } = body;
  if (typeof temperature !== 'number' || !condition || !location_name) {
    return new Response(JSON.stringify({
      error: 'Missing required fields: temperature, condition, location_name',
      code: 'BAD_REQUEST'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  const prompt = buildNarrativePrompt(temperature, condition, wind_speed, humidity, location_name);
  const geminiResult = await callGeminiText(prompt);
  return new Response(JSON.stringify({
    title: geminiResult.title,
    narrative: geminiResult.narrative,
    mission_type: geminiResult.mission_type,
    priority: geminiResult.priority,
    coordinates: {
      lat,
      lng
    },
    location_name
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
// ─── Cluster Users ─────────────────────────────────────────────────────────
async function handleClusterUsers(req) {
  const { data: profiles, error } = await supabaseAdmin.from('profiles').select('id, xp, level, role');
  if (error) {
    return new Response(JSON.stringify({
      error: 'Failed to fetch profiles',
      code: 'DB_ERROR'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  const { data: allTxs } = await supabaseAdmin.from('xp_transactions').select('user_id');
  const missionCountMap = new Map();
  if (allTxs) {
    for (const tx of allTxs) {
      missionCountMap.set(tx.user_id, (missionCountMap.get(tx.user_id) || 0) + 1);
    }
  }
  const updates = [];
  for (const profile of profiles) {
    const missionsDone = missionCountMap.get(profile.id) || 0;
    const role = computeCluster(profile.xp || 0, missionsDone);
    if (role !== profile.role) {
      updates.push({
        id: profile.id,
        role
      });
    }
  }
  for (const update of updates) {
    await supabaseAdmin.from('profiles').update({
      role: update.role,
      updated_at: new Date().toISOString()
    }).eq('id', update.id);
  }
  return new Response(JSON.stringify({
    profiles_analyzed: profiles.length,
    profiles_updated: updates.length,
    updated: updates
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
// ─── API Key Rotation ──────────────────────────────────────────────────────
const COOLDOWN_MS = 60_000;
const ALL_KEYS = (Deno.env.get('GEMINI_API_KEYS') || '').split(',').filter(Boolean);

async function pickKeyIndex(serviceName) {
  if (ALL_KEYS.length === 0) return -1;
  const { data } = await supabaseAdmin
    .from('api_cooldowns')
    .select('current_key_index, last_called_at')
    .eq('service_name', serviceName)
    .maybeSingle();

  const now = new Date();
  if (data?.last_called_at) {
    const elapsed = now.getTime() - new Date(data.last_called_at).getTime();
    if (elapsed < COOLDOWN_MS) {
      const waitMs = COOLDOWN_MS - elapsed;
      console.log(`Cooldown active for ${serviceName}, waiting ${waitMs}ms`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
  const index = data?.current_key_index ?? 0;
  return index % ALL_KEYS.length;
}

async function saveKeyIndex(serviceName, index) {
  await supabaseAdmin
    .from('api_cooldowns')
    .upsert({
      service_name: serviceName,
      last_called_at: new Date().toISOString(),
      current_key_index: index
    });
}

async function callWithKeyRotation(serviceName, keyIndex, makeRequest) {
  const startIndex = keyIndex;
  let attempts = 0;
  while (attempts < ALL_KEYS.length) {
    const idx = (startIndex + attempts) % ALL_KEYS.length;
    const apiKey = ALL_KEYS[idx];
    attempts++;
    try {
      const res = await makeRequest(apiKey);
      if (res.status === 429) {
        console.warn(`Key ${idx} rate-limited (429), trying next key...`);
        continue;
      }
      await saveKeyIndex(serviceName, idx);
      return res;
    } catch (err) {
      console.error(`Key ${idx} failed:`, err);
      continue;
    }
  }
  return null;
}
// ─── Gemini API Calls ──────────────────────────────────────────────────────
async function callGeminiText(prompt) {
  const keyIndex = await pickKeyIndex('gemini_text');
  if (keyIndex < 0) return getMockNarrative();

  const res = await callWithKeyRotation('gemini_text', keyIndex, async (apiKey) => {
    return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
      })
    });
  });

  if (!res) return getMockNarrative();
  if (!res.ok) {
    const errText = await res.text();
    console.error('Gemini API error:', res.status, errText);
    return getMockNarrative();
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  try {
    const cleaned = extractJson(text);
    return JSON.parse(cleaned);
  } catch {
    return getMockNarrative();
  }
}
async function callGeminiVision(imageBase64, missionNarrative, model = GEMINI_VISION_MODEL) {
  const keyIndex = await pickKeyIndex('gemini_vision');
  if (keyIndex < 0) {
    console.error('CRITICAL: GEMINI_API_KEYS is missing or empty.');
    return {
      ...getMockVerification(),
      ai_reasoning: 'DEBUG-MOCK: GEMINI_API_KEYS missing from Edge Function Env.'
    };
  }

  console.log(`Starting Gemini Vision with key index ${keyIndex}`);
  const prompt = buildVerificationPrompt(missionNarrative);

  const res = await callWithKeyRotation('gemini_vision', keyIndex, async (apiKey) => {
    console.log(`Calling Gemini Vision (${model})...`);
    return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
          ]
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
      })
    });
  });

  if (!res) {
    return {
      ...getMockVerification(),
      ai_reasoning: 'All API keys exhausted or rate-limited.'
    };
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Gemini Vision API error:`, res.status, errText);
    return {
      ...getMockVerification(),
      ai_reasoning: `Gemini API Error (${res.status}): ${errText.slice(0, 100)}...`
    };
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  try {
    const cleaned = extractJson(text);
    return normalizeVisionVerification(JSON.parse(cleaned));
  } catch (parseErr) {
    console.error('Failed to parse Gemini Vision JSON:', parseErr, 'Raw text:', text);
    return getMockVerification();
  }
}
function normalizeVisionVerification(raw) {
  const confidenceScore = clampConfidence(typeof raw?.confidence_score === 'number' ? raw.confidence_score : parseFloat(String(raw?.confidence_score || 0)));
  const rawVerdict = String(raw?.verdict || '').toLowerCase();
  let verdict = 'needs_review';
  if (rawVerdict === 'approved' && confidenceScore >= VERIFY_APPROVAL_CONFIDENCE) {
    verdict = 'approved';
  } else if (rawVerdict === 'rejected' && confidenceScore >= VERIFY_REJECTION_CONFIDENCE) {
    verdict = 'rejected';
  }
  return {
    confidence_score: confidenceScore,
    verdict,
    label: String(raw?.label || 'ambiguous').trim() || 'ambiguous',
    ai_reasoning: String(raw?.ai_reasoning || 'No specific reasoning provided by AI.').trim()
  };
}
function clampConfidence(value) {
  if (isNaN(value) || !isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
// ─── Image Download ────────────────────────────────────────────────────────
async function downloadImageAsBase64(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return encodeBase64(arrayBuffer);
}
function extractJson(text) {
  // Matches either raw JSON or JSON inside markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) return jsonMatch[1].trim();
  return text.trim();
}
// ─── Prompt Builders ───────────────────────────────────────────────────────
function buildNarrativePrompt(temperature, condition, windSpeed, humidity, locationName) {
  const urgency = computeUrgency(condition, windSpeed);
  return `You are the EcoSnap "World Engine" — an AI that generates urgent environmental response missions.

Current environmental conditions:
- Location: ${locationName}
- Temperature: ${temperature}°C
- Condition: ${condition}
- Wind Speed: ${windSpeed}m/s
- Humidity: ${humidity}%
- Urgency Level: ${urgency}/3

Generate a mission with EXACTLY this JSON structure (no markdown, no code fences, raw JSON only):
{
  "title": "string (a short, punchy mission title, max 8 words)",
  "narrative": "string (a dramatic, urgent mission brief - 2-3 sentences with emojis, describing the specific environmental threat and what needs to be done)",
  "mission_type": "string (one of: emergency_drainage | plastic_drift | standard_patrol | cafeteria_overflow | green_restoration)",
  "priority": number (1-3, where 3 is most urgent)
}`;
}
function buildVerificationPrompt(missionNarrative) {
  return `You are an environmental waste verification AI for EcoSnap. The user was assigned this mission:

Mission: "${missionNarrative}"

Analyze the submitted photo and choose exactly one outcome:
- "approved": the photo clearly proves the assigned environmental mission was completed or shows directly relevant cleanup/action evidence.
- "rejected": the photo is clearly invalid, unrelated, a selfie, a random object, blank/blocked, too blurry/dark to inspect, or clearly does not match the mission.
- "needs_review": the photo has some relevant environmental context but is ambiguous, partially visible, or not strong enough for automatic approval/rejection.

Be strict. Use council review only for genuinely uncertain cases, not obviously valid or obviously invalid images.

Respond with EXACTLY this JSON (no markdown, no code fences, raw JSON only):
{
  "confidence_score": number (0.0-1.0, where 1.0 is certain the chosen verdict is correct),
  "verdict": "string (one of: approved | rejected | needs_review)",
  "label": "string (one of: plastic_waste | paper_waste | organic_waste | mixed_waste | cleaned_area | unrelated | ambiguous)",
  "ai_reasoning": "string (1-2 sentences explaining the verification decision)"
}`;
}
// ─── Helpers ───────────────────────────────────────────────────────────────
function computeUrgency(condition, windSpeed) {
  const cond = condition.toLowerCase();
  if (cond.includes('storm') || cond.includes('heavy') || windSpeed > 10) return 3;
  if (cond.includes('rain') || cond.includes('drizzle') || windSpeed > 5) return 2;
  return 1;
}
function computeCluster(xp, missionsCompleted) {
  const score = xp * 0.7 + missionsCompleted * 30;
  if (score >= 800) return 'warrior';
  return 'scout';
}
// ─── Mock Fallbacks ────────────────────────────────────────────────────────
function getMockNarrative() {
  return {
    title: 'Plastic Surge in Block C',
    narrative: '🚨 EMERGENCY: Plastic debris detected near campus drainage systems. Rapid response required to prevent environmental damage!',
    mission_type: 'emergency_drainage',
    priority: 3
  };
}
function getMockVerification() {
  return {
    confidence_score: 0,
    verdict: 'needs_review',
    label: 'ambiguous',
    ai_reasoning: 'DEBUG-MOCK: AI verification unavailable, model failed, or fallback exhausted. Manual review required.'
  };
}
