const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
    console.log('Probando conexión a Supabase...');
    console.log('URL:', supabaseUrl);

    // 1. Probar listado de tablas
    console.log('\n--- TABLAS ---');
    // Intentamos consulta directa
    const { data: schemaTables, error: sError } = await supabase.from('products').select('*').limit(1);
    if (sError) {
        console.error('Error al acceder a "products":', sError.message);
    } else {
        console.log('¡Tabla "products" encontrada y accesible!');
    }

    // 2. Probar Storage
    console.log('\n--- STORAGE ---');
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();

    if (bError) {
        console.error('Error al listar buckets:', bError.message);
    } else {
        console.log('Buckets totales encontrados:', buckets.length);
        buckets.forEach(b => {
            console.log(`- Nombre: "${b.name}", Público: ${b.public}`);
        });

        const bucketName = process.env.SUPABASE_BUCKET || 'product-images';
        const exists = buckets.find(b => b.name === bucketName);
        if (exists) {
            console.log(`\nConfirmado: El bucket "${bucketName}" existe.`);
        } else {
            console.log(`\nADVERTENCIA: El bucket "${bucketName}" NO aparece en la lista.`);
        }
    }
}

testSupabase();
