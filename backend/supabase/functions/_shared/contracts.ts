// EcoSnap API Contracts
// User 2: Systems Engineer (Backend & Data)
// These types define the contract between frontend and backend.

export interface MissionResponse {
  id: string;
  narrative: string;
  title: string;
  coordinates: { lat: number; lng: number };
  priority: number;
  status: 'active' | 'in_progress' | 'completed' | 'expired';
  location_name: string | null;
  weather_trigger: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface SubmissionRequest {
  mission_id: string;
  image_base64: string;
  latitude: number;
  longitude: number;
}

export interface SubmissionResponse {
  id: string;
  mission_id: string;
  user_id: string;
  image_url: string;
  confidence_score: number | null;
  verification_status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  created_at: string;
}

export interface VerificationResult {
  submission_id: string;
  confidence_score: number;
  verdict: 'approved' | 'rejected' | 'needs_review';
  ai_reasoning: string;
}

export interface AiVerificationRequest {
  submission_id: string;
  confidence_score: number;
  verdict?: 'approved' | 'rejected' | 'needs_review';
  ai_reasoning: string;
}

export interface AiVerificationResponse {
  submission_id: string;
  confidence_score: number;
  verdict: 'approved' | 'rejected' | 'needs_review';
  auto_approved: boolean;
  reward_awarded: number;
}

export interface VoteRequest {
  submission_id: string;
  vote: boolean;
}

export interface VoteResponse {
  submission_id: string;
  total_votes: number;
  approval_pct: number;
  final_status: 'approved' | 'rejected' | 'pending';
}

export interface ProfileResponse {
  id: string;
  username: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  role: 'scout' | 'warrior' | 'council';
  created_at: string;
}

export interface XpTransactionResponse {
  id: string;
  amount: number;
  reason: string;
  mission_id: string | null;
  created_at: string;
}

export interface HotspotResponse {
  id: string;
  coordinates: { lat: number; lng: number };
  status: 'active' | 'resolved';
  severity: number;
  mission_id: string | null;
  created_at: string;
}

export interface WeatherLogResponse {
  id: string;
  temperature: number;
  condition: string;
  wind_speed: number;
  humidity: number;
  location_name: string;
  created_at: string;
}

export interface WeatherIngestionRequest {
  temperature: number;
  condition: string;
  wind_speed: number;
  humidity: number;
  location_name: string;
  raw_response?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}
