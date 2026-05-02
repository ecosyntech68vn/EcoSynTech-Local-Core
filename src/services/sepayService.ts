/**
 * SePay (SEP Vietnam) Payment Integration
 */

import crypto from 'crypto';
import https from 'https';
import logger from '../config/logger';

interface SePayConfig {
  partnerId: string;
  partnerKey: string;
  apiUrl: string;
  checksumKey: string;
}

interface PaymentData {
  partner_id: string;
  partner_key: string;
  receiver_account: string;
  request_id: string;
  amount: number;
  content: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  request_time: string;
  expire_time: string;
  checksum?: string;
}

interface SePayResponse {
  status?: number;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

const sepayConfig: SePayConfig = {
  partnerId: process.env.SEPAY_PARTNER_ID || 'YOUR_PARTNER_ID',
  partnerKey: process.env.SEPAY_PARTNER_KEY || 'YOUR_PARTNER_KEY',
  apiUrl: process.env.SEPAY_API_URL || 'https://api.sepay.vn',
  checksumKey: process.env.SEPAY_CHECKSUM_KEY || 'YOUR_CHECKSUM_KEY'
};

async function sendToSePay(endpoint: string, data: string): Promise<SePayResponse> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: sepayConfig.apiUrl.replace('https://', ''),
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

async function createSepayPayment(orderId: string, amount: number, content: string, bankId = 'VCB'): Promise<SePayResponse> {
  const timestamp = Date.now().toString();
  
  const paymentData: PaymentData = {
    partner_id: sepayConfig.partnerId,
    partner_key: sepayConfig.partnerKey,
    receiver_account: bankId,
    request_id: orderId,
    amount,
    content: content || `EcoSynTech_${orderId}`,
    return_url: process.env.SEPAY_RETURN_URL || 'http://localhost:3000/api/payment/sepay-return',
    cancel_url: process.env.SEPAY_CANCEL_URL || 'http://localhost:3000/api/payment/cancel',
    notify_url: process.env.SEPAY_NOTIFY_URL || 'http://localhost:3000/api/payment/sepay-ipn',
    request_time: timestamp,
    expire_time: (Date.now() + 15 * 60 * 1000).toString()
  };
  
  const checksumData = Object.keys(paymentData)
    .sort()
    .map(key => key + '=' + paymentData[key as keyof PaymentData])
    .join('&');
  
  paymentData.checksum = crypto
    .createHmac('sha256', sepayConfig.checksumKey)
    .update(checksumData)
    .digest('hex');

  try {
    const data = JSON.stringify(paymentData);
    return await sendToSePay('/payment/create', data);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown';
    logger.error('[SePay] Payment creation failed:', errMsg);
    return { status: -1, error: errMsg };
  }
}

async function querySepayTransaction(requestId: string): Promise<SePayResponse> {
  const timestamp = Date.now().toString();
  
  const queryData = {
    partner_id: sepayConfig.partnerId,
    partner_key: sepayConfig.partnerKey,
    request_id: requestId,
    request_time: timestamp
  };
  
  const checksumData = Object.keys(queryData)
    .sort()
    .map(key => key + '=' + queryData[key as keyof typeof queryData])
    .join('&');
  
  const checksum = crypto
    .createHmac('sha256', sepayConfig.checksumKey)
    .update(checksumData)
    .digest('hex');

  try {
    const data = JSON.stringify({ ...queryData, checksum });
    return await sendToSePay('/payment/query', data);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown';
    logger.error('[SePay] Query failed:', errMsg);
    return { status: -1, error: errMsg };
  }
}

function verifySePayCallback(data: Record<string, unknown>, checksum: string): boolean {
  const checksumData = Object.keys(data)
    .filter(k => k !== 'checksum')
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('&');
  
  const expectedChecksum = crypto.createHmac('sha256', sepayConfig.checksumKey)
    .update(checksumData)
    .digest('hex');
  
  return checksum === expectedChecksum;
}

export {
  createSepayPayment,
  querySepayTransaction,
  verifySePayCallback,
  sepayConfig
};