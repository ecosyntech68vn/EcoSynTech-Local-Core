'use strict';

import bcrypt from('bcryptjs');
import jwt from('jsonwebtoken');
import axios from('axios');
import { v4: uuidv4 } from('uuid');
import { getOne, runQuery, getAll } from('../config/database');
import config from('../config');
import logger from('../config/logger');

class AuthService {
  generateToken(user) {
    return jwt.sign(
      { sub: user.id, id: user.id, email: user.email, name: user.name, role: user.role, provider: user.provider },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { sub: user.id, type: 'refresh', id: user.id },
      config.jwt.secret,
      { expiresIn: '30d' }
    );
  }

  async findOrCreateUser(profile, provider) {
    let user = null;
    
    if (provider === 'google' || provider === 'facebook') {
      user = getOne('SELECT * FROM users WHERE provider_id = ? AND provider = ?', [profile.id, provider]);
    } else if (provider === 'phone') {
      user = getOne('SELECT * FROM users WHERE phone = ?', [profile.phone]);
    } else {
      user = getOne('SELECT * FROM users WHERE email = ?', [profile.email]);
    }

    if (user) {
      if (provider !== 'email') {
        runQuery(
          'UPDATE users SET name = ?, avatar = ?, updated_at = datetime("now") WHERE id = ?',
          [profile.name, profile.avatar || null, user.id]
        );
      }
      return { ...user, provider };
    }

    const userId = `user-${uuidv4()}`;
    const defaultPassword = bcrypt.hashSync(uuidv4(), 10);
    
    const insertData = {
      id: userId,
      email: profile.email || `${provider}_${profile.id}@ecosyntech.local`,
      password: defaultPassword,
      name: profile.name || 'User',
      phone: profile.phone || null,
      provider: provider,
      provider_id: provider !== 'email' ? profile.id : null,
      avatar: profile.avatar || null,
      role: 'user'
    };

    runQuery(
      'INSERT INTO users (id, email, password, name, phone, provider, provider_id, avatar, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
      [insertData.id, insertData.email, insertData.password, insertData.name, insertData.phone, insertData.provider, insertData.provider_id, insertData.avatar, insertData.role]
    );

    logger.info(`New user created via ${provider}: ${insertData.email}`);
    return insertData;
  }

