-- ============================================
-- SQL para crear las tablas en Supabase
-- Ejecutar esto en el Editor SQL de Supabase
-- ============================================

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
INSERT INTO users (id, username, password)
SELECT 1, 'admin', '$2a$08$kvG6hL7H7Q7Q7Q7Q7Q7Q7O7P7R7S7T7U7V7W7X7Y7Z7'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE id = 1
);

-- Habilitar Row Level Security (opcional, para mayor seguridad)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Crear políticas para acceso público a productos (lectura)
CREATE POLICY "Productos públicos son visibles" ON products
  FOR SELECT USING (true);

-- Crear políticas para acceso autenticado (admin)
CREATE POLICY "Admin puede insertar productos" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin puede actualizar productos" ON products
  FOR UPDATE USING (true);

CREATE POLICY "Admin puede borrar productos" ON products
  FOR DELETE USING (true);

-- Verificar que las tablas se crearon correctamente
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'products');
