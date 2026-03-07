const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('--- Iniciando Subida de Datos Locales a Supabase ---');

    const catalogPath = path.join(__dirname, 'data', 'catalog.json');
    if (!fs.existsSync(catalogPath)) {
        console.error('No se encontró catalog.json');
        return;
    }

    const products = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    console.log(`Leídos ${products.length} productos locales.`);

    // Asegurar que todos tengan created_at si no lo tienen
    const preparedProducts = products.map(p => ({
        ...p,
        created_at: p.created_at || new Date().toISOString()
    }));

    console.log('Subiendo a la tabla "products"...');
    const { data, error } = await supabase
        .from('products')
        .upsert(preparedProducts, { onConflict: 'id' });

    if (error) {
        console.error('Error al subir productos:', error.message);
        if (error.message.includes('not found')) {
            console.error('ADVERTENCIA: ¿Seguro que la tabla se llama "products" (con S al final)?');
        }
    } else {
        console.log('¡ÉXITO! Los productos están ahora en la nube.');
    }
}

migrate();
