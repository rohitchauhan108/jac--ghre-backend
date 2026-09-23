import { Request, Response, NextFunction } from 'express';
import { Order } from '../models/Order.js';
import { getPaymentStatus } from '../payment.js';
import { sendOrderConfirmationEmail } from '../email.js';

// Send the confirmation email only the first time an order flips to "paid".
const notifyIfNewlyPaid = async (previousStatus: string | undefined, order: { paymentStatus: string; toObject: () => any }) => {
  if (order.paymentStatus === 'paid' && previousStatus !== 'paid') {
    await sendOrderConfirmationEmail(order.toObject()).catch(() => {});
  }
};

export const handleCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = String(req.query.orderId || '');
    if (!orderId) return res.status(400).json({ message: 'Missing orderId' });
    const existing = await Order.findOne({ orderId }).lean();
    const payment = await getPaymentStatus(orderId);
    const paid = payment.success && payment.code === 'PAYMENT_SUCCESS';
    const order = await Order.findOneAndUpdate({ orderId }, { paymentStatus: paid ? 'paid' : 'failed', phonePeProviderReference: payment.data?.transactionId }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    await notifyIfNewlyPaid(existing?.paymentStatus, order);
    res.json({ order, paid });
  } catch (error) { next(error); }
};

export const getPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await Order.findOne({ orderId: req.params.orderId }).lean();
    const payment = await getPaymentStatus(String(req.params.orderId));
    const paid = payment.success && payment.code === 'PAYMENT_SUCCESS';
    if (paid) {
      const order = await Order.findOneAndUpdate({ orderId: req.params.orderId }, { paymentStatus: 'paid', phonePeProviderReference: payment.data?.transactionId }, { new: true });
      if (order) await notifyIfNewlyPaid(existing?.paymentStatus, order);
    }
    res.json({ paid, status: payment.code });
  } catch (error) { next(error); }
};

export const handleProviderCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as { merchantTransactionId?: string; code?: string; data?: { transactionId?: string } };
    const orderId = body.merchantTransactionId || String(req.query.orderId || '');
    if (!orderId) return res.status(400).json({ message: 'Missing order reference' });
    const existing = await Order.findOne({ orderId }).lean();
    const paid = body.code === 'PAYMENT_SUCCESS';
    const order = await Order.findOneAndUpdate({ orderId }, { paymentStatus: paid ? 'paid' : 'failed', phonePeProviderReference: body.data?.transactionId }, { new: true });
    if (order) await notifyIfNewlyPaid(existing?.paymentStatus, order);
    res.json({ received: true });
  } catch (error) { next(error); }
};