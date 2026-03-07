const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('--- Diagnóstico de Migración ---');
    console.log('URL de Destino:', supabaseUrl);

    // 1. Verificar si la tabla 'products' es visible para SELECT
    console.log('\nPrueba de visibilidad (SELECT):');
    const { data: selectData, error: selectError } = await supabase.from('products').select('*').limit(1);

    if (selectError) {
        console.error('  - FALLO SELECT en "products":', selectError.message);
        console.log('  - Probando con "productos" (español)...');
        const { data: esData, error: esError } = await supabase.from('productos').select('*').limit(1);
        if (esError) {
            console.error('  - FALLO SELECT en "productos":', esError.message);
        } else {
            console.log('  - ¡ÉXITO! La tabla se llama "productos" (español).');
            return; // Detener para informar
        }
    } else {
        console.log('  - ¡ÉXITO! La tabla "products" es visible.');
    }

    // 2. Cargar datos
    const catalogPath = path.join(__dirname, 'data', 'catalog.json');
    if (!fs.existsSync(catalogPath)) return console.error('No se encontró catalog.json');
    const products = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

    // 3. Limpiar datos para que coincidan con el esquema
    const preparedProducts = products.map(p => {
        const clean = {
            id: p.id,
            nombre: p.nombre,
            precio: p.precio,
            categoria: p.categoria,
            disponible: p.disponible !== false,
            img: p.img,
            active: p.active !== false,
            created_at: p.created_at || new Date().toISOString()
        };
        return clean;
    });

    console.log(`\nIntentando UPSERT de ${preparedProducts.length} productos...`);
    const { error: upsertError } = await supabase.from('products').upsert(preparedProducts);

    if (upsertError) {
        console.error('  - ERROR UPSERT:', upsertError.message);
    } else {
        console.log('  - ¡ÉXITO! Los productos han sido migrados.');
    }
}

migrate();
