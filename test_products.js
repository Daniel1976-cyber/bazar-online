const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testProducts() {
    console.log('Probando tabla "products"...');
    const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('Error en "products":', error.message);
    } else {
        console.log('¡ÉXITO! La tabla "products" existe.');
    }
}

testProducts();
