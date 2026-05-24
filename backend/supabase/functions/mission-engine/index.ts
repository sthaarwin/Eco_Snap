// EcoSnap Mission Engine Edge Function
// User 2: Systems Engineer (Backend & Data)
// Handles mission creation, active mission listing, and AI narrative trigger coordination.

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'
import { corsHeaders, createUserClient, requireUser, supabaseAdmin } from '../_shared/supabase.ts'
import { MissionResponse, ApiError } from '../_shared/contracts.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createUserClient(req)
  const url = new URL(req.url)
  const method = req.method
  const path = url.pathname.replace('/mission-engine', '')

  try {
    // GET /missions - List active missions
    if (method === 'GET' && path === '/missions') {
      const status = url.searchParams.get('status') || 'active'
      const page = parseInt(url.searchParams.get('page') || '1')
      const pageSize = parseInt(url.searchParams.get('page_size') || '20')

      const { data, error, count } = await supabase
        .from('missions')
        .select('*', { count: 'exact' })
        .eq('status', status)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (error) throw error

      return new Response(
        JSON.stringify({ data: data as MissionResponse[], total: count, page, page_size: pageSize }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /missions/:id - Get single mission
    if (method === 'GET' && path.startsWith('/missions/')) {
      const missionId = path.split('/')[2]

      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single()

      if (error) throw error
      if (!data) {
        return new Response(
          JSON.stringify({ error: 'Mission not found', code: 'NOT_FOUND' } satisfies ApiError),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data as MissionResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /missions - Create mission (from AI narrative trigger)
    if (method === 'POST' && path === '/missions') {
      const auth = await requireUser(req)
      if (auth.response) return auth.response

      const body = await req.json()

      const { data, error } = await supabase
        .from('missions')
        .insert({
          title: body.title,
          narrative: body.narrative,
          coordinates: body.coordinates,
          priority: body.priority || 1,
          location_name: body.location_name,
          weather_trigger: body.weather_trigger,
          expires_at: body.expires_at,
          created_by: auth.user.id,
        })
        .select()
        .single()

      if (error) throw error

      const { error: hotspotError } = await supabaseAdmin
        .from('hotspots')
        .insert({
          coordinates: data.coordinates,
          status: 'active',
          severity: data.priority,
          mission_id: data.id,
        })

      if (hotspotError) throw hotspotError

      return new Response(
        JSON.stringify(data as MissionResponse),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH /missions/:id - Update mission status
    if (method === 'PATCH' && path.startsWith('/missions/')) {
      const missionId = path.split('/')[2]
      const body = await req.json()

      const { data, error } = await supabase
        .from('missions')
        .update({ status: body.status, updated_at: new Date().toISOString() })
        .eq('id', missionId)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify(data as MissionResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' } satisfies ApiError),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('mission-engine error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR', details: err.message } satisfies ApiError),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
