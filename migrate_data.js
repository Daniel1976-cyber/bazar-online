require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function migrate() {
    console.log('--- Iniciando Migración a Supabase ---');

    // 1. Migrar Usuarios
    const usersPath = path.join(__dirname, 'data', 'users.json');
    if (fs.existsSync(usersPath)) {
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        console.log(`Migrando ${users.length} usuarios...`);
        for (const user of users) {
            const { error } = await supabase.from('users').upsert({
                username: user.username,
                password: user.password
            }, { onConflict: 'username' });
            if (error) console.error(`Error migrando usuario ${user.username}:`, error.message);
            else console.log(`Usuario ${user.username} migrado.`);
        }
    }

    // 2. Migrar Productos
    const productsPath = path.join(__dirname, 'data', 'catalog.json');
    if (fs.existsSync(productsPath)) {
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        console.log(`Migrando ${products.length} productos...`);
        const { error } = await supabase.from('products').upsert(products);
        if (error) console.error('Error migrando productos:', error.message);
        else console.log(`${products.length} productos migrados.`);
    }

    console.log('--- Migración Finalizada ---');
}

migrate();
