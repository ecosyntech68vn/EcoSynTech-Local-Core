const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { getOne, runQuery } = require('../config/database');
const { validateMiddleware } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { auth: authenticate } = require('../middleware/auth');
const { generateRefreshToken, storeRefreshToken, verifyRefreshToken, rotateRefreshToken, generateAccessToken } = require('../middleware/auth');
const config = require('../config');
const logger = require('../config/logger');
const authService = require('../services/authService');

router.post('/register', validateMiddleware('auth.register'), asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  
  const existing = getOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  
  const result = await authService.registerWithEmail(email, password, name);
  if (result.error) {
    return res.status(409).json({ error: result.error });
  }
  
  const session = authService.createSession(result.user);
  logger.info(`User registered via email: ${email}`);
  
  res.status(201).json({ ok: true, ...session });
}));

router.post('/login', validateMiddleware('auth.login'), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const user = getOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { sub: user.id, id: user.id, email: user.email, name: user.name, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  
  logger.info(`User logged in: ${email}`);
  
  // Create and store refresh token for rotation
  const loginRefreshToken = generateRefreshToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  storeRefreshToken(user.id, loginRefreshToken);
  
  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token,
    refreshToken: loginRefreshToken
  });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = getOne('SELECT id, email, name, role, created_at FROM users WHERE id = ?', [req.user.id]);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
}));

router.put('/me', authenticate, asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  
  if (name) {
    runQuery('UPDATE users SET name = ?, updated_at = datetime("now") WHERE id = ?', [name, req.user.id]);
  }
  
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    runQuery('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?', [hashedPassword, req.user.id]);
  }
  
  const user = getOne('SELECT id, email, name, role FROM users WHERE id = ?', [req.user.id]);
  
  res.json(user);
}));

// Refresh endpoint to rotate refresh token and issue new access token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { userId, refreshToken } = req.body;
  if (!userId || !refreshToken) {
    return res.status(400).json({ error: 'Missing userId or refreshToken' });
  }
  const { verifyRefreshToken, rotateRefreshToken, generateAccessToken } = require('../middleware/auth');
  if (!verifyRefreshToken(userId, refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
  const user = getOne('SELECT id, email, name, role FROM users WHERE id = ?', [userId]);
  if (!user) return res.status(401).json({ error: 'User not found' });
  const newRefresh = rotateRefreshToken(userId, refreshToken);
  if (!newRefresh) return res.status(401).json({ error: 'Refresh rotation failed' });
  const newAccess = generateAccessToken(user);
  res.json({ ok: true, token: newAccess, refreshToken: newRefresh });
}));

// ==================== OAUTH AUTHENTICATION ====================

// Google OAuth - Initiate
router.get('/google', asyncHandler(async (req, res) => {
  if (!config.oauth.google.clientId) {
    return res.status(503).json({ error: 'Google OAuth not configured' });
  }
  const redirectUri = config.oauth.google.redirectUri;
  const scope = 'openid email profile';
  const state = Buffer.from(JSON.stringify({ timestamp: Date.now() })).toString('base64');
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${config.oauth.google.clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}` +
    `&access_type=offline`;
  
  res.json({ ok: true, authUrl });
}));

// Google OAuth - Callback
router.get('/google/callback', asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.redirect(`/mobile.html?error=google_auth_failed&message=${encodeURIComponent(error)}`);
  }
  
  if (!code) {
    return res.redirect('/mobile.html?error=google_auth_failed&message=No authorization code');
  }
  
  try {
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: config.oauth.google.clientId,
      client_secret: config.oauth.google.clientSecret,
      redirect_uri: config.oauth.google.redirectUri,
      grant_type: 'authorization_code'
    });
    
    const { access_token } = tokenResponse.data;
    const profile = await authService.verifyGoogleToken(access_token);
    
    if (!profile) {
      return res.redirect('/mobile.html?error=google_auth_failed&message=Invalid token');
    }
    
    const user = await authService.findOrCreateUser(profile, 'google');
    const session = authService.createSession(user);
    
    logger.info(`User logged in via Google: ${user.email}`);
    
    const redirectUrl = `/mobile.html?auth=google&token=${session.token}&refresh=${session.refreshToken}&user=${encodeURIComponent(JSON.stringify(session.user))}`;
    res.redirect(redirectUrl);
  } catch (err) {
    logger.error('Google callback error:', err.message);
    res.redirect('/mobile.html?error=google_auth_failed&message=Token exchange failed');
  }
}));

// Facebook OAuth - Initiate
router.get('/facebook', asyncHandler(async (req, res) => {
  if (!config.oauth.facebook.appId) {
    return res.status(503).json({ error: 'Facebook OAuth not configured' });
  }
  
  const redirectUri = config.oauth.facebook.redirectUri;
  const scope = 'public_profile,email';
  const state = Buffer.from(JSON.stringify({ timestamp: Date.now() })).toString('base64');
  
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${config.oauth.facebook.appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}`;
  
  res.json({ ok: true, authUrl });
}));

