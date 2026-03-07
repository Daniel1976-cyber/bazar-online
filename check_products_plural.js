const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
    console.log(`Revisando tabla "products" (plural):`);
    const { data, error } = await supabase.from('products').select('*').limit(1);
    if (error) {
        console.error(`  - Error: ${error.message}`);
    } else if (data) {
        console.log(`  - ¡ÉXITO! Tabla "products" encontrada.`);
        if (data.length > 0) {
            console.log(`  - Columnas: ${Object.keys(data[0]).join(', ')}`);
        } else {
            console.log('  - Tabla vacía.');
        }
    }
}

checkProducts();
