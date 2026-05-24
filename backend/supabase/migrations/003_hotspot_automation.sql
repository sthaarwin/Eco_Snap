-- Hotspot Automation
-- User 2: Systems Engineer (Backend & Data)
-- Automatically resolve hotspots when a mission submission is approved.

CREATE OR REPLACE FUNCTION public.handle_mission_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'approved'
  IF (NEW.verification_status = 'approved' AND (OLD.verification_status IS NULL OR OLD.verification_status <> 'approved')) THEN

    -- Resolve the associated hotspot
    UPDATE public.hotspots
    SET
      status = 'resolved',
      resolved_at = NOW(),
      resolved_by = NEW.user_id
    WHERE mission_id = NEW.mission_id
      AND status = 'active';

    -- Optionally: mark the mission as completed if it's the first approved submission
    UPDATE public.missions
    SET status = 'completed', updated_at = NOW()
    WHERE id = NEW.mission_id
      AND status IN ('active', 'in_progress');

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_submission_approved
  AFTER UPDATE ON public.mission_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_mission_approval();
