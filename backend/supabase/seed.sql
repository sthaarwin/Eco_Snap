-- EcoSnap Seed Data
-- User 2: Systems Engineer (Backend & Data)

-- Sample hotspots for Digital Twin heatmap
INSERT INTO public.hotspots (coordinates, status, severity) VALUES
  ('{"lat": 28.7041, "lng": 77.1025}', 'active', 4),
  ('{"lat": 28.7045, "lng": 77.1030}', 'active', 2),
  ('{"lat": 28.7038, "lng": 77.1020}', 'resolved', 1);

-- Sample missions
INSERT INTO public.missions (title, narrative, coordinates, priority, status, location_name) VALUES
  (
    'Plastic Surge in Block C',
    'EMERGENCY: Plastic Surge detected in Block C. The drainage systems are at risk. We need a Level 3 Recovery Team to neutralize the area.',
    '{"lat": 28.7041, "lng": 77.1025}',
    5,
    'active',
    'Block C'
  ),
  (
    'Cafeteria Overflow Watch',
    'Lunch hour waste spike anticipated near the main cafeteria. Proactive sweep needed to prevent overflow into green zones.',
    '{"lat": 28.7045, "lng": 77.1030}',
    3,
    'active',
    'Main Cafeteria'
  ),
  (
    'Library Zone Patrol',
    'Routine patrol requested for the library east wing. Low priority, but sustained neglect could escalate.',
    '{"lat": 28.7038, "lng": 77.1020}',
    1,
    'active',
    'Library East Wing'
  );
