-- Submission image storage
-- Creates the public bucket used by submission-engine and locks writes to each user's folder.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Submission images are publicly readable'
  ) THEN
    CREATE POLICY "Submission images are publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'submissions');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload own submission images'
  ) THEN
    CREATE POLICY "Users can upload own submission images"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'submissions'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update own submission images'
  ) THEN
    CREATE POLICY "Users can update own submission images"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'submissions'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own submission images'
  ) THEN
    CREATE POLICY "Users can delete own submission images"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'submissions'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
