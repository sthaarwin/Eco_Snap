#!/bin/bash
# EcoSnap - Deploy script
# Run: bash deploy.sh
# Make sure .env file exists with all secrets

cd "$(dirname "$0")/backend/supabase"

echo "=== Setting secrets from .env ==="
npx supabase secrets set --env-file ../../.env

echo "=== Deploying all edge functions ==="
npx supabase functions deploy ai-engine weather-fetcher mission-engine submission-engine vote-engine reward-distribution ai-verification-receiver weather-ingestion

echo "=== Done ==="
