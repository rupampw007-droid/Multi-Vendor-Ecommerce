import express, { Router } from "express";
import { loginUser, resetUserPassword, userForgotPassword, userRegestration, verifyUser, verifyUserForgotPassword } from "../controllers/auth.controller";

export const router: Router = express.Router();

router.post('/user-registration', userRegestration);
router.post('/verify-user', verifyUser)
router.post('/login-user', loginUser)
router.post('/forgot-password-user', userForgotPassword)
router.post('/reset-password-user', resetUserPassword)
router.post('/verify-forgot-password-user', verifyUserForgotPassword)
