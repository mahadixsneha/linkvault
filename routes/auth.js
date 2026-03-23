const router = require('express').Router();
const { User } = require('../models');
const crypto = require('crypto');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ error: 'User already exists' });

    const apiKey = crypto.randomBytes(32).toString('hex');
    const user = await User.create({ username, email, password, apiKey });

    req.session.userId = user._id.toString();
    req.session.role = user.role;

    // Force save session before responding
    req.session.save(err => {
      if (err) console.error('Session save error:', err);
      res.json({
        success: true,
        user: { id: user._id, username, email, role: user.role, plan: user.plan, earnings: 0, apiKey }
      });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !await user.comparePassword(password))
      return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.isActive)
      return res.status(403).json({ error: 'Account suspended' });

    req.session.userId = user._id.toString();
    req.session.role = user.role;
    user.lastLogin = new Date();
    await user.save();

    // Force save session before responding
    req.session.save(err => {
      if (err) console.error('Session save error:', err);
      res.json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          plan: user.plan,
          earnings: user.earnings,
          apiKey: user.apiKey
        }
      });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Logout error:', err);
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Me — check current session
router.get('/me', async (req, res) => {
  if (!req.session?.userId)
    return res.status(401).json({ error: 'Not authenticated' });

  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