  async verifyGoogleToken(token) {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return {
        id: response.data.sub,
        email: response.data.email,
        name: response.data.name,
        avatar: response.data.picture
      };
    } catch (error) {
      logger.error('Google token verification failed:', error.message);
      return null;
    }
  }

  async verifyFacebookToken(token) {
    try {
      const appSecret = config.oauth.facebook.appSecret;
      const appAccessToken = `${config.oauth.facebook.appId}|${appSecret}`;
      
      const debugResponse = await axios.get('https://graph.facebook.com/v18.0/debug_token', {
        params: { input_token: token, access_token: appAccessToken }
      });
      
      if (!debugResponse.data.data.is_valid) {
        return null;
      }

      const userResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
        params: {
          fields: 'id,name,email,picture.width(200).height(200)',
          access_token: token
        }
      });

      return {
        id: userResponse.data.id,
        email: userResponse.data.email || `${userResponse.data.id}@facebook.auth`,
        name: userResponse.data.name,
        avatar: userResponse.data.picture?.data?.url
      };
    } catch (error) {
      logger.error('Facebook token verification failed:', error.message);
      return null;
    }
  }

  generateOTP() {
    const length = config.otp.length || 6;
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10).toString();
    }
    return otp;
  }

  async sendOTP(phone) {
    const otp = this.generateOTP();
    const expiry = Date.now() + (config.otp.expiryMinutes || 5) * 60 * 1000;
    const isFakeMode = config.otp.fakeMode || process.env.NODE_ENV === 'test';

    logger.info(`[OTP] Sending to phone: ${phone}, code: ${isFakeMode ? '123456' : otp}, fakeMode: ${isFakeMode}`);

    // Clean up old records for this phone (including different formats)
    const phoneWithPlus = phone.startsWith('+') ? phone : '+' + phone;
    const phoneWithoutPlus = phone.startsWith('+') ? phone.substring(1) : phone;
    runQuery('DELETE FROM otp_codes WHERE phone IN (?, ?)', [phoneWithPlus, phoneWithoutPlus]);

    if (isFakeMode) {
      runQuery(
        'INSERT INTO otp_codes (phone, code, expires_at, created_at) VALUES (?, ?, ?, datetime("now"))',
        [phone, '123456', new Date(expiry).toISOString()]
      );
      
      return { success: true, code: '123456', fake: true };
    }

    runQuery('DELETE FROM otp_codes WHERE phone = ?', [phone]);
    runQuery(
      'INSERT INTO otp_codes (phone, code, expires_at, created_at) VALUES (?, ?, ?, datetime("now"))',
      [phone, otp, new Date(expiry).toISOString()]
    );

    try {
      if (config.sms.twilio.accountSid) {
        const twilio from('twilio')(config.sms.twilio.accountSid, config.sms.twilio.authToken);
        await twilio.messages.create({
          body: `EcoSynTech: Your verification code is ${otp}`,
          from: config.sms.twilio.phoneNumber,
          to: phone
        });
        logger.info(`OTP sent to ${phone} via Twilio`);
        return { success: true };
      } else if (config.sms.esms.apiKey) {
        const esmsResponse = await axios.get('https://api.esms.vn/MainService.svc/json/SendSMS', {
          params: {
            ApiKey: config.sms.esms.apiKey,
            SecretKey: config.sms.esms.secretKey,
            Phone: phone,
            Content: `EcoSynTech: Your code is ${otp}`,
            Brandname: config.sms.esms.brandName,
            SmsType: 2
          }
        });
        logger.info(`OTP sent to ${phone} via Esms`);
        return { success: true };
      }
    } catch (error) {
      logger.error('Failed to send OTP:', error.message);
    }

    return { success: false };
  }

  verifyOTP(phone, code) {
    logger.info(`[OTP] Verifying phone: ${phone}, code: ${code}`);
    const now = new Date().toISOString();
    
    // Debug: Check what records exist
    const allRecords = getAll('SELECT phone, code, expires_at FROM otp_codes');
    logger.info(`[OTP] All OTP records: ${JSON.stringify(allRecords.slice(0, 5))}`);
    
    const record = getOne('SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND expires_at > ?', [phone, code, now]);
    logger.info(`[OTP] Record found: ${!!record}`);
    
    if (record) {
      runQuery('DELETE FROM otp_codes WHERE phone = ?', [phone]);
      return true;
    }
    return false;
  }

  async registerWithPhone(phone, name, password) {
    const existing = getOne('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing) {
      return { error: 'Phone number already registered' };
    }

    const userId = `user-${uuidv4()}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    runQuery(
      'INSERT INTO users (id, email, password, name, phone, provider, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))',
      [userId, `${phone}@ecosyntech.local`, hashedPassword, name, phone, 'phone', 'user']
    );

    const user = getOne('SELECT id, email, name, phone, role FROM users WHERE id = ?', [userId]);
    return { user, provider: 'phone' };
  }

  async registerWithEmail(email, password, name) {
    const existing = getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return { error: 'Email already registered' };
    }

    const userId = `user-${uuidv4()}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    runQuery(
      'INSERT INTO users (id, email, password, name, provider, role, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [userId, email, hashedPassword, name, 'email', 'user']
    );

    const user = getOne('SELECT id, email, name, role FROM users WHERE id = ?', [userId]);
    return { user, provider: 'email' };
  }

  async loginWithCredentials(email, password) {
    const user = getOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return { error: 'Invalid credentials' };
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { error: 'Invalid credentials' };
    }

    return { user, provider: user.provider || 'email' };
  }

  createSession(user) {
    return {
      token: this.generateToken(user),
      refreshToken: this.generateRefreshToken(user),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        provider: user.provider
      }
    };
  }
}

module.exports = new AuthService();