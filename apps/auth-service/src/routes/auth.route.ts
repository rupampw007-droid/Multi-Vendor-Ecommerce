import express, { Router } from 'express';
import {
  addUserAddress,
  deleteUserAddress,
  getUser,
  getUserAddresses,
  refreshToken,
  createShop,
  loginUser,
  logoutUser,
  registerSeller,
  resetUserPassword,
  updateUserAddress,
  updateUserProfile,
  userForgotPassword,
  userRegestration,
  verifySeller,
  verifyUser,
  verifyUserForgotPassword,
  createStripeConnectLink,
  getStripeConnectStatus,
  loginSeller,
  getSeller,
  setDefaultUserAddress,
} from '../controllers/auth.controller';
import isAuthenticated from '@repo/middleware/isAuthenticated';
import { isSeller } from '@repo/middleware/authorizeRoles';

export const router: Router = express.Router();

router.post('/user-registration', userRegestration);
router.post('/verify-user', verifyUser);
router.post('/login-user', loginUser);
router.post('/refresh-token', refreshToken);
router.get('/logged-in-user', isAuthenticated, getUser);
router.patch('/user-profile', isAuthenticated, updateUserProfile);
router.post('/logout-user', logoutUser);
router
  .route('/user-addresses')
  .get(isAuthenticated, getUserAddresses)
  .post(isAuthenticated, addUserAddress);
router
  .route('/user-addresses/:id')
  .put(isAuthenticated, updateUserAddress)
  .delete(isAuthenticated, deleteUserAddress);
router.patch(
  '/user-addresses/:id/default',
  isAuthenticated,
  setDefaultUserAddress,
);
router.post('/forgot-password-user', userForgotPassword);
router.post('/reset-password-user', resetUserPassword);
router.post('/verify-forgot-password-user', verifyUserForgotPassword);
router.post('/seller-registration', registerSeller);
router.post('/verify-seller', verifySeller);
router.post('/create-shop', createShop);
router.get(
  '/stripe-connect-status',
  isAuthenticated,
  isSeller,
  getStripeConnectStatus,
);
router.post(
  '/create-stripe-link',
  isAuthenticated,
  isSeller,
  createStripeConnectLink,
);
router.post('/login-seller', loginSeller);
router.post('/logged-in-seller', isAuthenticated, isSeller, getSeller);
