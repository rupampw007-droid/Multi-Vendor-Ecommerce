import prisma from "@repo/lib/prisma/prisma"
import { Request, Response, NextFunction } from "express"

// Get product categories
export const getCategories = async (req: Request, res : Response, next: NextFunction) => {
    try {
        const config = await prisma.site_config.findFirst();
        if(!config) {
            return res.status(404).json({
                message : "Categories not fouond"
            })
        }

        return res.status(200).json({
            categories: config.categories,
            subCategories: config.subCategories
        })
    } catch (error) {
        return next(error)
    }
}