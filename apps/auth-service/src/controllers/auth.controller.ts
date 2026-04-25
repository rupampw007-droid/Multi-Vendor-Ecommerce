import {Request, Response , NextFunction} from 'express'
import { validateRegistrationData } from '../utils/auth.helper'
import { PrismaClient } from '@multivendor-ecommerce/generated/prisma/client'

const prisma = new PrismaClient()

// REGISTER A NEW USER

export const userRegestration = async(req:Request, res: Response, next: NextFunction) => {
    validateRegistrationData(req.body, "user")
    const {name, email} = req.body

    const existingUser = await 
}