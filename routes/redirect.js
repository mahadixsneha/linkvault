const { Link, Click, Settings, File } = require('../models');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');

// Step tokens (in-memory)
const tokens = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of tokens.entries()) {
    if (now > v.expires) tokens.delete(k);
  }
}, 5 * 60 * 1000);

function generateToken(data) {
  const token = crypto.randomBytes(16).toString('hex');
  tokens.set(token, { ...data, expires: Date.now() + 30 * 60 * 1000 });
  return token;
}

function verifyToken(token) {
  const data = tokens.get(token);
  if (!data) return null;
  if (Date.now() > data.expires) { tokens.delete(token); return null; }
  return data;
}

function getGeoInfo(ip) {
  try {
    // Clean IPv6-mapped IPv4
    const clean = (ip || '').replace(/^::ffff:/, '').trim();
    if (!clean || clean === '::1' || clean === '127.0.0.1') return {};
    return geoip.lookup(clean) || {};
  } catch { return {}; }
}

// Main redirect handler — exported as middleware function
async function redirectHandler(req, res, next) {
  try {
    const code = req.params.code;
    const link = await Link.findOne({
      $or: [{ shortCode: code }, { alias: code }],
      isActive: true
    });

    if (!link) return res.status(404).sendFile(require('path').join(__dirname, '../public/404.html'));

    if (link.expiresAt && new Date() > link.expiresAt)
      return res.status(410).send('Link expired');
    if (link.maxClicks && link.clicks >= link.maxClicks)
      return res.status(410).send('Link limit reached');

    const settings = await Settings.findOne({ key: 'adSettings' });
    const adConfig = settings?.value || { layers: 5, timerSeconds: 10, enabled: true };

    // Record click
    await recordClick(link, req, false);

    if (!adConfig.enabled) {
      // No ads — direct redirect
      link.clicks += 1;
      await link.save();
      return handleRedirect(res, link);
    }

    // Generate step token and redirect to /go page
    const token = generateToken({ linkId: link._id.toString(), step: 1 });
    res.redirect(`/go?token=${token}&step=1`);

  } catch (e) {
    console.error('Redirect error:', e);
    next(e);
  }
}

// Step advancement API — used by go.html
redirectHandler.stepRoute = async (req, res) => {
  try {
    const { token, step } = req.body;
    const data = verifyToken(token);
    if (!data) return res.status(400).json({ error: 'Invalid or expired token' });

    const settings = await Settings.findOne({ key: 'adSettings' });
    const adConfig = settings?.value || { layers: 5 };

    if (step >= adConfig.layers) {
      const link = await Link.findById(data.linkId);
      if (!link) return res.status(404).json({ error: 'Link not found' });

      await Click.findOneAndUpdate(
        { linkId: link._id, completed: false },
        { $set: { completed: true } },
        { sort: { createdAt: -1 } }
      );

      link.clicks += 1;
      const rateSettings = await Settings.findOne({ key: 'cpmRate' });
      const cpm = rateSettings?.value || 2;
      const earning = cpm / 1000;
      link.earnings = (link.earnings || 0) + earning;
      await link.save();

      const { User } = require('../models');
      await User.findByIdAndUpdate(link.userId, { $inc: { earnings: earning } });

      tokens.delete(token);

      let destination = link.originalUrl;
      if (link.type === 'file') destination = `/api/files/download/${link.fileId}`;

      return res.json({ success: true, destination });
    }

    const newToken = generateToken({ ...data, step: step + 1 });
    tokens.delete(token);
    res.json({ success: true, newToken, nextStep: step + 1 });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

async function recordClick(link, req, completed) {
  const ua = new UAParser(req.headers['user-agent']).getResult();
  const rawIp = req.ip || req.headers['x-forwarded-for'] || '';
  const cleanIp = rawIp.replace(/^::ffff:/, '').split(',')[0].trim();
  const geo = getGeoInfo(cleanIp);

  await Click.create({
    linkId: link._id,
    userId: link.userId,
    ip: cleanIp,
    country: geo.country || null,
    city: geo.city || null,
    region: geo.region || null,
    timezone: geo.timezone || null,
    ll: geo.ll || null,
    device: ua.device.type || 'desktop',
    browser: ua.browser.name || null,
    os: ua.os.name || null,
    referrer: req.headers.referer || null,
    completed
  });
}

function handleRedirect(res, link) {
  if (link.type === 'file') res.redirect(`/api/files/download/${link.fileId}`);
  else res.redirect(link.originalUrl);
}

module.exports = redirectHandler;
