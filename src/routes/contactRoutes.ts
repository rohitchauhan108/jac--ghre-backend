import { Router } from 'express';
import { submitContactForm } from '../controllers/contactController.js';
import { contactLimiter } from '../app.js';

const router = Router();

router.post('/', contactLimiter, submitContactForm);

export default router;
