import { Resend } from 'resend';
import { config } from './config.js';

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;
export const emailConfigured = Boolean(resend);

type OrderItem = { name: string; weight: string; unitPrice: number; quantity: number };
type OrderForEmail = {
  orderId: string;
  customer: { customerName: string; email: string };
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
};

const rupee = (value: number) => `₹${value.toFixed(0)}`;

const orderItemsHtml = (items: OrderItem[]) =>
  items
    .map(
      item => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #EAE1D0;">${item.name} (${item.weight})</td>
          <td style="padding:8px 0;border-bottom:1px solid #EAE1D0;text-align:center;">x${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #EAE1D0;text-align:right;">${rupee(item.unitPrice * item.quantity)}</td>
        </tr>`
    )
    .join('');

const wrap = (title: string, bodyHtml: string) => `
  <div style="font-family:Georgia,serif;background:#FAF7F0;padding:32px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EAE1D0;">
      <div style="background:#097B8A;color:#FAF7F0;padding:24px 28px;">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D4AF37;font-weight:bold;">Jac Ghré</div>
        <h1 style="margin:6px 0 0;font-size:20px;">${title}</h1>
      </div>
      <div style="padding:24px 28px;color:#097B8A;">${bodyHtml}</div>
      <div style="padding:16px 28px;background:#FAF7F0;color:#5E6E64;font-size:12px;">
        Need help? Reply to this email or reach out via our website.
      </div>
    </div>
  </div>`;

export const sendOrderConfirmationEmail = async (order: OrderForEmail): Promise<void> => {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping order confirmation email for', order.orderId);
    return;
  }
  const paymentLine =
    order.paymentMethod === 'cod'
      ? 'Cash on Delivery — pay when your order arrives.'
      : order.paymentStatus === 'paid'
      ? 'Payment received via PhonePe. Thank you!'
      : 'Payment pending — complete it via the PhonePe link sent to you.';

  const html = wrap(
    'Order Confirmed',
    `
      <p>Namaste ${order.customer.customerName},</p>
      <p>Thank you for your order! Here's a quick summary:</p>
      <p style="font-weight:bold;">Order ID: ${order.orderId}</p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left;padding-bottom:6px;border-bottom:2px solid #103C26;">Item</th>
            <th style="text-align:center;padding-bottom:6px;border-bottom:2px solid #103C26;">Qty</th>
            <th style="text-align:right;padding-bottom:6px;border-bottom:2px solid #103C26;">Amount</th>
          </tr>
        </thead>
        <tbody>${orderItemsHtml(order.items)}</tbody>
      </table>
      <table style="width:100%;font-size:14px;margin-top:8px;">
        <tr><td>Subtotal</td><td style="text-align:right;">${rupee(order.subtotal)}</td></tr>
        <tr><td>Shipping</td><td style="text-align:right;">${order.shipping === 0 ? 'Free' : rupee(order.shipping)}</td></tr>
        ${order.discount ? `<tr><td>Discount</td><td style="text-align:right;">-${rupee(order.discount)}</td></tr>` : ''}
        <tr style="font-weight:bold;"><td style="padding-top:6px;border-top:1px solid #EAE1D0;">Total</td><td style="text-align:right;padding-top:6px;border-top:1px solid #EAE1D0;">${rupee(order.total)}</td></tr>
      </table>
      <p style="margin-top:16px;">${paymentLine}</p>
      <p>We'll notify you again once your order ships. You can also track it anytime from your account.</p>
    `
  );

  try {
    await resend.emails.send({
      from: config.resendFromEmail,
      to: order.customer.email,
      subject: `Order Confirmed — ${order.orderId} | Jac Ghré`,
      html
    });
  } catch (error) {
    console.error('[email] Failed to send order confirmation email:', error);
  }
};

export const sendWelcomeEmail = async (to: string, name: string): Promise<void> => {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping welcome email for', to);
    return;
  }
  const html = wrap(
    'Welcome to Jac Ghré',
    `<p>Dear ${name},</p><p>Your Jac Ghré account is ready. Explore our luxury botanical hair rituals, shimmering sun oils, and signature haute parfumerie. Enjoy faster checkout and live order tracking.</p>`
  );
  try {
    await resend.emails.send({
      from: config.resendFromEmail,
      to,
      subject: 'Welcome to Jac Ghré',
      html
    });
  } catch (error) {
    console.error('[email] Failed to send welcome email:', error);
  }
};

export const sendVerificationEmail = async (to: string, name: string, code: string): Promise<void> => {
  if (!resend) throw new Error('Email verification is not configured. Add RESEND_API_KEY to the backend environment.');
  const html = wrap(
    'Verify your Jac Ghré account',
    `<p>Dear ${name},</p><p>Use this one-time verification code to finish creating your Jac Ghré account:</p><p style="font-size:32px;letter-spacing:8px;font-weight:bold;text-align:center;color:#097B8A;margin:24px 0;">${code}</p><p>This code expires in 10 minutes. If you did not request an account, you can ignore this email.</p>`
  );
  await resend.emails.send({
    from: config.resendFromEmail,
    to,
    subject: 'Verify your Jac Ghré account',
    html
  });
};

export const sendPasswordResetEmail = async (to: string, name: string, code: string): Promise<void> => {
  if (!resend) throw new Error('Password reset email is not configured. Add RESEND_API_KEY to the backend environment.');
  const html = wrap(
    'Reset your Jac Ghré password',
    `<p>Dear ${name},</p><p>Use this one-time code to reset your Jac Ghré password:</p><p style="font-size:32px;letter-spacing:8px;font-weight:bold;text-align:center;color:#097B8A;margin:24px 0;">${code}</p><p>This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.</p>`
  );
  await resend.emails.send({
    from: config.resendFromEmail,
    to,
    subject: 'Reset your Jac Ghré password',
    html
  });
};

export const CONTACT_INBOX = process.env.CONTACT_INBOX || 'Ghrebeauty@gmail.com';

export type ContactFormPayload = {
  name: string;
  phone: string;
  email?: string;
  inquiryType?: string;
  message: string;
};

export const sendContactFormEmail = async (payload: ContactFormPayload): Promise<void> => {
  if (!resend) {
    throw new Error('Contact form email is not configured. Add RESEND_API_KEY to the backend environment.');
  }
  const replyTo = payload.email?.trim()
    ? `${payload.name} <${payload.email.trim()}>`
    : undefined;

  const subjectLine = `[${payload.inquiryType || 'Contact Form'}] New message from ${payload.name}`;
  const html = wrap(
    subjectLine,
    `
      <p><strong>Name:</strong> ${payload.name}</p>
      <p><strong>Phone:</strong> ${payload.phone}</p>
      ${payload.email ? `<p><strong>Email:</strong> ${payload.email}</p>` : ''}
      <p><strong>Inquiry Type:</strong> ${payload.inquiryType || 'General'}</p>
      <p style="margin-top:20px;padding:16px;background:#FAF7F0;border-radius:12px;border:1px solid #EAE1D0;white-space:pre-wrap;">${payload.message}</p>
    `
  );

  await resend.emails.send({
    from: config.resendFromEmail,
    to: CONTACT_INBOX,
    subject: subjectLine,
    replyTo: replyTo,
    html
  });
};
