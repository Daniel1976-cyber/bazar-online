# Guía de Despliegue - Bazar El Romero

## Problema
El cambio de contraseña fallaba en Vercel porque usaba almacenamiento en archivos locales que no persiste en entornos serverless.

## Solución
Migrar a Supabase como almacenamiento persistente.

## Pasos para Solucionar

### 1. Configurar Supabase (solo una vez)

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: `qrnjpovomhbgyqsnhufe`
3. Ve a **SQL Editor** en el menú izquierdo
4. Copia y pega el contenido de `SUPABASE_SETUP.sql`
5. Haz clic en **Run** para ejecutar

### 2. Verificar las tablas

Ejecuta esta consulta para verificar:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'products');
```

Deberías ver: `users` y `products`

### 3. Migrar datos existentes (solo una vez)

Si ya tienes datos en archivos locales y quieres subirlos a Supabase:

```bash
npm install
node migrate_data.js
```

### 4. Desplegar a Vercel

```bash
git add .
git commit -m "Fix: Use Supabase for persistent storage"
git push
```

### 5. Verificar en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona el proyecto `bazar-online-swart`
3. Verifica que las variables de entorno están configuradas:
   - `SUPABASE_URL` = Tu URL de Supabase
   - `SUPABASE_ANON_KEY` = Tu anon key de Supabase
   - `JWT_SECRET` = Una cadena segura

### 6. Probar el cambio de contraseña

1. Abre `https://bazar-online-swart.vercel.app/admin.html`
2. Inicia sesión: `admin` / `admin123`
3. Cambia la contraseña
4. Verifica que el cambio persiste

## Credenciales por Defecto

- **Usuario**: `admin`
- **Contraseña**: `admin123`

## Solución de Problemas

### "Old password incorrect" después del cambio
- Espera unos segundos y vuelve a intentarlo
- Verifica que las tablas están creadas en Supabase

### Los productos no se cargan
- Verifica que `products` tiene datos:
  ```sql
  SELECT COUNT(*) FROM products;
  ```
- Si retorna 0, ejecuta `node migrate_data.js`

### Error de conexión a Supabase
- Verifica las variables de entorno en Vercel
- Asegúrate de que las tablas tienen las columnas correctas

## Notas

- El servidor ahora usa Supabase con fallback a archivos locales
- En desarrollo local, los cambios se guardan en archivos
- En producción (Vercel), los cambios se guardan en Supabase
