/**
 * VNPay Payment Integration
 * Converted to TypeScript - Phase 1
 * 
 * VNPay API: https://sandbox.vnpayment.vn/apis/vnpay
 */

import crypto from 'crypto';
import https from 'https';
import querystring from 'querystring';
import logger from '../config/logger';

export interface VNPayConfig {
  vnp_TmnCode: string;
  vnp_HashSecret: string;
  vnp_Url: string;
  vnp_Api: string;
  vnp_ReturnUrl: string;
  vnp_Command: string;
  vnp_CurrCode: string;
  vnp_Locale: string;
  vnp_Version: string;
}

export interface PaymentRequest {
  orderId: string;
  amount: number;
  orderInfo: string;
  orderType?: string;
  bankCode?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  message?: string;
  transactionId?: string;
}

export interface PaymentCallback {
  vnp_Amount?: string;
  vnp_BankCode?: string;
  vnp_BankTranNo?: string;
  vnp_CardType?: string;
  vnp_OrderInfo?: string;
  vnp_PayDate?: string;
  vnp_ResponseCode?: string;
  vnp_TmnCode?: string;
  vnp_TransactionNo?: string;
  vnp_TransactionStatus?: string;
  vnp_TxnRef?: string;
  vnp_SecureHash?: string;
}

import config: VNPayConfig = {
  vnp_TmnCode: process.env.VNPAY_TmnCode || 'ECOSYN02',
  vnp_HashSecret: process.env.VNP_HASH_SECRET || '',
  vnp_Url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/payv2/vpcpay.html',
  vnp_Api: process.env.VNPAY_API || 'https://sandbox.vnpayment.vn/apis/vnpay',
  vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/payment/return',
  vnp_Command: 'pay',
  vnp_CurrCode: 'VND',
  vnp_Locale: 'vn',
  vnp_Version: '2.1.0'
};

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function md5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function hmacSHA512(data: string, key: string): string {
  return crypto.createHmac('sha512', key).update(data).digest('hex');
}

export function createPaymentUrl(orderId: string, amount: number, orderInfo: string, orderType?: string, bankCode?: string): string | null {
  const date = new Date();
  const vnp_CreateDate = date.getFullYear().toString() +
    ((date.getMonth() + 1).toString().padStart(2, '0')) +
    date.getDate().toString().padStart(2, '0') +
    date.getHours().toString().padStart(2, '0') +
    date.getMinutes().toString().padStart(2, '0') +
    date.getSeconds().toString().padStart(2, '0');

  const vnp_ExpireDate = new Date(date.getTime() + 15 * 60 * 1000);
  const vnp_Expire = vnp_ExpireDate.getFullYear().toString() +
    ((vnp_ExpireDate.getMonth() + 1).toString().padStart(2, '0')) +
    vnp_ExpireDate.getDate().toString().padStart(2, '0') +
    vnp_ExpireDate.getHours().toString().padStart(2, '0') +
    vnp_ExpireDate.getMinutes().toString().padStart(2, '0') +
    vnp_ExpireDate.getSeconds().toString().padStart(2, '0');

  const params: Record<string, string> = {
    vnp_Amount: (amount * 100).toString(),
    vnp_Command: config.vnp_Command,
    vnp_CurrCode: config.vnp_CurrCode,
    vnp_Locale: config.vnp_Locale,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType || 'billpayment',
    vnp_ReturnUrl: config.vnp_ReturnUrl,
    vnp_TmnCode: config.vnp_TmnCode,
    vnp_TxnRef: orderId,
    vnp_Version: config.vnp_Version,
    vnp_CreateDate,
    vnp_ExpireDate: vnp_Expire
  };

  if (bankCode) {
    params.vnp_BankCode = bankCode;
  }

  const sortedParams = Object.keys(params).sort()
    .map((key: string) => `${key}=${encodeURIComponent(params[key as keyof typeof params] || '')}`)
    .join('&');

  const signData = sortedParams;
  const signature = hmacSHA512(signData, config.vnp_HashSecret);

  return `${config.vnp_Url}?${sortedParams}&vnp_SecureHash=${signature}`;
}

export function verifyCallback(callback: PaymentCallback): boolean {
  const {
    vnp_Amount,
    vnp_BankCode,
    vnp_BankTranNo,
    vnp_CardType,
    vnp_OrderInfo,
    vnp_PayDate,
    vnp_ResponseCode,
    vnp_TmnCode,
    vnp_TransactionNo,
    vnp_TransactionStatus,
    vnp_TxnRef,
    vnp_SecureHash
  } = callback;

  const params = {
    vnp_Amount: vnp_Amount || '',
    vnp_BankCode: vnp_BankCode || '',
    vnp_BankTranNo: vnp_BankTranNo || '',
    vnp_CardType: vnp_CardType || '',
    vnp_OrderInfo: vnp_OrderInfo || '',
    vnp_PayDate: vnp_PayDate || '',
    vnp_ResponseCode: vnp_ResponseCode || '',
    vnp_TmnCode: vnp_TmnCode || '',
    vnp_TransactionNo: vnp_TransactionNo || '',
    vnp_TransactionStatus: vnp_TransactionStatus || '',
    vnp_TxnRef: vnp_TxnRef || ''
  };

  const sortedParams = Object.keys(params).sort()
    .map(key => `${key}=${encodeURIComponent(params[key as keyof typeof params] || '')}`)
    .join('&');

  const signature = hmacSHA512(sortedParams, config.vnp_HashSecret);

  return signature === vnp_SecureHash;
}

export function getResponseCodeMessage(responseCode: string): string {
  const codes: Record<string, string> = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Chưa có giao dịch khởi tạo GT (ngân hàng gửi MN)',
    '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ Internet Banking tại ngân hàng',
    '10': 'Giao dịch không thành công do: Khách hàng xác nhận hủy giao dịch',
    '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán',
    '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa',
    '13': 'Giao dịch không thành công do: Nhập sai mật khẩu xác thực giao dịch (OTP)',
    '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
    '51': 'Giao dịch không thành công do: Tài khoản không đủ số dư để thanh toán',
    '65': 'Giao dịch không thành công do: Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
    '75': 'Ngân hàng thanh toán đang bảo trì',
    '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định'
  };

  return codes[responseCode] || 'Lỗi không xác định';
}

export function isPaymentSuccessful(callback: PaymentCallback): boolean {
  return callback.vnp_ResponseCode === '00' && callback.vnp_TransactionStatus === '00';
}

export default {
  generateUUID,
  md5,
  sha256,
  hmacSHA512,
  createPaymentUrl,
  verifyCallback,
  getResponseCodeMessage,
  isPaymentSuccessful
};