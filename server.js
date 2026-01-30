const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();

// Enable CORS for all routes (important for Vercel)
app.use(cors({
  origin: ['https://bazar-online-swart.vercel.app', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

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

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8') || '[]';
    const arr = JSON.parse(raw);
    // Ensure existing items have an `active` flag (default true)
    return arr.map(item => (Object.assign({ active: true }, item)));
  } catch (e) {
    console.error('Error leyendo datos:', e);
    return [];
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error guardando datos:', e);
  }
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
  const data = readData();
  // If query ?all=true is requested and a valid token is provided, return everything
  const wantAll = req.query && String(req.query.all).toLowerCase() === 'true';
  if (wantAll && req.headers['authorization']) {
    const auth = req.headers['authorization'];
    const parts = auth.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      try {
        jwt.verify(parts[1], JWT_SECRET);
        return res.json(data);
      } catch (e) {
        // invalid token -> fallthrough to public view
      }
    }
  }
  // Public view: only show active products (and optionally those marked disponible)
  const publicList = data.filter(p => p.active !== false && (p.disponible !== false));
  res.json(publicList);
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
  const data = readData();
  const id = payload.id || Date.now();
  const product = {
    id,
    nombre: payload.nombre || '',
    precio: payload.precio || 0,
    categoria: payload.categoria || '',
    disponible: !!payload.disponible,
    img: payload.img || '',
    active: payload.active !== false
  };
  data.push(product);
  writeData(data);
  res.status(201).json(product);
});

// Update product (protected)
app.put('/products/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  const payload = req.body || {};
  const data = readData();
  const idx = data.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  // Merge updates but keep id
  const updated = Object.assign({}, data[idx], payload, { id });
  // Ensure active remains boolean if provided
  if (payload.hasOwnProperty('active')) updated.active = !!payload.active;
  data[idx] = updated;
  writeData(data);
  res.json(updated);
});

// Delete product (protected)
app.delete('/products/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  const idx = data.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  // Soft-delete: mark as inactive
  data[idx].active = false;
  writeData(data);
  res.json(data[idx]);
});

// Import (replace all) (protected)
app.post('/import', authenticate, (req, res) => {
  const payload = req.body;
  if (!Array.isArray(payload)) return res.status(400).json({ error: 'Array expected' });
  writeData(payload);
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

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username/password required' });
  const users = readUsers();
  const user = users.find(u => u.username === username);
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
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!bcrypt.compareSync(oldPassword, user.password)) return res.status(401).json({ error: 'Old password incorrect' });
  user.password = bcrypt.hashSync(newPassword, 8);
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Could not save password' });
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
