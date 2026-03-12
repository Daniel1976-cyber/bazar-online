const { createClient } = require('@supabase/supabase-js');

// Instrucciones: Cambia estos valores para probar diferentes proyectos
const SB_URL = 'URL_DE_SUPABASE'; // Ej: https://jhgbhxlxswduimlkuqms.supabase.co
const SB_KEY = 'TU_ANON_KEY';

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
            if (error.code === '42P01') {
                console.error('ERROR: La tabla "users" no existe en este proyecto.');
            } else {
                console.error('ERROR de Supabase:', error.message);
            }
            return;
        }

        if (data && data.length > 0) {
            console.log('✅ ÉXITO: El usuario "admin" existe en este proyecto.');
        } else {
            console.log('❌ FALLO: El usuario "admin" NO existe en este proyecto.');
        }
    } catch (e) {
        console.error('ERROR CATASTRÓFICO:', e.message);
    }
}

checkAdmin();
