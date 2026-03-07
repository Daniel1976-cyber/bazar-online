const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
    console.log('Intentando subir archivo de prueba a "product-images"...');
    const dummyData = Buffer.from('test image data');
    const { data, error } = await supabase.storage
        .from('product-images')
        .upload('test.txt', dummyData, {
            contentType: 'text/plain',
            upsert: true
        });

    if (error) {
        console.error('Error al subir:', error.message);
        if (error.message.includes('bucket not found')) {
            console.error('CONFIRMADO: El bucket "product-images" no se encuentra.');
        }
    } else {
        console.log('¡ÉXITO! Se pudo subir el archivo. El bucket existe.');
    }
}

testUpload();
