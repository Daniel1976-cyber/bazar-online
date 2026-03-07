const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns(tableName) {
    console.log(`\nRevisando columnas de "${tableName}":`);
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
        console.error(`  - Error: ${error.message}`);
    } else if (data && data.length > 0) {
        console.log(`  - Columnas: ${Object.keys(data[0]).join(', ')}`);
    } else {
        console.log('  - Tabla vacía, no puedo ver columnas fácilmente vía SELECT.');
    }
}

async function run() {
    await checkColumns('producto');
    await checkColumns('productos');
}

run();
