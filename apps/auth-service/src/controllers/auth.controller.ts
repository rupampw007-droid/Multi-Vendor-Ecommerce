import { Request, Response, NextFunction } from 'express';
import {
  checkOtpRestrictions,
  sendOtp,
  trackOtpRequest,
  validateRegistrationData,
  verifyOtp,
} from '../utils/auth.helper';
import prisma from '@repo/lib/prisma/prisma';
import { AuthError, ValidationError } from '@repo/error-handler';
import bcrypt from 'bcryptjs'

// REGISTER A NEW USER

export const userRegestration = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    validateRegistrationData(req.body, 'user');
    const { name, email } = req.body;

    const existingUser = await prisma.users.findUnique({ where: { email } });

    if (existingUser) {
      throw new ValidationError('User already exist with this email');
    }

    await checkOtpRestrictions(email, next);
    await trackOtpRequest(email, next);
    await sendOtp(name, email, 'user-activation-mail');

    res.status(200).json({
      message: 'OTP sent to email. Please verify your account',
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, otp, password, name } = req.body;
    if (!email || !otp || !password || !name) {
      return next(new ValidationError('All fields are required!'));
    }
    const existingUser = await prisma.users.findUnique({where: {email}})

    if(existingUser) {
        return new ValidationError("User already exists with this email")
    }

    await verifyOtp(email, otp, next);
    const hashedPassword = await bcrypt.hash(password, 10)
    await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
      }
    })
    res.status(201).json({
      success : true,
      message : "User registered successfully"
    })
  } catch (err) {
    return next(err)
  }
};

export const loginUser = async(req: Request, res: Response, next: NextFunction) {
  try {
    const {email, password} = req.body;

    if(!email || !password) {
      throw new ValidationError('Email and Password are required')
    }
    const user = await prisma.users.findUnique({where: {email}})
    if(!user) {
      throw new AuthError("User doesn't exist")
    }
    //verify password
    const isMatch = await bcrypt.compare(password, user.password!)
    if(!isMatch) {
      throw new AuthError('Invalid Email or Password')
    }

    // Generate access and refresh token
    const accessToken = jwt
  } catch(err) {
    return next(err)
  }
}