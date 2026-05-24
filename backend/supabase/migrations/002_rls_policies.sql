-- EcoSnap RLS Policies
-- User 2: Systems Engineer (Backend & Data)
-- Granular policies beyond the basics in migration 001

-- Profiles: insert-only via trigger, no direct insert policy needed
-- Admins/council can update any profile
CREATE POLICY "Council can update any profile"
  ON public.profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'council')
  );

-- Missions
CREATE POLICY "Council can update missions"
  ON public.missions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'council')
  );

CREATE POLICY "Council can delete missions"
  ON public.missions FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'council')
  );

-- Submissions: council can update any (for verification)
CREATE POLICY "Council can moderate submissions"
  ON public.mission_submissions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'council')
  );

-- XP transactions: inserted only by Edge Functions (service_role key)
-- This policy allows service_role inserts while keeping user INSERT restricted
CREATE POLICY "XP transactions are inserted by service"
  ON public.xp_transactions FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Hotspots
CREATE POLICY "Anyone can read hotspots"
  ON public.hotspots FOR SELECT USING (true);

CREATE POLICY "Council can manage hotspots"
  ON public.hotspots FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'council')
  );

CREATE POLICY "Council can update hotspots"
  ON public.hotspots FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'council')
  );
