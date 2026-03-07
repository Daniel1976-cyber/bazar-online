const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Probando SELECT 1 en:', supabaseUrl);
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('Error de conexión/permisos:', error.message);
    } else {
        console.log('Conexión exitosa a la tabla "users".');
    }

    const { data: storageData, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
        console.error('Error de Storage:', storageError.message);
    } else {
        console.log('Buckets encontrados:', storageData.length);
        storageData.forEach(b => console.log(' - Bucket:', b.name));
    }
}

testConnection();
