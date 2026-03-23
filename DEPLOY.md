# LinkVault — Render Deploy Guide

## ✅ Render-এ Deploy করার ধাপ

### Step 1: GitHub-এ Push করো
```
1. GitHub-এ নতুন repo বানাও (linkvault)
2. এই zip এর সব ফাইল push করো
```

### Step 2: Render Dashboard
```
1. render.com → New → Web Service
2. GitHub repo connect করো
3. Settings:
   - Build Command: npm install
   - Start Command: node server.js
   - Node version: 18
```

### Step 3: Environment Variables সেট করো
Render Dashboard → Environment এ এগুলো add করো:

```
MONGO_URI       = mongodb+srv://user:pass@cluster.mongodb.net/linkvault
SESSION_SECRET  = যেকোনো random 64 char string
BASE_URL        = https://তোমার-app-name.onrender.com
NODE_ENV        = production
PORT            = 3000
```

### Step 4: MongoDB Atlas (Free)
```
1. mongodb.com/atlas → Free cluster বানাও
2. Database Access → user/pass বানাও
3. Network Access → 0.0.0.0/0 (allow all)
4. Connection string → MONGO_URI তে দাও
```

### Step 5: Deploy!
- Render auto deploy করবে
- প্রথমবার 2-3 মিনিট লাগবে

### ⚠️ Render Free Tier Note
- 15 মিনিট inactive থাকলে sleep হয়
- File uploads `/uploads` folder-এ যায় — redeploy করলে মুছে যায়
- Production-এ file upload এর জন্য Cloudinary বা ImgBB use করো

### 🔑 Admin বানাতে
Deploy হওয়ার পর MongoDB Atlas-এ:
```js
db.users.updateOne(
  { email: "তোমার@email.com" },
  { $set: { role: "admin" } }
)
```
