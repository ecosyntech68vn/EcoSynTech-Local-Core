'use strict';
import GasHybridClient from('./services/gasHybridClient');
import DeviceSecretsSync from('./services/deviceSecretsSync');
import deviceAuth from('./middleware/deviceAuth');
import responseSign from('./middleware/responseSign');

import FORBIDDEN_SECRETS = [
  'CHANGE_ME_IN_PRODUCTION', 'CHANGE_ME_RANDOM', 'CHANGE_ME',
  'changeme', 'secret', 'admin', 'test', 'password', '123456'
];

function checkSecret(name, value, minLen) {
  minLen = minLen || 32;
  if (!value || value.length < minLen) {
    console.error(`[FATAL] ${name} not set or too short (min ${minLen} chars).`);
    console.error('         Generate: openssl rand -hex 40');
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }
  if (FORBIDDEN_SECRETS.indexOf(value) >= 0 ||
      FORBIDDEN_SECRETS.some(f => value.toLowerCase().includes(f.toLowerCase()))) {
    console.error(`[FATAL] ${name} appears to be a placeholder.`);
    console.error('         Replace with: openssl rand -hex 40');
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }
}

function validateEnv() {
  const required = [
    { name: 'JWT_SECRET',           minLen: 32 },
    { name: 'HYBRID_SECRET',        minLen: 40 },
    { name: 'GAS_WEBHOOK_URL',      minLen: 50 },
    { name: 'WEBLOCAL_WEB_ID',      minLen: 5  }
  ];
  for (const r of required) {
    checkSecret(r.name, process.env[r.name], r.minLen);
  }
  console.log('[BOOTSTRAP] Environment secrets validated');
}

async function bootstrap(app) {
  validateEnv();

  const gasClient = new GasHybridClient({
    gasUrl: process.env.GAS_WEBHOOK_URL,
    webId: process.env.WEBLOCAL_WEB_ID,
    hybridSecret: process.env.HYBRID_SECRET,
    timeoutMs: 15000
  });
  app.locals.gasClient = gasClient;

  const secretsSync = new DeviceSecretsSync({ gasClient: gasClient });
  secretsSync.start();
  app.locals.secretsSync = secretsSync;

  console.log('[BOOTSTRAP] Waiting for first device secrets sync...');
  const startedAt = Date.now();
  while (!secretsSync.lastSyncAt && Date.now() - startedAt < 30000) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!secretsSync.lastSyncAt) {
    console.warn('[BOOTSTRAP] First sync timeout — continuing without secrets');
    console.warn('[BOOTSTRAP] Device requests will fail UNKNOWN_DEVICE until sync completes');
  }

  try {
    await gasClient.healthReport({
      web_version: process.env.npm_package_version || 'dev',
      uptime_sec: 0,
      memory_mb: Math.round(process.memoryUsage().heapUsed / 1048576)
    });
  } catch (e) {
    console.warn('[BOOTSTRAP] Initial health report failed:', e.message);
  }

  setInterval(async () => {
    try {
      await gasClient.healthReport({
        web_version: process.env.npm_package_version || 'dev',
        uptime_sec: Math.round(process.uptime()),
        memory_mb: Math.round(process.memoryUsage().heapUsed / 1048576)
      });
    } catch (e) {
      console.warn('[health-report]', e.message);
    }
  }, 5 * 60 * 1000).unref();

  return { gasClient, secretsSync };
}

function wireRoutes(app, deps) {
  const { secretsSync } = deps;

  const deviceAuthMw = deviceAuth({
    lookupDeviceSecret: (deviceId) => secretsSync.lookup(deviceId),
    tsWindowSec: 300,
    logger: console
  });
  const responseSignMw = responseSign({ logger: console });

  const sensorsRouter from('./routes/sensors');
  app.use('/api/sensors', deviceAuthMw, responseSignMw, sensorsRouter);

  const devicesRouter from('./routes/devices');
  app.use('/api/devices', deviceAuthMw, responseSignMw, devicesRouter);

  const deviceActionRouter from('./routes/deviceAction');
  app.use('/api/device/action', deviceAuthMw, responseSignMw, deviceActionRouter);

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      version: process.env.npm_package_version,
      uptime_sec: Math.round(process.uptime()),
      device_secrets_count: secretsSync.getStats().total_secrets
    });
  });
}

module.exports = { bootstrap, wireRoutes, validateEnv };