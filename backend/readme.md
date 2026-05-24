# EcoSnap Backend

Supabase backend for the User 2 scope: schema, RLS, storage, realtime, and Edge Functions.

## Environment

Create a local `.env` from the root `.env.example` and set:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_PUBLISHABLE_KEY` is kept for frontend clients that use Supabase's newer publishable key naming. Edge Functions currently read `SUPABASE_ANON_KEY`.

## Migrations

Run migrations from `backend/supabase`:

```sh
supabase db reset
```

The migrations create:

- Core tables: `profiles`, `missions`, `mission_submissions`, `votes`, `xp_transactions`, `weather_logs`, `hotspots`
- RLS policies for authenticated user access and council-only moderation
- Realtime publication entries for profiles, missions, submissions, and hotspots
- Public `submissions` storage bucket with authenticated user-folder write policies

## Edge Functions

Canonical deployed functions:

- `mission-engine`
- `submission-engine`
- `vote-engine`
- `reward-distribution`
- `ai-verification-receiver`
- `weather-ingestion`

Deploy from `backend/supabase`:

```sh
supabase functions deploy mission-engine
supabase functions deploy submission-engine
supabase functions deploy vote-engine
supabase functions deploy reward-distribution
supabase functions deploy ai-verification-receiver
supabase functions deploy weather-ingestion
```

All normal user-scoped database and storage operations use the request JWT so RLS applies. Admin-only updates, such as final vote status and XP awards, use the service role inside Edge Functions after explicit role checks.

## Contract Notes

- `POST /functions/v1/submission-engine/submit` expects JSON matching `submission_request`: `mission_id`, `image_base64`, `latitude`, `longitude`.
- `POST /functions/v1/vote-engine/vote` derives `voter_id` from the authenticated user. Do not send `voter_id` from the frontend.
- Manual `POST /functions/v1/submission-engine/verify` is council-only until User 3's AI verification service is wired in.
- `POST /functions/v1/ai-verification-receiver/verify` accepts AI verification results. Scores greater than `0.9` auto-approve and award XP.
- `POST /functions/v1/weather-ingestion/weather` stores weather observations for later automated mission triggers.
- `POST /functions/v1/mission-engine/missions` now creates an active hotspot linked to the new mission.

## Smoke Tests

Use `backend/api.http` with a REST client after setting `SUPABASE_URL` and `SUPABASE_USER_JWT` in `.env`.
