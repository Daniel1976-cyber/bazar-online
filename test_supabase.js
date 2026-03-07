const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Cargar .env manualmente para asegurar que usamos los valores del archivo
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));
const supabaseUrl = envConfig.SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
    console.log('Probando conexión a Supabase...');
    console.log('URL:', supabaseUrl);

    // 1. Probar listado de tablas (para ver si la conexión base funciona)
    const { data: products, error: pError } = await supabase.from('products').select('id').limit(1);
    if (pError) {
        console.error('Error al leer tabla products:', pError.message);
    } else {
        console.log('Conexión a base de datos OK. Productos encontrados:', products.length);
    }

    // 2. Probar Storage
    console.log('\nRevisando Storage...');
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();

    if (bError) {
        console.error('Error al listar buckets:', bError.message);
    } else {
        console.log('Buckets encontrados:', buckets.map(b => b.name).join(', '));
        const bucketName = process.env.SUPABASE_BUCKET || 'product-images';
        const exists = buckets.find(b => b.name === bucketName);
        if (exists) {
            console.log(`El bucket "${bucketName}" existe.`);
            console.log(`¿Es público?: ${exists.public}`);
        } else {
            console.log(`EL BUCKET "${bucketName}" NO EXISTE.`);
        }
    }
}

testSupabase();
