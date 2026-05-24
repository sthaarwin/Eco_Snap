import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

export const SUPABASE_URL = 'https://omrqdxvgkxqikkorsnwx.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_OlDs3YwmCSny0vNv8-R7hA_inkrofrH';

// Custom storage wrapper for Expo SecureStore to match Supabase's storage interface
const secureStore = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

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
