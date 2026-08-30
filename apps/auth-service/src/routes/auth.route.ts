import express, { Router } from "express";
import { getUser,  refreshToken, createShop, loginUser, registerSeller, resetUserPassword, userForgotPassword, userRegestration, verifySeller, verifyUser, verifyUserForgotPassword, createStripeConnectLink, loginSeller, getSeller } from "../controllers/auth.controller";
import isAuthenticated from "@repo/middleware/isAuthenticated";

export const router: Router = express.Router();

router.post('/user-registration', userRegestration);
router.post('/verify-user', verifyUser)
router.post('/login-user', loginUser)
router.post('/refresh-token-user', refreshToken)
router.get('/logged-in-user', isAuthenticated, getUser)
router.post('/forgot-password-user', userForgotPassword)
router.post('/reset-password-user', resetUserPassword)
router.post('/verify-forgot-password-user', verifyUserForgotPassword)
router.post("/seller-registration", registerSeller)
router.post('/verify-seller', verifySeller)
router.post('/create-shop', createShop)
router.post('/create-stripe-link', createStripeConnectLink);
router.post('/login-seller', loginSeller)
router.post('/logged-in-seller', getSeller)