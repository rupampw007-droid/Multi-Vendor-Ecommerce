import express, { Router } from 'express';
import isAuthenticated from '@repo/middleware/isAuthenticated';
import {
  createPaymentIntent,
  createPaymentSession,
  verifyingPaymentSession,
} from '../controllers/order.controller';

const router: Router = express.Router();

router.post('/create-payment-session', isAuthenticated, createPaymentSession);
router.post('/create-payment-intent', isAuthenticated, createPaymentIntent);
router.get('/verify-payment-session', isAuthenticated, verifyingPaymentSession);

export default router;