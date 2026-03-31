require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) {
    console.error('Error fetching one row:', error);
    return;
  }
  if (!data || data.length === 0) {
    console.log('Table is empty.');
    return;
  }
  console.log('Columns found in REAL Supabase table:');
  console.log(Object.keys(data[0]).join(', '));
  console.log('Sample data:', JSON.stringify(data[0], null, 2));
}

check();
