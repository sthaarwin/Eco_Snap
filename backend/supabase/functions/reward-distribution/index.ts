// EcoSnap Reward Distribution Edge Function
// User 2: Systems Engineer (Backend & Data)
// Handles XP calculation, level progression, and reward logic.

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'
import { corsHeaders, requireUser, supabaseAdmin } from '../_shared/supabase.ts'
import { XpTransactionResponse, ApiError } from '../_shared/contracts.ts'

const XP_BASE_SUBMISSION = 50
const XP_BONUS_VERIFIED = 25
const XP_LEVEL_MULTIPLIER = 100

function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_LEVEL_MULTIPLIER) + 1
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const method = req.method
  const path = url.pathname.replace('/reward-distribution', '')

  try {
    // POST /reward - Award XP for a submission
    if (method === 'POST' && path === '/reward') {
      const auth = await requireUser(req)
      if (auth.response) return auth.response

      const { data: requesterProfile, error: requesterError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .single()

      if (requesterError || requesterProfile?.role !== 'council') {
        return new Response(
          JSON.stringify({ error: 'Only council members can award rewards directly', code: 'FORBIDDEN' } satisfies ApiError),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json()
      const { user_id, mission_id, reason, base_xp } = body

      const xpAmount = (base_xp || XP_BASE_SUBMISSION) + XP_BONUS_VERIFIED

      const { data: tx, error: txError } = await supabaseAdmin
        .from('xp_transactions')
        .insert({
          user_id,
          amount: xpAmount,
          reason: reason || 'mission_completed',
          mission_id,
        })
        .select()
        .single()

      if (txError) throw txError

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('xp, level')
        .eq('id', user_id)
        .single()

      if (profile) {
        const newXp = (profile.xp || 0) + xpAmount
        const newLevel = calculateLevel(newXp)

        await supabaseAdmin
          .from('profiles')
          .update({ xp: newXp, level: newLevel, updated_at: new Date().toISOString() })
          .eq('id', user_id)
      }

      return new Response(
        JSON.stringify({
          transaction: tx as XpTransactionResponse,
          xp_awarded: xpAmount,
          new_total_xp: (profile?.xp || 0) + xpAmount,
          new_level: calculateLevel((profile?.xp || 0) + xpAmount),
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /xp/:user_id - Get XP history for a user
    if (method === 'GET' && path.startsWith('/xp/')) {
      const userId = path.split('/')[2]
      const page = parseInt(url.searchParams.get('page') || '1')
      const pageSize = parseInt(url.searchParams.get('page_size') || '20')

      const auth = await requireUser(req)
      if (auth.response) return auth.response

      if (auth.user.id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Users can only read their own XP history', code: 'FORBIDDEN' } satisfies ApiError),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error, count } = await supabaseAdmin
        .from('xp_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (error) throw error

      return new Response(
        JSON.stringify({
          data: data as XpTransactionResponse[],
          total: count,
          page,
          page_size: pageSize,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /leaderboard - Get top users by XP
    if (method === 'GET' && path === '/leaderboard') {
      const limit = parseInt(url.searchParams.get('limit') || '50')

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, username, avatar_url, xp, level, role')
        .order('xp', { ascending: false })
        .limit(limit)

      if (error) throw error

      return new Response(
        JSON.stringify({ data, limit }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' } satisfies ApiError),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('reward-distribution error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR', details: err.message } satisfies ApiError),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
