import { ValidationError } from '@repo/error-handler';
import redis from '@repo/lib/redis';
import crypto from 'crypto';
import { sendEmail } from './sendMail';
import { Request,Response, NextFunction } from 'express';
import prisma from '@repo/lib/prisma/prisma';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegistrationData = (
  data: any,
  userType: 'user' | 'seller',
) => {
  const { name, password, email, phone_number, country } = data;

  if (
    !name ||
    !email ||
    !password ||
    (userType === 'seller' && (!phone_number || !country))
  ) {
    throw new ValidationError('Missing Required Fields');
  }
  if(!emailRegex.test(email)) {
    throw new ValidationError('Invalid Email Format')
  }
};

export const checkOtpRestrictions = async (email: string, next : NextFunction) => {
  if(await redis.get(`otp_lock:${email}`)) {
    return next(
      new ValidationError(
        "Account Locked due to multiple failed attempts! Try again after 30 minutes"
      )
    );
  }
  if(await redis.get(`otp_spam_lock:${email}`)) {
    return next(
      new ValidationError("Too many OTP requests! Please wait 1 hour before requesting again")
    )
  }
  if(await redis.get(`otp_cooldown:${email}`)) {
    return next(
      new ValidationError("Please wait 1 minute before requesting a new OTP!")
    )
  }
}

export const trackOtpRequest = async (email: string, next: NextFunction) => {
  const otpRequestKey = `otp_request_count:${email}`
  const otpRequests = parseInt((await redis.get(otpRequestKey)) || "0")

  if(otpRequests >= 2) {
    await redis.set(`otp_spam_lock:${email}`, "locked", "EX", 3600)  // Locks for 1 hour
    return next(
      new ValidationError("Too many OTP requests. Please wait 1 hour before requesting again")
    )
  }
  await redis.set(otpRequestKey, otpRequests+1, "EX", 3600);  //Tracking Requsts
}

export const sendOtp = async (name: string, email: string, template: string) => {
  const otp = crypto.randomInt(1000, 9999).toString();
  await sendEmail(email, "Verify Your Email", template, {name, otp})
  await redis.set(`otp:${email}`, otp, "EX", 300);
  await redis.set(`otp_cooldown:${email}`, "true", "EX", 60);
}

export const verifyOtp = async (email:string, otp: string, next: NextFunction) => {
  if(await redis.get(`otp_lock:${email}`)) {
    throw new ValidationError(`Too many Incorrect Attempts! Please try again later`)
  }
  const storedOtp = await redis.get(`otp:${email}`);
  if(!storedOtp) {
    throw new ValidationError("Invalid or expired OTP!")
  }
  const failedAttemptsKey = `otp_attempts:${email}`
  const failedAttempts    = parseInt((await redis.get(failedAttemptsKey)) || "0")

  if(storedOtp !== otp) {
    if(failedAttempts >= 2) {
      await redis.set(`otp_lock:${email}`, "locked", "EX" , 1800);
      await redis.del(`otp_attempts:${email}`, failedAttemptsKey)
      throw new ValidationError("Too many failed attemps. Your account is locked for 30 minutes")
    } else {
      await redis.set(`otp_attempts:${email}`, failedAttempts+1, "EX", 300);
      throw new ValidationError(`Incorrect OTP. ${2-failedAttempts} attempts left`)
    }
  }
  await redis.del(`otp:${email}`, failedAttemptsKey);
  next();

}

export const handleForgotPassword = async (req: Request, res: Response, next: NextFunction, userType: "user"|"seller") => {
  try {
    const {email} = req.body

    if(!email) {
      throw new ValidationError("Email is required!")
    } 

    // Find user/seller in DB
    const user = userType === "user" ? await prisma.users.findUnique({where: {email}}) : null
    if(!user) {
      throw new ValidationError(`${userType} not found`)
    }

    //Check otp restrictions
    await checkOtpRestrictions(email,next)
    await trackOtpRequest(email, next)

    // Generate OTP and send to Email
    await sendOtp(email, user.name, 'forgot-password-user-mail')
    res.status(200).json({
      message: "OTP sent to email. Please verify your account"
    })

  } catch(err) {
    next(err)
  }
}

export const verifyForgotPasswordOtp = async(req:Request, res: Response, next:NextFunction) => {
  try {
    const {email, otp} = req.body;
    if(!email || !otp) {
      throw new ValidationError('Email and OTP are required')
    }
    await verifyOtp(email, otp, next)
    res.status(200).json({
      message: "OTP verified! You can now reset your password"
    })
  } catch (err) {
    next(err)
  }
}