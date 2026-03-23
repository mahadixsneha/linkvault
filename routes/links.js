const router = require('express').Router();
const { Link, Click } = require('../models');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');

// Create short link
router.post('/', requireAuth, async (req, res) => {
  try {
    const { originalUrl, alias, title, password, expiresAt, maxClicks } = req.body;
    if (!originalUrl) return res.status(400).json({ error: 'URL required' });

    // Generate unique 5-char base62 code
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    async function genCode(len = 5) {
      let code, exists;
      do {
        code = Array.from(crypto.randomBytes(len))
          .map(b => chars[b % chars.length]).join('');
        exists = await Link.findOne({ shortCode: code });
      } while (exists);
      return code;
    }

    let shortCode;
    if (alias) {
      const exists = await Link.findOne({ $or: [{ shortCode: alias }, { alias }] });
      if (exists) return res.status(400).json({ error: 'Alias already taken' });
      shortCode = alias;
    } else {
      shortCode = await genCode(5);
    }
    
    const link = await Link.create({
      userId: req.session.userId,
      shortCode,
      alias: alias || null,
      originalUrl,
      title: title || originalUrl,
      password,
      expiresAt,
      maxClicks
    });
    
    res.json({ success: true, link, shortUrl: `${process.env.BASE_URL}/${shortCode}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get user links
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = { userId: req.session.userId };
    if (search) query.$or = [
      { shortCode: { $regex: search, $options: 'i' } },
      { originalUrl: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } }
    ];
    const links = await Link.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Link.countDocuments(query);
    res.json({ links, total, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get link analytics
router.get('/:id/analytics', requireAuth, async (req, res) => {
  try {
    const link = await Link.findOne({ _id: req.params.id, userId: req.session.userId });
    if (!link) return res.status(404).json({ error: 'Link not found' });
    
    const clicks = await Click.aggregate([
      { $match: { linkId: link._id } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);
    
    const countries = await Click.aggregate([
      { $match: { linkId: link._id, country: { $exists: true } } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const devices = await Click.aggregate([
      { $match: { linkId: link._id } },
      { $group: { _id: '$device', count: { $sum: 1 } } }
    ]);
    
    res.json({ link, clicks, countries, devices });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete link
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await Link.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

// Step advancement for monetization flow (called from go.html)
router.post('/step', async (req, res) => {
  const redirectHandler = require('./redirect');
  return redirectHandler.stepRoute(req, res);
});
