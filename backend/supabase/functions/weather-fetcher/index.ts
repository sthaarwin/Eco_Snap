import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'
import { corsHeaders } from '../_shared/supabase.ts'
import { ApiError } from '../_shared/contracts.ts'

const OWM_API_KEY = Deno.env.get('OPENWEATHERMAP_API_KEY') || ''
const AI_SERVICE_KEY = Deno.env.get('AI_SERVICE_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const OWM_BASE_URL = 'https://api.openweathermap.org/data/2.5'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const method = req.method
  const path = url.pathname.replace('/weather-fetcher', '')

  try {
    if (method === 'POST' && path === '/fetch') {
      return await handleFetch(req, url)
    }

    return new Response(
      JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' } satisfies ApiError),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('weather-fetcher error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR', details: err.message } satisfies ApiError),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

async function handleFetch(req: Request, url: URL): Promise<Response> {
  if (!OWM_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OpenWeatherMap API key not configured', code: 'CONFIG_ERROR' } satisfies ApiError),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const body = await req.json().catch(() => ({})) as {
    lat?: number
    lng?: number
    location_name?: string
  }

  const lat = body.lat ?? parseFloat(url.searchParams.get('lat') || '28.7041')
  const lng = body.lng ?? parseFloat(url.searchParams.get('lng') || '77.1025')
  const locationName = body.location_name || url.searchParams.get('location_name') || 'Campus Block C'

  const owmUrl = `${OWM_BASE_URL}/weather?lat=${lat}&lon=${lng}&appid=${OWM_API_KEY}&units=metric`
  const owmRes = await fetch(owmUrl)

  if (!owmRes.ok) {
    const errText = await owmRes.text()
    console.error('OpenWeatherMap API error:', owmRes.status, errText)
    return new Response(
      JSON.stringify({ error: 'OpenWeatherMap request failed', code: 'OWM_ERROR', details: errText } satisfies ApiError),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const owmData = await owmRes.json()

  const weatherPayload = {
    temperature: owmData.main?.temp ?? 0,
    condition: owmData.weather?.[0]?.main ?? 'Unknown',
    wind_speed: owmData.wind?.speed ?? 0,
    humidity: owmData.main?.humidity ?? 0,
    location_name: locationName,
    raw_response: owmData,
  }

  const ingestionUrl = `${SUPABASE_URL}/functions/v1/weather-ingestion/weather`
  const ingestionRes = await fetch(ingestionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AI-SERVICE-KEY': AI_SERVICE_KEY,
    },
    body: JSON.stringify(weatherPayload),
  })

  if (!ingestionRes.ok) {
    const errBody = await ingestionRes.text()
    console.error('weather-ingestion error:', ingestionRes.status, errBody)
    return new Response(
      JSON.stringify({ error: 'Weather ingestion failed', code: 'INGESTION_ERROR', details: errBody } satisfies ApiError),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const stored = await ingestionRes.json()

  return new Response(
    JSON.stringify({
      fetched: {
        temperature: weatherPayload.temperature,
        condition: weatherPayload.condition,
        wind_speed: weatherPayload.wind_speed,
        humidity: weatherPayload.humidity,
        location_name: weatherPayload.location_name,
      },
      stored,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}
