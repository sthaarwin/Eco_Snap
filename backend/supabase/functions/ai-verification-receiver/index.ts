// EcoSnap AI Verification Receiver Edge Function
// Accepts User 3 AI results, applies auto-approval, and awards XP for approved submissions.

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'
import { corsHeaders, requireUser, supabaseAdmin } from '../_shared/supabase.ts'
import { AiVerificationRequest, AiVerificationResponse, ApiError } from '../_shared/contracts.ts'

const AUTO_APPROVAL_THRESHOLD = 0.9
const AUTO_APPROVAL_XP = 75

function normalizeVerdict(
  confidenceScore: number,
  requestedVerdict?: AiVerificationRequest['verdict'],
): AiVerificationResponse['verdict'] {
  if (confidenceScore > AUTO_APPROVAL_THRESHOLD) return 'approved'
  return requestedVerdict || 'needs_review'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const method = req.method
  const path = url.pathname.replace('/functions/v1/ai-verification-receiver', '')

  try {
    if (method === 'POST' && path === '/verify') {
      // Authenticate via AI Service Key
      const aiKey = req.headers.get('X-AI-SERVICE-KEY')
      if (aiKey !== Deno.env.get('AI_SERVICE_KEY')) {
        return new Response(
          JSON.stringify({ error: 'Invalid or missing AI Service Key', code: 'UNAUTHORIZED' } satisfies ApiError),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const body = await req.json() as AiVerificationRequest
      const { submission_id, confidence_score, verdict, ai_reasoning } = body

      if (!submission_id || typeof confidence_score !== 'number' || !ai_reasoning) {
        return new Response(
          JSON.stringify({ error: 'Missing submission_id, confidence_score, or ai_reasoning', code: 'BAD_REQUEST' } satisfies ApiError),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const finalVerdict = normalizeVerdict(confidence_score, verdict)
      const autoApproved = confidence_score > AUTO_APPROVAL_THRESHOLD

      const { data: submission, error: updateError } = await supabaseAdmin
        .from('mission_submissions')
        .update({
          confidence_score,
          verification_status: finalVerdict,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submission_id)
        .select('id, user_id, mission_id')
        .single()

      if (updateError) throw updateError

      let rewardAwarded = 0

      if (autoApproved && finalVerdict === 'approved') {
        rewardAwarded = AUTO_APPROVAL_XP

        await supabaseAdmin.from('xp_transactions').insert({
          user_id: submission.user_id,
          amount: rewardAwarded,
          reason: 'mission_auto_approved_by_ai',
          mission_id: submission.mission_id,
        })

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('xp')
          .eq('id', submission.user_id)
          .single()

        if (profile) {
          const newXp = (profile.xp || 0) + rewardAwarded
          await supabaseAdmin
            .from('profiles')
            .update({ xp: newXp, level: Math.floor(newXp / 100) + 1, updated_at: new Date().toISOString() })
            .eq('id', submission.user_id)
        }
      }

      return new Response(
        JSON.stringify({
          submission_id,
          confidence_score,
          verdict: finalVerdict,
          auto_approved: autoApproved,
          reward_awarded: rewardAwarded,
        } satisfies AiVerificationResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' } satisfies ApiError),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('ai-verification-receiver error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR', details: err.message } satisfies ApiError),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
