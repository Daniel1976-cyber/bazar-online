const { createClient } = require('@supabase/supabase-js');

// Instrucciones: Cambia estos valores para probar el proyecto que usa Vercel
const SB_URL = 'https://fmeapqgydztrdurvbfdv.supabase.co'; // La URL que me pasaste antes de Vercel
const SB_KEY = 'TU_ANON_KEY_DE_ESE_PROYECTO';

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
