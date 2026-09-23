import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendContactFormEmail } from '../email.js';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short'),
  phone: z.string().trim().min(10, 'Phone number is too short'),
  email: z.string().email('Invalid email address').trim().optional().or(z.literal('')),
  inquiryType: z.string().trim().optional(),
  message: z.string().trim().min(10, 'Message is too short. Please share a few more details.')
});

export const submitContactForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = contactSchema.parse(req.body);
    const email = parsed.email ? parsed.email : undefined;
    await sendContactFormEmail({
      name: parsed.name,
      phone: parsed.phone,
      email,
      inquiryType: parsed.inquiryType,
      message: parsed.message
    });
    res.status(200).json({ ok: true, message: 'Message received. The Jac Ghré concierge team will reach out shortly.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map(i => i.message).join(' ');
      return res.status(400).json({ ok: false, message: message || 'Invalid form data.' });
    }
    next(error);
  }
};
