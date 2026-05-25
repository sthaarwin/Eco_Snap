-- Track last API call timestamps and key rotation for rate-limit cooldowns.
CREATE TABLE IF NOT EXISTS public.api_cooldowns (
  service_name TEXT PRIMARY KEY,
  last_called_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_key_index INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.api_cooldowns ENABLE ROW LEVEL SECURITY;

-- Allow the service role (Edge Functions) to read/write.
CREATE POLICY "service_role can manage api_cooldowns"
  ON public.api_cooldowns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
