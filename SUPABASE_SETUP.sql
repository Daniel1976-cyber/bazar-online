-- ============================================
-- SQL para crear las tablas en Supabase
-- Ejecutar esto en el Editor SQL de Supabase
-- ====================================

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY,
  nombre TEXT,
  precio NUMERIC,
  categoria TEXT,
  disponible BOOLEAN DEFAULT true,
  img TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar usuario admin por defecto (si no existe)
-- Password: admin123 -> Hash: $2a$08$0Xr3hDeRLjLZHxVX39MR7ueLCeEZG59F0ESAbCkhlNF/tyt0iDTNi
INSERT INTO users (id, username, password)
SELECT 1, 'admin', '$2a$08$0Xr3hDeRLjLZHxVX39MR7ueLCeEZG59F0ESAbCkhlNF/tyt0iDTNi'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE id = 1
);

-- Crear políticas para acceso público a productos (solo si no existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Productos públicos son visibles') THEN
    CREATE POLICY "Productos públicos son visibles" ON products FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Admin puede insertar productos') THEN
    CREATE POLICY "Admin puede insertar productos" ON products FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Admin puede actualizar productos') THEN
    CREATE POLICY "Admin puede actualizar productos" ON products FOR UPDATE USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Admin puede borrar productos') THEN
    CREATE POLICY "Admin puede borrar productos" ON products FOR DELETE USING (true);
  END IF;
END $$;

-- Verificar que las tablas se crearon correctamente
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'products');
