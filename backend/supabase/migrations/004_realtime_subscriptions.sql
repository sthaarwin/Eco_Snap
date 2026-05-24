-- EcoSnap Realtime Subscriptions
-- User 2: Systems Engineer (Backend & Data)
-- Enables Realtime for live heatmap and mission updates (Phase 3)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'hotspots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hotspots;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'missions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.missions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mission_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mission_submissions;
  END IF;
END $$;

-- Optional: set replica identity to full for complete old/new row data
ALTER TABLE public.hotspots REPLICA IDENTITY FULL;
ALTER TABLE public.missions REPLICA IDENTITY FULL;
ALTER TABLE public.mission_submissions REPLICA IDENTITY FULL;
