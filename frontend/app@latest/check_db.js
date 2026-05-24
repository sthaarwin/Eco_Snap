const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://omrqdxvgkxqikkorsnwx.supabase.co';
const supabaseAnonKey = 'sb_publishable_OlDs3YwmCSny0vNv8-R7hA_inkrofrH';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('hotspots').select('*').limit(2);
  console.log('hotspots:', data, error);
  
  const { data: d2, error: e2 } = await supabase.from('missions').select('*').limit(2);
  console.log('missions:', d2, e2);
}
check();
