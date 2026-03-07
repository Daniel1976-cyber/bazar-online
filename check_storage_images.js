const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkImages() {
    console.log('🔍 Buscando imágenes en el almacenamiento de Supabase...');

    // 1. Listar Buckets
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();

    if (bError) {
        console.error('❌ Error al listar buckets:', bError.message);
        return;
    }

    if (!buckets || buckets.length === 0) {
        console.log('⚠️ No se encontraron buckets de almacenamiento.');
        return;
    }

    console.log(`📂 Se encontraron ${buckets.length} buckets.`);

    for (const bucket of buckets) {
        console.log(`\n--- Bucket: "${bucket.name}" ---`);
        await listFilesRecursive(bucket.name, '');
    }
}

async function listFilesRecursive(bucketName, path) {
    const { data: files, error: fError } = await supabase.storage.from(bucketName).list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
    });

    if (fError) {
        console.error(`  ❌ Error al listar archivos en "${bucketName}${path ? '/' + path : ''}":`, fError.message);
        return;
    }

    if (!files || files.length === 0) {
        console.log(`  (Vacío)`);
        return;
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

    for (const file of files) {
        const fullPath = path ? `${path}/${file.name}` : file.name;

        if (file.id === null) {
            // Es una carpeta
            console.log(`  📁 Carpeta: ${fullPath}`);
            await listFilesRecursive(bucketName, fullPath);
        } else {
            // Es un archivo
            const isImage = imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
            if (isImage) {
                console.log(`  ✅ Imagen: ${fullPath} (${file.metadata.size} bytes)`);
            } else {
                console.log(`  📄 Archivo: ${fullPath}`);
            }
        }
    }
}

checkImages();
