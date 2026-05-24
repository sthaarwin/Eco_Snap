import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://omrqdxvgkxqikkorsnwx.supabase.co';
const supabaseAnonKey = 'sb_publishable_OlDs3YwmCSny0vNv8-R7hA_inkrofrH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  username: string;
  avatar_url?: string;
  xp: number;
  level: number;
  role: 'scout' | 'warrior' | 'council';
  created_at: string;
  updated_at: string;
};
