import prisma from "@repo/lib/prisma/prisma";
import cron from "node-cron";

cron.schedule("0 * * * *", async () => {
    try {
        const products = await prisma.products.findMany({
            where: {
                isDeleted: true,
                deletedAt: {
                    lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                },
            },
        }); 
    } catch (error) {
        console.error("Error while deleting products:", error);
    }
});