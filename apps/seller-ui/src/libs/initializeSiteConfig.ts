import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();

const initialiseConfig = async () => {
    try {
        const existingConfig = await prisma.site_configs
    } catch (error) {
        
    }
}