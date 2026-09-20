import prisma from '@repo/lib/prisma/prisma'

export const initializeSiteConfig = async () => {
    try {
        const existingConfig = await prisma.site_config.findFirst();
        if (!existingConfig) {
            await prisma.site_config.create({
                data: {
                    categories: [
                        "Electronics",
                        "Fashion",
                        "Home & Kitchen",
                        "Sports & Fitness"
                    ],
                    subCategories: {
                        "Electronics": [
                            "Mobile Phones",
                            "Laptops",
                            "Tablets",
                            "Headphones & Earbuds",
                            "Smart Watches",
                            "Cameras",
                            "Gaming Consoles",
                            "Televisions",
                            "Speakers & Soundbars",
                            "Accessories"
                        ],
                        "Fashion": [
                            "Men's Clothing",
                            "Women's Clothing",
                            "Kids' Clothing",
                            "Footwear",
                            "Bags & Luggage",
                            "Watches",
                            "Jewelry",
                            "Sunglasses & Eyewear",
                            "Winter Wear",
                            "Ethnic Wear"
                        ],
                        "Home & Kitchen": [
                            "Furniture",
                            "Home Decor",
                            "Bedding & Linen",
                            "Kitchen Appliances",
                            "Cookware & Bakeware",
                            "Dinnerware & Serveware",
                            "Storage & Organization",
                            "Lighting",
                            "Cleaning Supplies",
                            "Garden & Outdoor"
                        ],
                        "Sports & Fitness": [
                            "Gym Equipment",
                            "Yoga & Pilates",
                            "Cycling",
                            "Running & Jogging",
                            "Team Sports",
                            "Outdoor & Camping",
                            "Swimming",
                            "Sports Apparel",
                            "Sports Footwear",
                            "Nutrition & Supplements"
                        ]
                    }
                }
            })
        }
    } catch (error) {
        console.log("Error initialising site config: " , error)
    }
}

