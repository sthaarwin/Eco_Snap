-- Add category to hotspots for Digital Twin classification
ALTER TABLE public.hotspots ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'standard'
  CHECK (category IN ('emergency_drainage', 'plastic_drift', 'standard_patrol', 'cafeteria_overflow', 'green_restoration'));

-- Update seed data with categories
UPDATE public.hotspots SET category = 'plastic_drift' WHERE severity >= 4;
UPDATE public.hotspots SET category = 'cafeteria_overflow' WHERE severity = 2;
UPDATE public.hotspots SET category = 'standard_patrol' WHERE severity = 1;
