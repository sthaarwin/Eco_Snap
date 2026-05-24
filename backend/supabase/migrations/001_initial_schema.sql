-- EcoSnap Initial Schema
-- User 2: Systems Engineer (Backend & Data)

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  role TEXT NOT NULL DEFAULT 'scout' CHECK (role IN ('scout', 'warrior', 'council')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Missions table
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  narrative TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'expired')),
  weather_trigger TEXT,
  location_name TEXT,
  created_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mission submissions (user uploads)
CREATE TABLE public.mission_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  confidence_score REAL,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'needs_review')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes (Council of Scouts moderation)
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.mission_submissions(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, voter_id)
);

-- XP transaction log
CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weather logs (from OpenWeatherMap)
CREATE TABLE public.weather_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  temperature REAL,
  condition TEXT,
  wind_speed REAL,
  humidity REAL,
  location_name TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hotspots (for Digital Twin heatmap)
CREATE TABLE public.hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinates JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  severity INTEGER NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_xp ON public.profiles(xp DESC);
CREATE INDEX idx_missions_status ON public.missions(status);
CREATE INDEX idx_missions_priority ON public.missions(priority DESC);
CREATE INDEX idx_missions_coordinates ON public.missions USING GIN(coordinates);
CREATE INDEX idx_submissions_mission ON public.mission_submissions(mission_id);
CREATE INDEX idx_submissions_user ON public.mission_submissions(user_id);
CREATE INDEX idx_submissions_status ON public.mission_submissions(verification_status);
CREATE INDEX idx_votes_submission ON public.votes(submission_id);
CREATE INDEX idx_xp_user ON public.xp_transactions(user_id);
CREATE INDEX idx_hotspots_status ON public.hotspots(status);
CREATE INDEX idx_weather_created ON public.weather_logs(created_at DESC);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotspots ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update only their own
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Missions: readable by all authenticated users
CREATE POLICY "Missions are readable by authenticated users"
  ON public.missions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Council can insert missions"
  ON public.missions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'council')
  );

-- Submissions: users can CRUD their own submissions
CREATE POLICY "Users can insert own submissions"
  ON public.mission_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read all submissions"
  ON public.mission_submissions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own submissions"
  ON public.mission_submissions FOR UPDATE USING (auth.uid() = user_id);

-- Votes: council members only
CREATE POLICY "Council can vote"
  ON public.votes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'council')
  );

CREATE POLICY "Votes are publicly readable"
  ON public.votes FOR SELECT USING (auth.role() = 'authenticated');

-- XP: users can read own transactions
CREATE POLICY "Users can read own XP"
  ON public.xp_transactions FOR SELECT USING (auth.uid() = user_id);

-- Weather logs: publicly readable
CREATE POLICY "Weather logs are publicly readable"
  ON public.weather_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Hotspots: publicly readable
CREATE POLICY "Hotspots are publicly readable"
  ON public.hotspots FOR SELECT USING (auth.role() = 'authenticated');

-- Triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --- Storage Configuration ---
-- Create the submissions bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Setup Storage RLS Policies
CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT
  USING (bucket_id = 'submissions');

CREATE POLICY "Anyone can upload an avatar."
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'submissions');
  
CREATE POLICY "Anyone can update their own avatar."
  ON storage.objects FOR UPDATE
  WITH CHECK (bucket_id = 'submissions');

-- Enable Realtime
begin;
  -- remove the supabase_realtime publication
  DROP PUBLICATION IF EXISTS supabase_realtime;
  -- re-create the supabase_realtime publication with no tables
  CREATE PUBLICATION supabase_realtime;
commit;

-- add tables to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.mission_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
