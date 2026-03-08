const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'product-images';
const IMAGES_DIR = path.join(__dirname, 'data', 'images');
const CATALOG_FILE = path.join(__dirname, 'data', 'catalog.json');

async function migrateImages() {
    console.log('🚀 Iniciando migración de imágenes locales a Supabase Cloud...');

    // 1. Obtener productos de Supabase
    const { data: products, error: pError } = await supabase.from('products').select('*');
    if (pError) {
        console.error('❌ Error al obtener productos:', pError.message);
        return;
    }

    console.log(`📦 Se encontraron ${products.length} productos en la base de datos.`);

    let migrados = 0;
    let omitidos = 0;
    let errores = 0;

    for (const product of products) {
        if (!product.img || !product.img.startsWith('/images/')) {
            console.log(`⏩ Omitiendo "${product.nombre}" (ya es URL externa o no tiene imagen)`);
            omitidos++;
            continue;
        }

        const filename = product.img.replace('/images/', '');
        const localPath = path.join(IMAGES_DIR, filename);

        if (!fs.existsSync(localPath)) {
            console.warn(`⚠️ Archivo local no encontrado para "${product.nombre}": ${localPath}`);
            errores++;
            continue;
        }

        try {
            console.log(`⬆️ Subiendo "${filename}" para el producto "${product.nombre}"...`);
            const fileBuffer = fs.readFileSync(localPath);

            // Subir a Supabase Storage
            const { data: uploadData, error: uError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filename, fileBuffer, {
                    contentType: getMimeType(filename),
                    upsert: true
                });

            if (uError) throw uError;

            // Obtener URL pública
            const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
            const publicUrl = urlData.publicUrl;

            // Actualizar producto en la base de datos
            const { error: updateError } = await supabase
                .from('products')
                .update({ img: publicUrl })
                .eq('id', product.id);

            if (updateError) throw updateError;

            console.log(`✅ Migrado: ${product.nombre} -> ${publicUrl}`);
            migrados++;
        } catch (err) {
            console.error(`❌ Error migrando "${product.nombre}":`, err.message);
            errores++;
        }
    }

    console.log('\n--- RESUMEN DE MIGRACIÓN ---');
    console.log(`✅ Éxitos: ${migrados}`);
    console.log(`⏩ Omitidos: ${omitidos}`);
    console.log(`❌ Errores/Faltantes: ${errores}`);

    // Sincronizar catalog.json local por seguridad
    if (migrados > 0) {
        console.log('\n🔄 Sincronizando catalog.json local...');
        const { data: updatedProducts } = await supabase.from('products').select('*').order('id', { ascending: false });
        fs.writeFileSync(CATALOG_FILE, JSON.stringify(updatedProducts, null, 2), 'utf8');
        console.log('✅ catalog.json actualizado.');
    }
}

function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
    };
    return mimes[ext] || 'application/octet-stream';
}

migrateImages();
