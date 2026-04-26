import {Request, Response , NextFunction} from 'express'
import { checkOtpRestrictions, sendOtp, trackOtpRequest, validateRegistrationData } from '../utils/auth.helper'
import prisma from '@repo/lib/prisma/prisma'
import { ValidationError } from '@repo/error-handler'

// REGISTER A NEW USER

export const userRegestration = async(req:Request, res: Response, next: NextFunction) => {
    try {
        validateRegistrationData(req.body, "user")
        const {name, email} = req.body
    
        const existingUser = await prisma.users.findUnique({where :{ email}})
    
        if(existingUser) {
            throw new ValidationError('User already exist with this email')
        } 
    
        await checkOtpRestrictions(email, next);
        await trackOtpRequest(email, next);
        await sendOtp(name, email, "user-activation-mail");
    
        res.status(200).json({
            message: "OTP sent to email. Please verify your account"
        }) 
    } catch (error) {
        return next(error)
    }
}