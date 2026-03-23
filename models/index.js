// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  earnings: { type: Number, default: 0 },
  apiKey: { type: String, unique: true, sparse: true },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

// models/Link.js
const linkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shortCode: { type: String, required: true, unique: true },
  originalUrl: { type: String, required: true },
  alias: { type: String, unique: true, sparse: true },
  title: String,
  password: String,
  expiresAt: Date,
  maxClicks: Number,
  clicks: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  type: { type: String, enum: ['url', 'file'], default: 'url' },
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  createdAt: { type: Date, default: Date.now }
});

const Link = mongoose.model('Link', linkSchema);

// models/File.js
const fileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: String,
  filename: String,
  mimetype: String,
  size: Number,
  path: String,
  downloads: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const File = mongoose.model('File', fileSchema);

// models/Click.js
const clickSchema = new mongoose.Schema({
  linkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ip: String,
  country: String,
  city: String,
  region: String,
  timezone: String,
  ll: [Number],   // [latitude, longitude]
  device: String,
  browser: String,
  os: String,
  referrer: String,
  step: { type: Number, default: 1 },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Click = mongoose.model('Click', clickSchema);

// models/Settings.js
const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = { User, Link, File, Click, Settings };
