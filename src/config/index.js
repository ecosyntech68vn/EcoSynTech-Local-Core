require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  database: {
    path: process.env.DB_PATH || './data/ecosyntech.db'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'test-secret-key-for-development-use-only',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'wss://broker.hivemq.com:8884/mqtt',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || ''
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map(o => o.trim())
      .filter(o => o)
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },

  opsSchedulerDisabled: process.env.OPS_SCHEDULER_DISABLED === 'true',
  opsHotReloadEnabled: process.env.OPS_HOT_RELOAD_ENABLED === 'true',
  opsSchedulerInterval: parseInt(process.env.OPS_SCHEDULER_INTERVAL || '600000', 10),
  
  webhook: {
    secret: process.env.WEBHOOK_SECRET || 'webhook-secret'
  },

  blockchain: {
    enabled: process.env.BLOCKCHAIN_ENABLED === 'true',
    type: process.env.BLOCKCHAIN_TYPE || 'aptos',
    network: process.env.APTOS_NETWORK || 'testnet',
    moduleAddress: process.env.APTOS_MODULE_ADDRESS || '0x1',
    privateKey: process.env.APTOS_PRIVATE_KEY || ''
  },

  qrcode: {
    enabled: process.env.QR_CODE_ENABLED !== 'false',
    baseUrl: process.env.QR_CODE_BASE_URL || 'https://ecosyntech.com'
  },

  gasHybrid: {
    url: process.env.GAS_WEBHOOK_URL || '',
    webId: process.env.WEBLOCAL_WEB_ID || '',
    hybridSecret: process.env.HYBRID_SECRET || '',
    timeoutMs: parseInt(process.env.GAS_TIMEOUT_MS || '15000', 10)
  },

  weblocal: {
    webId: process.env.WEBLOCAL_WEB_ID || '',
    tsWindowSec: parseInt(process.env.DEVICE_TS_WINDOW_SEC || '300', 10)
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID || '',
      appSecret: process.env.FACEBOOK_APP_SECRET || '',
      redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/api/auth/facebook/callback'
    }
  },

  otp: {
    enabled: process.env.OTP_ENABLED === 'true',
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
    fakeMode: process.env.OTP_FAKE_MODE === 'true'
  },

  sms: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
    },
    esms: {
      apiKey: process.env.ESMS_API_KEY || '',
      secretKey: process.env.ESMS_SECRET_KEY || '',
      brandName: process.env.ESMS_BRAND_NAME || 'ESMS'
    }
  }
};
