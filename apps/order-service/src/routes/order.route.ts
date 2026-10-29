import express, { Router } from 'express';
import isAuthenticated from '@repo/middleware/isAuthenticated';
import {
  createPaymentIntent,
  createPaymentSession,
  getOrderDetails,
  getSellerOrderDetails,
  getSellerOrders,
  updateSellerOrderFulfillment,
  verifyingPaymentSession,
} from '../controllers/order.controller';
import { isSeller } from '@repo/middleware/authorizeRoles';

const router: Router = express.Router();

router.post('/create-payment-session', isAuthenticated, createPaymentSession);
router.post('/create-payment-intent', isAuthenticated, createPaymentIntent);
router.get('/verify-payment-session', isAuthenticated, verifyingPaymentSession);
router.get('/get-seller-orders', isAuthenticated, isSeller, getSellerOrders);
router.get(
  '/get-seller-orders/:id',
  isAuthenticated,
  isSeller,
  getSellerOrderDetails,
);
router.patch(
  '/get-seller-orders/:id/fulfillment',
  isAuthenticated,
  isSeller,
  updateSellerOrderFulfillment,
);
router.get(
  '/get-order-details/:id',
  isAuthenticated,
  getOrderDetails
)
export default router;