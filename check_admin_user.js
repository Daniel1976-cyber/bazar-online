const { createClient } = require('@supabase/supabase-js');

// Instrucciones: Cambia estos valores para probar el proyecto que usa Vercel
const SB_URL = 'https://jhgbhxlxswduimlkuqms.supabase.co'; // La URL que me pasaste antes de Vercel
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoZ2JoeGx4c3dkdWltbGt1cW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNDI1NzEsImV4cCI6MjA4NzgxODU3MX0.PaDmQmB-g1lXRTidIkKc3SSZq8-e6vpg2FJ3u4ASRAQ';

const supabase = createClient(SB_URL, SB_KEY);

async function checkAdmin() {
    console.log('--- COMPROBANDO PROYECTO ---');
    console.log('URL:', SB_URL);

    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username')
            .eq('username', 'admin');

        if (error) {
            console.error('❌ ERROR:', error.message);
            return;
        }

        if (data && data.length > 0) {
            console.log('✅ ÉXITO: El usuario "admin" EXISTE en este proyecto.');
        } else {
            console.log('❌ FALLO: El usuario "admin" NO existe en este proyecto.');
            console.log('SOLUCIÓN: Debes ejecutar el SQL de creación de tablas en ESTE proyecto de Supabase.');
        }
    } catch (e) {
        console.error('ERROR CATASTRÓFICO:', e.message);
    }
}

checkAdmin();
