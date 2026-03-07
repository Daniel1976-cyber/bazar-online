const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function probeTable(tableName) {
    console.log(`\nProbando tabla: "${tableName}"...`);
    try {
        const { data, error, status } = await supabase.from(tableName).select('*').limit(1);
        if (error) {
            console.error(`  - Error: ${error.message} (Status: ${status})`);
            return null;
        }
        console.log(`  - ¡ÉXITO! Se encontró la tabla "${tableName}".`);
        if (data && data.length > 0) {
            console.log(`  - Columnas detectadas: ${Object.keys(data[0]).join(', ')}`);
        } else {
            console.log('  - Tabla está VACÍA. Verificando estructura via RPC si es posible...');
        }
        return data;
    } catch (e) {
        console.error(`  - Excepción: ${e.message}`);
        return null;
    }
}

async function runProbes() {
    console.log('--- Iniciando Depuración de Tablas ---');
    console.log('URL de Supabase:', supabaseUrl);

    await probeTable('producto');
    await probeTable('productos');
    await probeTable('products');
    await probeTable('vista_productos');

    console.log('\n--- Probando Almacenamiento (Bucket) ---');
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();
    if (bError) {
        console.error('  - Error al listar buckets:', bError.message);
    } else {
        console.log('  - Buckets encontrados:', buckets.map(b => b.name).join(', ') || 'NINGUNO');
    }
}

runProbes();
