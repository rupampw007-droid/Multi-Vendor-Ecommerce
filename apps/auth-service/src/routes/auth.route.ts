import express, { Router } from "express";
import { userRegestration } from "../controllers/auth.controller";

export const router: Router = express.Router();

router.post('/user-registration', userRegestration)
