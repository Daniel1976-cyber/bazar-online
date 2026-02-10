require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  const allowedOrigins = ['https://bazar-online-swart.vercel.app', 'http://localhost:3000'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

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

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'cambiar_esto_por_una_secreta_en_prod';

// Local storage fallback paths (for local development)
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'catalog.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

// Ensure local data directories exist (for fallback)
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
    const ext = path.extname(file.originalname) || '.jpg';
    const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, name);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ============ SUPABASE HELPERS ============
async function getProductsFromSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });
  if (error) {
    console.error('Error fetching from Supabase:', error.message);
    return null;
  }
  return data;
}

async function saveProductsToSupabase(products) {
  if (!supabase) return false;
  const { error } = await supabase.from('products').upsert(products);
  if (error) {
    console.error('Error saving to Supabase:', error.message);
    return false;
  }
  return true;
}

async function getUsersFromSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users from Supabase:', error.message);
    return null;
  }
  return data;
}

async function saveUsersToSupabase(users) {
  if (!supabase) return false;
  const { error } = await supabase.from('users').upsert(users);
  if (error) {
    console.error('Error saving users to Supabase:', error.message);
    return false;
  }
  return true;
}

// ============ LOCAL FALLBACK HELPERS ============
function readDataLocal() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8') || '[]';
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error leyendo archivo local:', e);
    return [];
  }
}

function writeDataLocal(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function readUsersLocal() {
  try {
    const USERS_FILE = path.join(DATA_DIR, 'users.json');
    if (!fs.existsSync(USERS_FILE)) {
      const hashed = bcrypt.hashSync('admin123', 8);
      fs.writeFileSync(USERS_FILE, JSON.stringify([{ id: 1, username: 'admin', password: hashed }], null, 2));
    }
    const raw = fs.readFileSync(USERS_FILE, 'utf8') || '[]';
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading users:', e);
    return [];
  }
}

// ============ DATA ACCESS LAYER ============
async function readData() {
  // Try Supabase first
  const supabaseData = await getProductsFromSupabase();
  if (supabaseData !== null) return supabaseData;
  
  // Fallback to local file
  return readDataLocal();
}

async function writeData(data) {
  // Try Supabase first
  const success = await saveProductsToSupabase(data);
  if (success) return;
  
  // Fallback to local file
  writeDataLocal(data);
}

async function readUsers() {
  // Try Supabase first
  const supabaseUsers = await getUsersFromSupabase();
  if (supabaseUsers !== null) return supabaseUsers;
  
  // Fallback to local file
  return readUsersLocal();
}

async function writeUsers(users) {
  // Try Supabase first
  const success = await saveUsersToSupabase(users);
  if (success) return;
  
  // Fallback to local file
  const USERS_FILE = path.join(DATA_DIR, 'users.json');
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// ============ AUTH MIDDLEWARE ============
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

// ============ API ROUTES ============

// List all products (public)
app.get('/products', async (req, res) => {
  try {
    const wantAll = req.query && String(req.query.all).toLowerCase() === 'true';
    let data = await readData();

    // Check if admin token is valid
    const auth = req.headers['authorization'];
    const parts = auth && auth.split(' ');
    if (parts && parts.length === 2 && parts[0] === 'Bearer') {
      try {
        jwt.verify(parts[1], JWT_SECRET);
        wantAll = true; // Admin gets all
      } catch (e) {
        // invalid token -> fallback to public
      }
    }

    if (!wantAll) {
      // Public view: only show active and available products
      data = data.filter(x => x.active !== false && x.disponible === true);
    }

    res.json(data);
  } catch (e) {
    console.error('Error in /products:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get one product (public)
app.get('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readData();
    const p = data.find(x => x.id === id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product (protected)
app.post('/products', authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    const product = {
      id: payload.id || Date.now(),
      nombre: payload.nombre || '',
      precio: payload.precio || 0,
      categoria: payload.categoria || '',
      disponible: !!payload.disponible,
      img: payload.img || '',
      active: payload.active !== false,
      created_at: new Date().toISOString()
    };
    
    const data = await readData();
    data.unshift(product); // Add to beginning
    await writeData(data);
    
    res.status(201).json(product);
  } catch (e) {
    console.error('Error creating product:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product (protected)
app.put('/products/:id', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body || {};
    let data = await readData();
    const index = data.findIndex(x => x.id === id);
    
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    
    // Update product
    data[index] = { ...data[index], ...payload, id };
    await writeData(data);
    
    res.json(data[index]);
  } catch (e) {
    console.error('Error updating product:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product (protected)
app.delete('/products/:id', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    let data = await readData();
    const index = data.findIndex(x => x.id === id);
    
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    
    // Soft delete - set active to false
    data[index].active = false;
    await writeData(data);
    
    res.json(data[index]);
  } catch (e) {
    console.error('Error deleting product:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import (replace all) (protected)
app.post('/import', authenticate, async (req, res) => {
  try {
    const payload = req.body;
    if (!Array.isArray(payload)) return res.status(400).json({ error: 'Array expected' });
    
    // Add timestamps
    const data = payload.map(p => ({
      ...p,
      created_at: p.created_at || new Date().toISOString()
    }));
    
    await writeData(data);
    res.json({ ok: true, count: data.length });
  } catch (e) {
    console.error('Error importing:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload image (protected)
app.post('/upload-image', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  // return a URL that can be used in products
  const url = `/images/${req.file.filename}`;
  res.json({ url });
});

// Auth routes
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username/password required' });

    const users = await readUsers();
    const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = bcrypt.compareSync(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password (protected)
app.post('/auth/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'oldPassword and newPassword required' });

    let users = await readUsers();
    const index = users.findIndex(u => u.id === req.user.id);
    
    if (index === -1) return res.status(404).json({ error: 'User not found' });
    
    if (!bcrypt.compareSync(oldPassword, users[index].password)) return res.status(401).json({ error: 'Old password incorrect' });

    const hashedPassword = bcrypt.hashSync(newPassword, 8);
    users[index].password = hashedPassword;
    await writeUsers(users);

    res.json({ ok: true });
  } catch (e) {
    console.error('Change password error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
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
