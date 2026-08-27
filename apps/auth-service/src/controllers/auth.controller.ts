import { Request, Response, NextFunction } from 'express';
import {
  checkOtpRestrictions,
  handleForgotPassword,
  sendOtp,
  trackOtpRequest,
  validateRegistrationData,
  verifyForgotPasswordOtp,
  verifyOtp,
} from '../utils/auth.helper';
import prisma from '@repo/lib/prisma/prisma';
import { AuthError, ValidationError } from '@repo/error-handler';
import bcrypt from 'bcryptjs';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { setCookie } from '../utils/cookies/setCookie';

// REGISTER A NEW USER

export const userRegestration = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    validateRegistrationData(req.body, 'user');
    const { name, email } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await prisma.users.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
      throw new ValidationError('User already exist with this email');
    }

    await checkOtpRestrictions(normalizedEmail);
    await trackOtpRequest(normalizedEmail);
    await sendOtp(name, normalizedEmail, 'user-activation-mail');

    return res.status(200).json({
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
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail || !otp || !password || !name) {
      return next(new ValidationError('All fields are required!'));
    }
    const existingUser = await prisma.users.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
      return next(new ValidationError('User already exists with this email'));
    }

    await verifyOtp(normalizedEmail, otp);
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.users.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
    });
  } catch (err) {
    console.log(err)
    return next(err);
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!normalizedEmail || !password) {
      throw new ValidationError('Email and Password are required');
    }
    const user = await prisma.users.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new AuthError("User doesn't exist");
    }
    //verify password
    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      throw new AuthError('Invalid Email or Password');
    }

    // Generate access and refresh token
    const accessToken = jwt.sign(
      { id: user.id, role: 'user' },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        role: 'user',
      },
      process.env.REFRESH_TOKEN_SECRET as string,
      {
        expiresIn: '7d',
      },
    );

    // Store the refresh and access token in an httpOnly secure cookie
    setCookie(res, 'refresh_token', refreshToken);
    setCookie(res, 'access_token', accessToken);

    res.status(200).json({
      message: 'Login Successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    return next(err);
  }
};

export const userForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await handleForgotPassword(req, res, next, 'user');
};

export const verifyUserForgotPassword = async(
  req:Request,
  res: Response,
  next: NextFunction
) => {
  await verifyForgotPasswordOtp(req,res,next);
}

// get logged in user
export const getUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    res.status(201).json({
      success: true,
      user,
    });
  } catch(err) {
    next(err)
  } 
}

export const refreshToken = async (req: Request, res: Response, next : NextFunction) => {
  try {
    const refreshToken = req.cookies.refresh_Token

    if(!refreshToken) {
      throw new ValidationError("Unauthorized! NO refresh token")
    }
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as {id: string, role : string}

    if(!decoded || !decoded.id || !decoded.role) {
      return new JsonWebTokenError('Forbidden! Invalid refresh token')
    }

    const user = await prisma.users.findUnique({
      where: {
        id : decoded.id
      }
    })

    if(!user) {
      return new AuthError("Forbidden! User/Seller not found")
    }

    const newAccessToken = jwt.sign({
      id : decoded.id, role: decoded.role
    },
  process.env.ACCESS_TOKEN_SECRET as string, {
    expiresIn: "15m"
  })
  setCookie(res, "access_token", newAccessToken)
  return res.status(201).json({
    success: true
  })
  } catch(err) {
    return next(err)
  }
}

export const resetUserPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, newPassword } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!normalizedEmail || !newPassword) {
      throw new ValidationError('Email and New Password are required!');
    }
    const user = await prisma.users.findUnique({ where: { email: normalizedEmail } });
    if (!user) return next(new ValidationError('User not found!'));

    //Compare new password with the existing one
    const isSamePassword = await bcrypt.compare(newPassword, user.password!);
    if (isSamePassword) {
      throw new ValidationError(
        'New password cannot be the same as old password',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.users.update({
      where: { email: user.email },
      data: { password: hashedPassword },
    });
    res.status(200).json({
      message: 'Password reset successfully!',
    });
  } catch (err) {
    next(err);
  }
};


// register a new seller
export const registerSeller = async(req : Request, res : Response, next: NextFunction) => {
  try {
    validateRegistrationData(req.body, "seller");
    const {name, email} = req.body
    
  } catch (error) {
    
  }
}