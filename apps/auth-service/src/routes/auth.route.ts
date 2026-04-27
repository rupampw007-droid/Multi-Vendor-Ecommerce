import express, { Router } from "express";
import { userRegestration, verifyUser } from "../controllers/auth.controller";

export const router: Router = express.Router();

router.post('/user-registration', userRegestration);
router.post('/verify-user', verifyUser)
