const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jboqbhpbyamtphupkwzd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impib3FiaHBieWFtdHBodXBrd3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzQ5NzYsImV4cCI6MjA5MDI1MDk3Nn0.odEGNkLEM4TL_uam0Gp7RNFI0yvVcVemdmNTmMrD544'
);

async function check() {
  const { data: garages, error: gError } = await supabase.from('garages').select('*').limit(2);
  console.log('garages samples:', garages || gError);
}
check();
