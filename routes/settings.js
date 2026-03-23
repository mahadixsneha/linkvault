// routes/settings.js
const router = require('express').Router();
const { Settings } = require('../models');

router.get('/public', async (req, res) => {
  try {
    const settings = await Settings.find({ key: { $in: ['adSettings', 'siteName', 'maintenance'] } });
    const obj = {};
    settings.forEach(s => obj[s.key] = s.value);
    res.json(obj);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