// Facebook OAuth - Callback
router.get('/facebook/callback', asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.redirect(`/mobile.html?error=facebook_auth_failed&message=${encodeURIComponent(error)}`);
  }
  
  if (!code) {
    return res.redirect('/mobile.html?error=facebook_auth_failed&message=No authorization code');
  }
  
  try {
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: config.oauth.facebook.appId,
        client_secret: config.oauth.facebook.appSecret,
        redirect_uri: config.oauth.facebook.redirectUri,
        code
      }
    });
    
    const { access_token } = tokenResponse.data;
    const profile = await authService.verifyFacebookToken(access_token);
    
    if (!profile) {
      return res.redirect('/mobile.html?error=facebook_auth_failed&message=Invalid token');
    }
    
    const user = await authService.findOrCreateUser(profile, 'facebook');
    const session = authService.createSession(user);
    
    logger.info(`User logged in via Facebook: ${user.email}`);
    
    const redirectUrl = `/mobile.html?auth=facebook&token=${session.token}&refresh=${session.refreshToken}&user=${encodeURIComponent(JSON.stringify(session.user))}`;
    res.redirect(redirectUrl);
  } catch (err) {
    logger.error('Facebook callback error:', err.message);
    res.redirect('/mobile.html?error=facebook_auth_failed&message=Token exchange failed');
  }
}));

// ==================== PHONE OTP AUTHENTICATION ====================

// Send OTP
router.post('/otp/send', asyncHandler(async (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({ error: 'Phone number required' });
  }
  
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  const normalizedPhone = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '');
  if (!phoneRegex.test('+' + normalizedPhone)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }
  
  const result = await authService.sendOTP(normalizedPhone);
  
  if (result.success) {
    res.json({ ok: true, message: 'OTP sent successfully', fake: result.fake });
  } else {
    res.status(503).json({ error: 'Failed to send OTP' });
  }
}));

// Verify OTP and login/register
router.post('/otp/verify', asyncHandler(async (req, res) => {
  const { phone, code, name, password } = req.body;
  
  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code required' });
  }
  
  const normalizedPhone = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '');
  const isValid = authService.verifyOTP(normalizedPhone, code);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }
  
  const existing = getOne('SELECT * FROM users WHERE phone = ?', [normalizedPhone]);
  
  if (existing) {
    const session = authService.createSession(existing);
    logger.info(`User logged in via OTP: ${normalizedPhone}`);
    res.json({ ok: true, ...session, isNewUser: false });
  } else {
    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password required for new users' });
    }
    
    const result = await authService.registerWithPhone(normalizedPhone, name, password);
    if (result.error) {
      return res.status(409).json({ error: result.error });
    }
    
    const session = authService.createSession(result.user);
    logger.info(`New user registered via OTP: ${normalizedPhone}`);
    res.json({ ok: true, ...session, isNewUser: true });
  }
}));

// ==================== OAUTH MOBILE API (JSON responses) ====================

// Mobile API: Google login
router.post('/google/mobile', asyncHandler(async (req, res) => {
  const { accessToken } = req.body;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token required' });
  }
  
  const profile = await authService.verifyGoogleToken(accessToken);
  if (!profile) {
    return res.status(401).json({ error: 'Invalid Google token' });
  }
  
  const user = await authService.findOrCreateUser(profile, 'google');
  const session = authService.createSession(user);
  
  logger.info(`Mobile user logged in via Google: ${user.email}`);
  res.json({ ok: true, ...session });
}));

// Mobile API: Facebook login
router.post('/facebook/mobile', asyncHandler(async (req, res) => {
  const { accessToken } = req.body;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token required' });
  }
  
  const profile = await authService.verifyFacebookToken(accessToken);
  if (!profile) {
    return res.status(401).json({ error: 'Invalid Facebook token' });
  }
  
  const user = await authService.findOrCreateUser(profile, 'facebook');
  const session = authService.createSession(user);
  
  logger.info(`Mobile user logged in via Facebook: ${user.email}`);
  res.json({ ok: true, ...session });
}));

// Mobile API: Email login
router.post('/mobile/login', validateMiddleware('auth.login'), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const result = await authService.loginWithCredentials(email, password);
  if (result.error) {
    return res.status(401).json({ error: result.error });
  }
  
  const session = authService.createSession(result.user);
  logger.info(`Mobile user logged in: ${email}`);
  res.json({ ok: true, ...session });
}));

module.exports = router;
