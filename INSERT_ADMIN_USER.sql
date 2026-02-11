-- ============================================
-- SQL para insertar el usuario admin en Supabase
-- Ejecutar esto en el Editor SQL de Supabase
-- ====================================

-- Insertar usuario admin (solo si no existe)
INSERT INTO users (id, username, password)
SELECT 1, 'admin', '$2a$08$0Xr3hDeRLjLZHxVX39MR7ueLCeEZG59F0ESAbCkhlNF/tyt0iDTNi'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE id = 1
);

-- Verificar que el usuario fue insertado
SELECT * FROM users WHERE id = 1;
