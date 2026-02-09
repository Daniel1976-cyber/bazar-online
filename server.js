require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

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

// Read from local JSON file
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8') || '[]';
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error leyendo archivo local:', e);
    return [];
  }
}

// Write to local JSON file
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
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
app.get('/products', (req, res) => {
  const wantAll = req.query && String(req.query.all).toLowerCase() === 'true';
  let data = readData();

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
app.post('/products', authenticate, (req, res) => {
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
  
  const data = readData();
  data.push(product);
  writeData(data);
  
  res.status(201).json(product);
});

// Update product (protected)
app.put('/products/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  const payload = req.body || {};
  const data = readData();
  const index = data.findIndex(x => x.id === id);
  
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  
  // Update product
  data[index] = { ...data[index], ...payload, id }; // Keep original id
  writeData(data);
  
  res.json(data[index]);
});

// Delete product (protected)
app.delete('/products/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  const index = data.findIndex(x => x.id === id);
  
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  
  // Soft delete - set active to false
  data[index].active = false;
  writeData(data);
  
  res.json(data[index]);
});

// Import (replace all) (protected)
app.post('/import', authenticate, (req, res) => {
  const payload = req.body;
  if (!Array.isArray(payload)) return res.status(400).json({ error: 'Array expected' });
  
  // Add timestamps
  const data = payload.map(p => ({
    ...p,
    created_at: p.created_at || new Date().toISOString()
  }));
  
  writeData(data);
  res.json({ ok: true, count: data.length });
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

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username/password required' });

  // Read from local users file
  const users = readUsers();
  const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// Change password (protected)
app.post('/auth/change-password', authenticate, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'oldPassword and newPassword required' });

  const users = readUsers();
  const index = users.findIndex(u => u.id === req.user.id);
  
  if (index === -1) return res.status(404).json({ error: 'User not found' });
  
  if (!bcrypt.compareSync(oldPassword, users[index].password)) return res.status(401).json({ error: 'Old password incorrect' });

  const hashedPassword = bcrypt.hashSync(newPassword, 8);
  users[index].password = hashedPassword;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

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
