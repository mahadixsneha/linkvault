// routes/analytics.js
const router = require('express').Router();
const { Click, Link } = require('../models');
const { requireAuth } = require('../middleware/auth');

router.get('/overview', requireAuth, async (req, res) => {
  try {
    const links = await Link.find({ userId: req.session.userId });
    const linkIds = links.map(l => l._id);
    
    const [totalClicks, completedClicks, dailyClicks, countries, devices] = await Promise.all([
      Click.countDocuments({ linkId: { $in: linkIds } }),
      Click.countDocuments({ linkId: { $in: linkIds }, completed: true }),
      Click.aggregate([
        { $match: { linkId: { $in: linkIds } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }},
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ]),
      Click.aggregate([
        { $match: { linkId: { $in: linkIds }, country: { $exists: true } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Click.aggregate([
        { $match: { linkId: { $in: linkIds } } },
        { $group: { _id: '$device', count: { $sum: 1 } } }
      ])
    ]);
    
    res.json({ totalClicks, completedClicks, dailyClicks, countries, devices });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
