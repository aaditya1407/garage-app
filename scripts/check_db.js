const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

async function check() {
  const { data: garages, error: gError } = await supabase.from('garages').select('*').limit(2);
  console.log('garages samples:', garages || gError);
}
check();
