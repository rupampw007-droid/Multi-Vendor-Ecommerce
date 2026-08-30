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
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-08-26.dahlia',
});

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
    console.log(err);
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

export const verifyUserForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await verifyForgotPasswordOtp(req, res, next);
};

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
export const registerSeller = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    validateRegistrationData(req.body, 'seller');
    const { name, email } = req.body;

    const existingSeller = await prisma.sellers.findUnique({
      where: { email },
    });
    if (existingSeller) {
      throw new ValidationError('Seller already exists with this email');
    }
    await checkOtpRestrictions(email);
    await trackOtpRequest(email);
    await sendOtp(name, email, 'seller-activation');

    res.status(200).json({
      message: 'Otp sent to your email, please verify your account',
    });
  } catch (error) {
    next(error);
  }
};

// verify seller with otp
export const verifySeller = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, otp, password, name, phone_number, country } = req.body;
    if (!email || !otp || !password || !name || !phone_number || !country) {
      return next(new ValidationError('All fields are required'));
    }

    const existingSeller = await prisma.sellers.findUnique({
      where: { email },
    });

    if (existingSeller) {
      return next(new ValidationError('Seller already exists with this email'));
    }

    await verifyOtp(email, otp);
    const hashedPassword = await bcrypt.hash(password, 10);

    const seller = await prisma.sellers.create({
      data: {
        name,
        email,
        password: hashedPassword,
        country,
        phone_number,
      },
    });
    res
      .status(201)
      .json({ seller, message: 'Seller registered successfully!' });
  } catch (error) {
    next(error);
  }
};

// create a new shop
export const createShop = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, bio, address, opening_hours, website, category, sellerId } =
      req.body;

    if (
      !name ||
      !bio ||
      !address ||
      !opening_hours ||
      !website ||
      !category ||
      !sellerId
    ) {
      return next(new ValidationError('All fields are required'));
    }

    const shopData = {
      name,
      bio,
      address,
      opening_hours,
      category,
      sellerId,
      website,
    };

    if (website && website.trim() !== '') {
      shopData.website = website;
    }

    const shop = await prisma.shops.create({
      data: shopData,
    });

    res.status(201).json({
      success: true,
      shop,
    });
  } catch (error) {
    next(error);
  }
};

// create stripe connect account link
export const createStripeConnectLink = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sellerId } = req.body;
    if (!sellerId) return next(new ValidationError('Seller Id is required'));
    const seller = await prisma.sellers.findUnique({
      where: {
        id: sellerId,
      },
    });
    if (!seller) {
      return next(new ValidationError('Seller is not available with this ID'));
    }

    const account = await stripe.account.create({
      type: 'express',
      email: seller?.email,
      country: 'GB',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    await prisma.sellers.update({
      where: {
        id: sellerId,
      },
      data: {
        stripeId: account.id,
      },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `http://localhost:3000/success`,
      return_url: `http://localhost:3000/success`,
      type: 'account_onboarding',
    });

    res.json({
      url: accountLink.url,
    });
  } catch (error) {
    return next(error);
  }
};

//loginSeller
export const loginSeller = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return next(new ValidationError('Email and password are requried!'));

    const seller = await prisma.sellers.findUnique({ where: { email } });
    if (!seller) return next(new ValidationError('Invalid email or password!'));

    //verify password
    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      return next(new ValidationError('Invalid email or password'));
    }
    const accessToken = jwt.sign(
      {
        id: seller.id,
        role: 'seller',
      },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign({
      id: seller.id,
      role: 'seller',
    },
  process.env.REFRESH_TOKEN_SECRET as string,
  {expiresIn: '7d'}
);

// store refresh token 
  setCookie(res, 'seller-refresh-token', refreshToken)
  setCookie(res, 'seller-access-token', accessToken)
  } catch (error) {
    next(error)
  }
};

// Get logged in seller
export const getSeller = async(
  req: any, res: Response, next: NextFunction
) => {
  try {
    const seller = req.seller;
    res.status(201).json({
      success: true,
      seller
    })
  } catch(error) {
    next(error)
  }
};
