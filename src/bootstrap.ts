'use strict';
import GasHybridClient from './services/gasHybridClient';
import deviceAuth from './middleware/deviceAuth';
import responseSign from './middleware/responseSign';

const FORBIDDEN_SECRETS = [
  'CHANGE_ME_IN_PRODUCTION', 'CHANGE_ME_RANDOM', 'CHANGE_ME',
  'changeme', 'secret', 'admin', 'test', 'password', '123456'
];

function checkSecret(name: string, value: string | undefined, minLen: number): void {
  minLen = minLen || 32;
  if (!value || value.length < minLen) {
    console.error(`[FATAL] ${name} not set or too short (min ${minLen} chars).`);
    console.error('         Generate: openssl rand -hex 40');
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }
  if (FORBIDDEN_SECRETS.indexOf(value as string) >= 0 ||
      FORBIDDEN_SECRETS.some(f => (value as string).toLowerCase().includes(f.toLowerCase()))) {
    console.error(`[FATAL] ${name} appears to be a placeholder.`);
    console.error('         Replace with: openssl rand -hex 40');
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }
}

interface RequiredEnv {
  name: string;
  minLen: number;
}

function validateEnv(): void {
  const required: RequiredEnv[] = [
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

interface App {
  locals: Record<string, unknown>;
}

async function bootstrap(app: App): Promise<void> {
  validateEnv();

  const gasClient = new GasHybridClient({
    gasUrl: process.env.GAS_WEBHOOK_URL || '',
    webId: process.env.WEBLOCAL_WEB_ID || '',
    hybridSecret: process.env.HYBRID_SECRET || '',
    timeoutMs: 15000
  });
  app.locals.gasClient = gasClient;

  app.use(deviceAuth);
  app.use(responseSign);

  console.log('[BOOTSTRAP] Application bootstrapped successfully');
}

export = { bootstrap, validateEnv, checkSecret };