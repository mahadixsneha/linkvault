const router = require('express').Router();
const { User, Link, Click, Settings, File } = require('../models');
const { requireAdmin } = require('../middleware/auth');

// Dashboard stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalLinks, totalClicks, totalFiles] = await Promise.all([
      User.countDocuments(),
      Link.countDocuments(),
      Click.countDocuments(),
      File.countDocuments()
    ]);
    const revenueData = await User.aggregate([{ $group: { _id: null, total: { $sum: '$earnings' } } }]);
    const totalRevenue = revenueData[0]?.total || 0;
    const recentClicks = await Click.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } }, { $limit: 30 }
    ]);
    const topCountries = await Click.aggregate([
      { $match: { country: { $exists: true, $ne: null } } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 10 }
    ]);
    res.json({ totalUsers, totalLinks, totalClicks, totalFiles, totalRevenue, recentClicks, topCountries });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// User management
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = search ? { $or: [{ username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] } : {};
    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit);
    const total = await User.countDocuments(query);
    res.json({ users, total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  try { await User.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Link management
router.get('/links', requireAdmin, async (req, res) => {
  try {
    const links = await Link.find().populate('userId', 'username email').sort({ createdAt: -1 }).limit(100);
    res.json({ links });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/links/:id', requireAdmin, async (req, res) => {
  try { await Link.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Real-time clicks with IP (last 100)
router.get('/clicks/live', requireAdmin, async (req, res) => {
  try {
    const clicks = await Click.find()
      .populate('linkId', 'shortCode title')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ clicks });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Settings CRUD
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await Settings.find();
    const obj = {};
    settings.forEach(s => obj[s.key] = s.value);
    res.json(obj);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/settings', requireAdmin, async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await Settings.findOneAndUpdate({ key }, { value }, { upsert: true });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
