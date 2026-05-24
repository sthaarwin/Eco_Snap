// EcoSnap AI Engine Edge Function
// User 3: Intelligence Lead
// Core AI service: image verification, narrative generation, behavioral clustering

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'
import { corsHeaders, supabaseAdmin } from '../_shared/supabase.ts'
import { ApiError } from '../_shared/contracts.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''
const AI_SERVICE_KEY = Deno.env.get('AI_SERVICE_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const GEMINI_TEXT_MODEL = 'gemini-2.5-flash'
const GEMINI_VISION_MODEL = 'gemini-2.5-flash'

const VERIFY_CONFIDENCE_AUTO_APPROVE = 0.9

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const method = req.method
  const path = url.pathname.replace('/ai-engine', '')

  try {
        // POST /verify-image - Verify a submission image via Gemini Vision
    if (method === 'POST' && path === '/verify-image') {
      return await handleVerifyImage(req)
    }

    // POST /generate-narrative - Generate mission narrative from weather data
    if (method === 'POST' && path === '/generate-narrative') {
      return await handleGenerateNarrative(req)
    }

    // POST /cluster-users - Compute behavioral clusters for all users
    if (method === 'POST' && path === '/cluster-users') {
      return await handleClusterUsers(req)
    }

    return new Response(
      JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' } satisfies ApiError),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('ai-engine error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR', details: err.message } satisfies ApiError),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

// ─── Verify Image ─────────────────────────────────────────────────────────

async function handleVerifyImage(req: Request): Promise<Response> {
  const { submission_id } = await req.json() as { submission_id: string }

  if (!submission_id) {
    return new Response(
      JSON.stringify({ error: 'Missing submission_id', code: 'BAD_REQUEST' } satisfies ApiError),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Fetch submission + mission details
  const { data: submission, error: subError } = await supabaseAdmin
    .from('mission_submissions')
    .select('id, mission_id, image_url, verification_status')
    .eq('id', submission_id)
    .single()

  if (subError || !submission) {
    return new Response(
      JSON.stringify({ error: 'Submission not found', code: 'NOT_FOUND' } satisfies ApiError),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  if (submission.verification_status !== 'pending') {
    return new Response(
      JSON.stringify({ error: 'Submission already verified', code: 'ALREADY_VERIFIED' } satisfies ApiError),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const { data: mission, error: misError } = await supabaseAdmin
    .from('missions')
    .select('title, narrative')
    .eq('id', submission.mission_id)
    .single()

  if (misError || !mission) {
    return new Response(
      JSON.stringify({ error: 'Mission not found', code: 'NOT_FOUND' } satisfies ApiError),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Download image from Supabase storage
  let imageBase64: string
  try {
    imageBase64 = await downloadImageAsBase64(submission.image_url)
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to download image', code: 'IMAGE_DOWNLOAD_FAILED' } satisfies ApiError),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Call Gemini Vision for verification
  const result = await callGeminiVision(imageBase64, mission.narrative)

  // Send result to ai-verification-receiver
  const receiverUrl = `${SUPABASE_URL}/functions/v1/ai-verification-receiver/verify`
  const receiverRes = await fetch(receiverUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AI-SERVICE-KEY': AI_SERVICE_KEY,
    },
    body: JSON.stringify({
      submission_id: submission.id,
      confidence_score: result.confidence_score,
      verdict: result.confidence_score > VERIFY_CONFIDENCE_AUTO_APPROVE ? 'approved' : 'needs_review',
      ai_reasoning: result.ai_reasoning,
    }),
  })

  if (!receiverRes.ok) {
    const errBody = await receiverRes.text()
    console.error('ai-verification-receiver error:', receiverRes.status, errBody)
    return new Response(
      JSON.stringify({ error: 'AI verification receiver failed', code: 'RECEIVER_ERROR' } satisfies ApiError),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const receiverData = await receiverRes.json()

  return new Response(
    JSON.stringify({
      submission_id: submission.id,
      confidence_score: result.confidence_score,
      label: result.label,
      ai_reasoning: result.ai_reasoning,
      auto_approved: receiverData.auto_approved,
      reward_awarded: receiverData.reward_awarded,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

// ─── Generate Narrative ────────────────────────────────────────────────────

async function handleGenerateNarrative(req: Request): Promise<Response> {
  const body = await req.json() as {
    temperature: number
    condition: string
    wind_speed: number
    humidity: number
    location_name: string
    lat: number
    lng: number
  }

  const { temperature, condition, wind_speed, humidity, location_name, lat, lng } = body

  if (typeof temperature !== 'number' || !condition || !location_name) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: temperature, condition, location_name', code: 'BAD_REQUEST' } satisfies ApiError),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const prompt = buildNarrativePrompt(temperature, condition, wind_speed, humidity, location_name)

  const geminiResult = await callGeminiText(prompt)

  return new Response(
    JSON.stringify({
      title: geminiResult.title,
      narrative: geminiResult.narrative,
      mission_type: geminiResult.mission_type,
      priority: geminiResult.priority,
      coordinates: { lat, lng },
      location_name,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

// ─── Cluster Users ─────────────────────────────────────────────────────────

async function handleClusterUsers(req: Request): Promise<Response> {
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, xp, level, role')

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch profiles', code: 'DB_ERROR' } satisfies ApiError),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const { data: allTxs } = await supabaseAdmin
    .from('xp_transactions')
    .select('user_id')

  const missionCountMap = new Map<string, number>()
  if (allTxs) {
    for (const tx of allTxs) {
      missionCountMap.set(tx.user_id, (missionCountMap.get(tx.user_id) || 0) + 1)
    }
  }

  const updates: Array<{ id: string; role: string }> = []

  for (const profile of profiles) {
    const missionsDone = missionCountMap.get(profile.id) || 0
    const role = computeCluster(profile.xp || 0, missionsDone)
    if (role !== profile.role) {
      updates.push({ id: profile.id, role })
    }
  }

  for (const update of updates) {
    await supabaseAdmin
      .from('profiles')
      .update({ role: update.role, updated_at: new Date().toISOString() })
      .eq('id', update.id)
  }

  return new Response(
    JSON.stringify({
      profiles_analyzed: profiles.length,
      profiles_updated: updates.length,
      updated: updates,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

// ─── Gemini API Calls ──────────────────────────────────────────────────────

async function callGeminiText(prompt: string): Promise<{
  title: string
  narrative: string
  mission_type: string
  priority: number
}> {
  if (!GEMINI_API_KEY) {
    return getMockNarrative()
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
      }),
    },
  )

  if (!res.ok) {
    const errText = await res.text()
    console.error('Gemini API error:', res.status, errText)
    return getMockNarrative()
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return getMockNarrative()
  }
}

async function callGeminiVision(
  imageBase64: string,
  missionNarrative: string,
): Promise<{
  confidence_score: number
  label: string
  ai_reasoning: string
}> {
  if (!GEMINI_API_KEY) {
    return getMockVerification()
  }

  const prompt = buildVerificationPrompt(missionNarrative)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
          ],
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
      }),
    },
  )

  if (!res.ok) {
    const errText = await res.text()
    console.error('Gemini Vision API error:', res.status, errText)
    return getMockVerification()
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return getMockVerification()
  }
}

// ─── Image Download ────────────────────────────────────────────────────────

async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)

  const blob = await res.arrayBuffer()
  const bytes = new Uint8Array(blob)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// ─── Prompt Builders ───────────────────────────────────────────────────────

function buildNarrativePrompt(
  temperature: number,
  condition: string,
  windSpeed: number,
  humidity: number,
  locationName: string,
): string {
  const urgency = computeUrgency(condition, windSpeed)
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
}`
}

function buildVerificationPrompt(missionNarrative: string): string {
  return `You are an environmental waste verification AI for EcoSnap. The user was assigned this mission:

Mission: "${missionNarrative}"

Analyze the submitted photo. Determine if it shows PROOF that the mission was actually completed.
- If the photo clearly shows waste collection, cleaned area, or relevant environmental action, accept it.
- If the photo is unrelated (random object, selfie, landscape with no waste context, or ambiguous), reject it.
- Be strict — staged photos with no real cleanup evidence should be rejected.

Respond with EXACTLY this JSON (no markdown, no code fences, raw JSON only):
{
  "confidence_score": number (0.0-1.0, where 1.0 is certain the mission was completed),
  "label": "string (one of: plastic_waste | paper_waste | organic_waste | mixed_waste | cleaned_area | unrelated | ambiguous)",
  "ai_reasoning": "string (1-2 sentences explaining the verification decision)"
}`
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function computeUrgency(condition: string, windSpeed: number): number {
  const cond = condition.toLowerCase()
  if (cond.includes('storm') || cond.includes('heavy') || windSpeed > 10) return 3
  if (cond.includes('rain') || cond.includes('drizzle') || windSpeed > 5) return 2
  return 1
}

function computeCluster(xp: number, missionsCompleted: number): string {
  const score = xp * 0.7 + missionsCompleted * 30
  if (score >= 800) return 'warrior'
  return 'scout'
}

// ─── Mock Fallbacks ────────────────────────────────────────────────────────

function getMockNarrative() {
  return {
    title: 'Plastic Surge in Block C',
    narrative: '🚨 EMERGENCY: Plastic debris detected near campus drainage systems. Rapid response required to prevent environmental damage!',
    mission_type: 'emergency_drainage',
    priority: 3,
  }
}

function getMockVerification() {
  return {
    confidence_score: 0.75,
    label: 'mixed_waste',
    ai_reasoning: 'AI verification unavailable or Gemini call failed. Defaulting to needs_review.',
  }
}
