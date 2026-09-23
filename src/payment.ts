import crypto from 'node:crypto';
import { config } from './config.js';

type PhonePePaymentResponse = {
  success: boolean;
  message?: string;
  data?: { instrumentResponse?: { redirectInfo?: { url?: string } } };
};

const isConfigured = Boolean(config.phonePeMerchantId && config.phonePeSaltKey);
const signature = (value: string) => {
  return `${crypto.createHash('sha256').update(value + config.phonePeSaltKey).digest('hex')}###${config.phonePeSaltIndex}`;
};

const phonePeRequest = async <T>(path: string, init: RequestInit): Promise<T> => {
  const response = await fetch(`${config.phonePeBaseUrl}${path}`, init);
  const body = await response.json() as T;
  if (!response.ok) throw new Error(`PhonePe request failed with status ${response.status}`);
  return body;
};

export const createPaymentOrder = async (amount: number, merchantTransactionId: string, customerPhone: string) => {
  if (!isConfigured) throw new Error('PhonePe is not configured. Add PHONEPE_MERCHANT_ID and PHONEPE_SALT_KEY.');
  const payload = {
    merchantId: config.phonePeMerchantId,
    merchantTransactionId,
    merchantUserId: merchantTransactionId,
    amount: Math.round(amount * 100),
    redirectUrl: `${config.frontendUrl}/payment/callback?orderId=${encodeURIComponent(merchantTransactionId)}`,
    redirectMode: 'REDIRECT',
    callbackUrl: `${config.apiPublicUrl}/api/payments/callback?orderId=${encodeURIComponent(merchantTransactionId)}`,
    mobileNumber: customerPhone.replace(/\D/g, '').slice(-10),
    paymentInstrument: { type: 'PAY_PAGE' }
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const result = await phonePeRequest<PhonePePaymentResponse>('/pg/v1/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-VERIFY': signature(encodedPayload + '/pg/v1/pay') },
    body: JSON.stringify({ request: encodedPayload })
  });
  const redirectUrl = result.data?.instrumentResponse?.redirectInfo?.url;
  if (!result.success || !redirectUrl) throw new Error(result.message || 'PhonePe could not create the payment session.');
  return { redirectUrl };
};

export const getPaymentStatus = async (merchantTransactionId: string) => {
  if (!isConfigured) throw new Error('PhonePe is not configured.');
  const path = `/pg/v1/status/${config.phonePeMerchantId}/${merchantTransactionId}`;
  return phonePeRequest<{ success: boolean; code?: string; data?: { transactionId?: string } }>(path, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'X-VERIFY': signature(path) }
  });
};

export const phonePeConfigured = isConfigured;
