import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'
import { corsHeaders, createUserClient, requireUser, supabaseAdmin } from '../_shared/supabase.ts'
import { SubmissionRequest, SubmissionResponse, ApiError } from '../_shared/contracts.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createUserClient(req)
  const url = new URL(req.url)
  const method = req.method
  const pathname = url.pathname

  try {
    // POST /submit - Upload image and create submission
    if (method === 'POST' && pathname.endsWith('/submit')) {
      const auth = await requireUser(req)
      if (auth.response) return auth.response

      const body = await req.json() as SubmissionRequest
      const { mission_id, image_base64 } = body

      if (!mission_id || !image_base64) {
        return new Response(
          JSON.stringify({ error: 'Missing mission_id or image_base64', code: 'BAD_REQUEST' } satisfies ApiError),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const base64Data = image_base64.split(',')[1] || image_base64
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      const filePath = `${auth.user.id}/${mission_id}/${crypto.randomUUID()}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, binaryData, { contentType: 'image/jpeg', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(filePath)

      const { data: submission, error: dbError } = await supabase
        .from('mission_submissions')
        .insert({
          mission_id,
          user_id: auth.user.id,
          image_url: publicUrl,
          verification_status: 'pending',
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Trigger AI verification and wait for result so client can show final status immediately.
      const aiEngineUrl = `${Deno.env.get('SUPABASE_URL')!}/functions/v1/ai-engine/verify-image`
      const aiResponse = await fetch(aiEngineUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submission.id }),
      }).catch((err) => {
        console.error('ai-engine trigger failed:', err)
        return null
      })

      let auto_approved = false
      let reward_awarded = 0
      let ai_reasoning: string | undefined
      let confidence_score: number | undefined

      if (aiResponse?.ok) {
        const aiResult = await aiResponse.json() as {
          auto_approved?: boolean
          reward_awarded?: number
          verdict?: SubmissionResponse['verification_status']
          ai_reasoning?: string
          confidence_score?: number
        }

        auto_approved = Boolean(aiResult.auto_approved)
        reward_awarded = aiResult.reward_awarded ?? 0
        ai_reasoning = aiResult.ai_reasoning
        confidence_score = aiResult.confidence_score
      } else if (aiResponse) {
        console.error('ai-engine verification failed:', aiResponse.status, await aiResponse.text())
      }

      // Re-fetch the finalized submission so we return the DB-persisted verification_status
      const { data: finalizedSubmission } = await supabase
        .from('mission_submissions')
        .select('*')
        .eq('id', submission.id)
        .single()

      return new Response(
        JSON.stringify({
          ...(finalizedSubmission ?? submission),
          confidence_score: confidence_score ?? finalizedSubmission?.confidence_score,
          verification_status: finalizedSubmission?.verification_status ?? submission.verification_status,
          ai_reasoning,
          auto_approved,
          reward_awarded,
        } satisfies SubmissionResponse & { auto_approved: boolean; reward_awarded: number; ai_reasoning?: string }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /submissions - List submissions (filter by mission_id or user_id)
    if (method === 'GET' && pathname.endsWith('/submissions')) {
      const missionId = url.searchParams.get('mission_id')
      const userId = url.searchParams.get('user_id')
      const status = url.searchParams.get('status')
      const page = parseInt(url.searchParams.get('page') || '1')
      const pageSize = parseInt(url.searchParams.get('page_size') || '20')

      let query = supabase
        .from('mission_submissions')
        .select('*', { count: 'exact' })

      if (missionId) query = query.eq('mission_id', missionId)
      if (userId) query = query.eq('user_id', userId)
      if (status) query = query.eq('verification_status', status)

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (error) throw error

      return new Response(
        JSON.stringify({ data: data as SubmissionResponse[], total: count, page, page_size: pageSize }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /verify - Manual AI verification trigger (for User 3 integration)
    if (method === 'POST' && pathname.endsWith('/verify')) {
      const auth = await requireUser(req)
      if (auth.response) return auth.response

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .single()

      if (profileError || profile?.role !== 'council') {
        return new Response(
          JSON.stringify({ error: 'Only council members can verify submissions manually', code: 'FORBIDDEN' } satisfies ApiError),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json()
      const { submission_id, confidence_score, verdict, ai_reasoning } = body

      const { data, error } = await supabaseAdmin
        .from('mission_submissions')
        .update({
          confidence_score,
          verification_status: verdict,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submission_id)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({
          submission_id: data.id,
          confidence_score: data.confidence_score,
          verdict: data.verification_status,
          ai_reasoning,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' } satisfies ApiError),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('submission-engine error:', err)
    const details = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR', details } satisfies ApiError),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
