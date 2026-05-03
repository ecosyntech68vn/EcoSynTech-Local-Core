/**
 * MoMo Payment Integration
 */

import crypto from 'crypto';
import https from 'https';
import logger from '../config/logger';

interface MoMoConfig {
  partnerCode: string;
  secretKey: string;
  accessKey: string;
  endpoint: string;
  redirectUrl: string;
  ipnUrl: string;
}

interface MoMoPaymentRequest {
  partnerCode: string;
  partnerName: string;
  storeId: string;
  requestId: string;
  amount: string;
  orderId: string;
  orderInfo: string;
  redirectUrl: string;
  ipnUrl: string;
  requestType: string;
  signature: string;
  extraData?: string;
}

interface MoMoPaymentResponse {
  partnerCode?: string;
  orderId?: string;
  requestId?: string;
  amount?: string;
  transId?: string;
  resultCode?: number;
  message?: string;
  signature?: string;
}

const momoConfig: MoMoConfig = {
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO1234567890',
  secretKey: process.env.MOMO_SECRET_KEY || '',
  accessKey: process.env.MOMO_ACCESS_KEY || 'MOMO_ACCESS_KEY',
  endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn',
  redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/api/payment/momo-return',
  ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:3000/api/payment/momo-ipn'
};

async function sendToMoMo(endpoint: string, data: string): Promise<MoMoPaymentResponse> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: momoConfig.endpoint.replace('https://', ''),
      port: 443,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk: string) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function createMoMoPayment(orderId: string, amount: number, orderInfo: string): Promise<MoMoPaymentResponse> {
  const requestId = orderId + '_' + Date.now();
  const requestType = 'captureWallet';
  
  const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&ipAddr=127.0.0.1&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${momoConfig.partnerCode}&redirectUrl=${momoConfig.redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
  
  const signature = crypto.createHmac('sha256', momoConfig.secretKey)
    .update(rawSignature)
    .digest('hex');

  const data = JSON.stringify({
    partnerCode: momoConfig.partnerCode,
    partnerName: 'EcoSynTech',
    storeId: 'EcoSynTech_FarmOS',
    requestId,
    amount: amount.toString(),
    orderId,
    orderInfo,
    redirectUrl: momoConfig.redirectUrl,
    ipnUrl: momoConfig.ipnUrl,
    requestType,
    signature,
    extraData: ''
  } as MoMoPaymentRequest);

  try {
    return await sendToMoMo('/gwpayment/command', data);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown';
    logger.error('[MoMo] Payment creation failed:', errMsg);
    return { resultCode: -1, message: errMsg };
  }
}

async function queryMoMoTransaction(orderId: string, requestId: string): Promise<MoMoPaymentResponse> {
  const rawSignature = `accessKey=${momoConfig.accessKey}&orderId=${orderId}&partnerCode=${momoConfig.partnerCode}&requestId=${requestId}`;
  
  const signature = crypto.createHmac('sha256', momoConfig.secretKey)
    .update(rawSignature)
    .digest('hex');

  const data = JSON.stringify({
    partnerCode: momoConfig.partnerCode,
    orderId,
    requestId,
    requestType: 'transactionStatus',
    signature
  });

  try {
    return await sendToMoMo('/gwpayment/command', data);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown';
    logger.error('[MoMo] Query failed:', errMsg);
    return { resultCode: -1, message: errMsg };
  }
}

function verifyMoMoCallback(data: Record<string, unknown>, signature: string): boolean {
  const rawSignature = Object.keys(data)
    .filter(k => k !== 'signature')
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('&');
  
  const expectedSignature = crypto.createHmac('sha256', momoConfig.secretKey)
    .update(rawSignature)
    .digest('hex');
  
  return signature === expectedSignature;
}

export {
  createMoMoPayment,
  queryMoMoTransaction,
  verifyMoMoCallback,
  momoConfig
};