require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Enable CORS for all routes (important for Vercel)
app.use(cors({
  origin: ['https://bazar-online-swart.vercel.app', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Middleware to disable caching for API routes
app.use((req, res, next) => {
  if (req.url.startsWith('/products') || req.url.startsWith('/auth') || req.url.startsWith('/import')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

// Serve static files (HTML, CSS, JS) from root directory
app.use(express.static(__dirname));

// Simple JWT secret (in production, use env var)
const JWT_SECRET = process.env.JWT_SECRET || 'cambiar_esto_por_una_secreta_en_prod';

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'catalog.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Serve uploaded images
app.use('/images', express.static(IMAGES_DIR));

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, IMAGES_DIR);
  },
  filename: function (req, file, cb) {
    // create a unique filename preserving extension
    const ext = path.extname(file.originalname) || '.jpg';
    const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, name);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

async function readData() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error leyendo Supabase:', error);
    return [];
  }
  return data;
}

// writeData is no longer needed globally as we update row by row
// But we keep it as a placeholder if needed for migration
async function writeData(data) {
  // Migration only: upsert many
  const { error } = await supabase
    .from('products')
    .upsert(data, { onConflict: 'id' });
  if (error) console.error('Error insertando en Supabase:', error);
}

// Authentication middleware
function authenticate(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'No token' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid token' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// List all products (public)
app.get('/products', async (req, res) => {
  const wantAll = req.query && String(req.query.all).toLowerCase() === 'true';
  const query = supabase.from('products').select('*');

  if (wantAll && req.headers['authorization']) {
    const auth = req.headers['authorization'];
    const parts = auth.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      try {
        jwt.verify(parts[1], JWT_SECRET);
        // Admin gets all
      } catch (e) {
        // invalid token -> fallback to public
        query.eq('active', true).eq('disponible', true);
      }
    } else {
      query.eq('active', true).eq('disponible', true);
    }
  } else {
    // Public view: only show active and available products
    query.eq('active', true).eq('disponible', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get one product (public)
app.get('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  const p = data.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// Create product (protected)
app.post('/products', authenticate, async (req, res) => {
  const payload = req.body || {};
  const product = {
    id: payload.id || Date.now(),
    nombre: payload.nombre || '',
    precio: payload.precio || 0,
    categoria: payload.categoria || '',
    disponible: !!payload.disponible,
    img: payload.img || '',
    active: payload.active !== false
  };
  const { data, error } = await supabase.from('products').insert([product]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// Update product (protected)
app.put('/products/:id', authenticate, async (req, res) => {
  const id = Number(req.params.id);
  const payload = req.body || {};
  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(data[0]);
});

// Delete product (protected)
app.delete('/products/:id', authenticate, async (req, res) => {
  const id = Number(req.params.id);
  const { data, error } = await supabase
    .from('products')
    .update({ active: false })
    .eq('id', id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// Import (replace all) (protected)
app.post('/import', authenticate, async (req, res) => {
  const payload = req.body;
  if (!Array.isArray(payload)) return res.status(400).json({ error: 'Array expected' });

  // For safety in import, we might want to delete all first, or just upsert
  const { error } = await supabase.from('products').upsert(payload);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, count: payload.length });
});

// Upload image (protected)
app.post('/upload-image', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  // return a URL that can be used in products
  const url = `/images/${req.file.filename}`;
  res.json({ url });
});

// ----- Simple auth routes -----
const USERS_FILE = path.join(DATA_DIR, 'users.json');
if (!fs.existsSync(USERS_FILE)) {
  const hashed = bcrypt.hashSync('admin123', 8);
  fs.writeFileSync(USERS_FILE, JSON.stringify([{ id: 1, username: 'admin', password: hashed }], null, 2));
}

function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8') || '[]';
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading users:', e);
    return [];
  }
}

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username/password required' });

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', username.trim())
    .single();

  if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// Change password (protected)
app.post('/auth/change-password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'oldPassword and newPassword required' });

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error || !user) return res.status(404).json({ error: 'User not found' });
  if (!bcrypt.compareSync(oldPassword, user.password)) return res.status(401).json({ error: 'Old password incorrect' });

  const hashedPassword = bcrypt.hashSync(newPassword, 8);
  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('id', req.user.id);

  if (updateError) return res.status(500).json({ error: 'Could not save password' });
  res.json({ ok: true });
});

// Route to serve admin.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Route to serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
