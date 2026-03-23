# LinkVault — Premium URL Shortener & File Sharing Platform

## 📁 Project Structure
```
urlshort/
├── server.js              # Main Express server
├── package.json
├── .env.example           # Copy to .env and fill in
├── middleware/
│   └── auth.js            # Session auth middleware
├── models/
│   └── index.js           # All Mongoose models (User, Link, File, Click, Settings)
├── routes/
│   ├── auth.js            # Register, Login, Logout, Me
│   ├── links.js           # CRUD + analytics for links
│   ├── files.js           # File upload/download/delete
│   ├── redirect.js        # Short code redirect + step flow
│   ├── admin.js           # Admin panel APIs
│   ├── analytics.js       # User analytics overview
│   └── settings.js        # Public settings
├── public/
│   ├── index.html         # Main SPA (Landing + Dashboard + Admin)
│   ├── go.html            # Monetization flow page (5 layers)
│   ├── 404.html           # 404 page
│   └── manifest.json      # PWA manifest
└── uploads/               # Auto-created for file uploads
```

## 🚀 Setup Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI, session secret, base URL
```

### 3. Create first admin user
After running the server, register normally then run in MongoDB:
```js
db.users.updateOne({ email: "your@email.com" }, { $set: { role: "admin" } })
```

### 4. Run server
```bash
# Development
npm run dev

# Production
npm start
```

### 5. Deploy to Render
- Build command: `npm install`
- Start command: `npm start`
- Add environment variables in Render dashboard

## ⚙️ Admin Panel Features
- Login with admin account → Admin Panel appears in sidebar
- **Ad Settings**: Input Adsterra popunder code, Monetag smartlink, banner codes
- **Layer Control**: Set 2-5 ad layers, 5-30s countdown timer
- **User Management**: Ban, delete, change plans/roles
- **System Settings**: CPM rate, maintenance mode, registration control

## 💰 Monetization Flow
Visitors clicking your short links go through `/go.html`:
1. **Layer 1**: Countdown timer + banner ad (Adsterra popunder fires)
2. **Layer 2**: Click triggers popup ad (Monetag or Adsterra direct link)
3. **Layer 3**: Native ad card with continue button
4. **Layer 4**: Loading animation (2s delay)
5. **Layer 5**: Final glowing "Get My Link" button → redirect

## 🔐 Security Features
- Step tokens (expire in 30 min, in-memory)
- Session-based auth with MongoDB store
- Rate limiting (100 req/15min, 10/min for auth)
- Helmet.js headers
- File type whitelist for uploads

## 📡 API Usage
```bash
# Login
POST /api/auth/login
{ "email": "x@x.com", "password": "pass" }

# Create link
POST /api/links
{ "originalUrl": "https://...", "alias": "custom" }

# Get links
GET /api/links?page=1&limit=20&search=keyword

# Analytics
GET /api/links/:id/analytics
```

## 🔧 Recommended npm packages
All in package.json. Key ones:
- `geoip-lite` — country/city from IP (no API key needed)
- `ua-parser-js` — device/browser/OS detection
- `multer` — file uploads
- `connect-mongo` — session persistence
- `qrcodejs` (CDN) — QR codes

## 📱 Mobile (Render deployment)
Works perfectly on Render free tier. Set:
- `NODE_ENV=production`
- `MONGO_URI=` your Atlas connection string
- `BASE_URL=https://yourapp.onrender.com`
- `SESSION_SECRET=` random 64-char string
