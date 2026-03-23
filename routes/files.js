const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { File, Link } = require('../models');
const { requireAuth } = require('../middleware/auth');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, crypto.randomBytes(16).toString('hex') + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.zip', '.apk', '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mp3', '.txt', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});

// Upload file
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const file = await File.create({
      userId: req.session.userId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });
    
    // Create short link for file — 5-char base62
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let shortCode, exists;
    do {
      shortCode = Array.from(crypto.randomBytes(5))
        .map(b => chars[b % chars.length]).join('');
      exists = await Link.findOne({ shortCode });
    } while (exists);
    const link = await Link.create({
      userId: req.session.userId,
      shortCode,
      originalUrl: `/download/${shortCode}`,
      title: req.file.originalname,
      type: 'file',
      fileId: file._id
    });
    
    res.json({
      success: true,
      file,
      link,
      shortUrl: `${process.env.BASE_URL}/${shortCode}`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get user files
router.get('/', requireAuth, async (req, res) => {
  try {
    const files = await File.find({ userId: req.session.userId }).sort({ createdAt: -1 });
    res.json({ files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete file
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const file = await File.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
