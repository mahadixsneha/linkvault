const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 500 }));
app.use('/api/auth/', rateLimit({ windowMs: 60*1000, max: 20 }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'linkvault_secret',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, ttl: 30*24*60*60 }),
  cookie: { secure: false, httpOnly: true, sameSite: 'lax', maxAge: 30*24*60*60*1000 }
}));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// 1️⃣ API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/links', require('./routes/links'));
app.use('/api/files', require('./routes/files'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/settings', require('./routes/settings'));

// 2️⃣ Static assets (JS, CSS, images — NOT index.html)
// index: false দিলে express.static কখনো index.html serve করবে না
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3️⃣ /go page
app.get('/go', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'go.html'));
});

// 4️⃣ Short link redirect — /:code
// এখন এটা index.html-এর আগে আসবে
const redirectHandler = require('./routes/redirect');
const { Link } = require('./models');

app.get('/:code', async (req, res, next) => {
  const code = req.params.code;

  // Static file extensions — skip
  if (/\.\w+$/.test(code)) return next();

  // Known SPA routes — skip  
  const spaRoutes = ['go','404','manifest','favicon','sw'];
  if (spaRoutes.includes(code)) return next();

  try {
    const link = await Link.findOne({
      $or: [{ shortCode: code }, { alias: code }],
      isActive: true
    });
    if (!link) return next(); // no link found → SPA
    return redirectHandler(req, res, next);
  } catch(e) {
    return next();
  }
});

// 5️⃣ SPA fallback — সবার শেষে
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
