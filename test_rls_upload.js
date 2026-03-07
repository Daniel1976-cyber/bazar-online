const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRLSUpload() {
    console.log('🚀 Probando subida al bucket "product-images" con la configuración de RLS...');

    const filename = `test-rls-${Date.now()}.txt`;
    const dummyData = Buffer.from('Contenido de prueba para verificar RLS');

    console.log(`📡 Intentando subir: ${filename}`);

    const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filename, dummyData, {
            contentType: 'text/plain',
            upsert: true
        });

    if (error) {
        console.error('❌ ERROR FATAL:', error.message);
        console.log('\nSi el error es "Access Denied" o similar, asegúrate de haber ejecutado el script SQL en Supabase.');
    } else {
        console.log('✅ ¡ÉXITO! El archivo se subió correctamente.');
        console.log('Esto confirma que las políticas de RLS están funcionando.');

        // Intentar obtener la URL pública
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filename);
        console.log(`🔗 URL Pública: ${urlData.publicUrl}`);
    }
}

testRLSUpload();
