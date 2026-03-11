const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: SUPABASE_URL or SUPABASE_ANON_KEY not found in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Consultando Supabase:', supabaseUrl);
    try {
        const { count, error } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('Error de Supabase:', error);
        } else {
            console.log('Cantidad de productos en la tabla "products":', count);
        }
    } catch (e) {
        console.error('Error catastrófico:', e.message);
    }
}

check();
