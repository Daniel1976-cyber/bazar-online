-- ============================================
-- SQL para insertar el usuario admin en Supabase
-- Ejecutar esto en el Editor SQL de Supabase
-- ============================================

-- Insertar usuario admin (solo si no existe)
INSERT INTO users (id, username, password)
SELECT 1, 'admin', '$2a$08$tjAvMZWfHMhTiPVdfkIImeCbxJJ1d1t1d9nncyZEdZREhE8GlKeKm'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE id = 1
);

-- Verificar que el usuario fue insertado
SELECT * FROM users WHERE id = 1;
