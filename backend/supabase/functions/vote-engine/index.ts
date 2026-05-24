import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'
import { corsHeaders, createUserClient, requireUser, supabaseAdmin } from '../_shared/supabase.ts'
import { VoteRequest, VoteResponse, ApiError } from '../_shared/contracts.ts'

const VOTE_THRESHOLD = 5
const APPROVAL_RATIO = 0.6

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createUserClient(req)
  const url = new URL(req.url)
  const method = req.method
  const pathname = url.pathname

  try {
    // POST /vote - Cast a vote
    if (method === 'POST' && pathname.endsWith('/vote')) {
      const auth = await requireUser(req)
      if (auth.response) return auth.response

      const body = await req.json() as VoteRequest
      const { submission_id, vote } = body

      if (!submission_id || vote === undefined) {
        return new Response(
          JSON.stringify({ error: 'Missing submission_id or vote', code: 'BAD_REQUEST' } satisfies ApiError),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .single()

      if (profileError || profile?.role !== 'council') {
        return new Response(
          JSON.stringify({ error: 'Only council members can vote', code: 'FORBIDDEN' } satisfies ApiError),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: insertError } = await supabase
        .from('votes')
        .insert({ submission_id, voter_id: auth.user.id, vote })

      if (insertError) {
        if (insertError.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'Already voted', code: 'DUPLICATE_VOTE' } satisfies ApiError),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        throw insertError
      }

      const { data: votes, error: tallyError } = await supabase
        .from('votes')
        .select('vote')
        .eq('submission_id', submission_id)

      if (tallyError) throw tallyError

      const totalVotes = votes.length
      const approvals = votes.filter(v => v.vote).length
      const approvalPct = totalVotes > 0 ? (approvals / totalVotes) * 100 : 0

      let finalStatus = 'pending'
      if (totalVotes >= VOTE_THRESHOLD) {
        finalStatus = approvalPct >= APPROVAL_RATIO * 100 ? 'approved' : 'rejected'

        await supabaseAdmin
          .from('mission_submissions')
          .update({ verification_status: finalStatus, updated_at: new Date().toISOString() })
          .eq('id', submission_id)

        if (finalStatus === 'approved') {
          const { data: submission } = await supabaseAdmin
            .from('mission_submissions')
            .select('user_id, mission_id')
            .eq('id', submission_id)
            .single()

          if (submission) {
            const xpAmount = 75

            await supabaseAdmin.from('xp_transactions').insert({
              user_id: submission.user_id,
              amount: xpAmount,
              reason: 'mission_verified_by_council',
              mission_id: submission.mission_id,
            })

            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('xp')
              .eq('id', submission.user_id)
              .single()

            if (profile) {
              const newXp = (profile.xp || 0) + xpAmount
              await supabaseAdmin
                .from('profiles')
                .update({ xp: newXp, level: Math.floor(newXp / 100) + 1, updated_at: new Date().toISOString() })
                .eq('id', submission.user_id)
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          submission_id,
          total_votes: totalVotes,
          approval_pct: Math.round(approvalPct),
          final_status: finalStatus,
        } satisfies VoteResponse),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /votes/:submission_id - Get tally for a submission
    if (method === 'GET' && pathname.includes('/votes/')) {
      const submissionId = pathname.split('/').pop()

      const { data: votes, error } = await supabase
        .from('votes')
        .select('vote, created_at, voter_id')
        .eq('submission_id', submissionId)

      if (error) throw error

      const totalVotes = votes.length
      const approvals = votes.filter(v => v.vote).length

      return new Response(
        JSON.stringify({
          submission_id: submissionId,
          total_votes: totalVotes,
          approval_pct: totalVotes > 0 ? Math.round((approvals / totalVotes) * 100) : 0,
          votes,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' } satisfies ApiError),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('vote-engine error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR', details: err.message } satisfies ApiError),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
