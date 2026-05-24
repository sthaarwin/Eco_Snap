// EcoSnap Weather Ingestion Edge Function
// Allows User 3's weather service to persist weather observations for mission logic.

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'
import { corsHeaders, requireUser, supabaseAdmin } from '../_shared/supabase.ts'
import { ApiError, WeatherIngestionRequest, WeatherLogResponse } from '../_shared/contracts.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const method = req.method
  const path = url.pathname.replace('/functions/v1/weather-ingestion', '')

  try {
    if (method === 'POST' && path === '/weather') {
      // Authenticate via AI Service Key
      const aiKey = req.headers.get('X-AI-SERVICE-KEY')
      if (aiKey !== Deno.env.get('AI_SERVICE_KEY')) {
        return new Response(
          JSON.stringify({ error: 'Invalid or missing AI Service Key', code: 'UNAUTHORIZED' } satisfies ApiError),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const body = await req.json() as WeatherIngestionRequest
      const { temperature, condition, wind_speed, humidity, location_name, raw_response } = body

      if (
        typeof temperature !== 'number' ||
        !condition ||
        typeof wind_speed !== 'number' ||
        typeof humidity !== 'number' ||
        !location_name
      ) {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid weather fields', code: 'BAD_REQUEST' } satisfies ApiError),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const { data, error } = await supabaseAdmin
        .from('weather_logs')
        .insert({
          temperature,
          condition,
          wind_speed,
          humidity,
          location_name,
          raw_response: raw_response || null,
        })
        .select('id, temperature, condition, wind_speed, humidity, location_name, created_at')
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify(data as WeatherLogResponse),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' } satisfies ApiError),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('weather-ingestion error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR', details: err.message } satisfies ApiError),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
