import { NotFoundError, ValidationError } from '@repo/error-handler';
import { imagekit } from '@repo/lib/imagekit';
import prisma from '@repo/lib/prisma/prisma';
import { Request, Response, NextFunction } from 'express';

// Get product categories
export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const config = await prisma.site_config.findFirst();
    if (!config) {
      return res.status(404).json({
        message: 'Categories not fouond',
      });
    }

    return res.status(200).json({
      categories: config.categories,
      subCategories: config.subCategories,
    });
  } catch (error) {
    return next(error);
  }
};

// Create discount Codes
export const createDiscountCodes = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { public_name, discountType, discountValue, discountCode } = req.body;

    const isDiscountCodeExist = await prisma.discount_codes.findUnique({
      where: {
        discountCode,
      },
    });

    if (isDiscountCodeExist) {
      return next(
        new ValidationError(
          'Discount code already exists please use a different code!',
        ),
      );
    }
    const discount_code = await prisma.discount_codes.create({
      data: {
        public_name,
        discountType,
        discountValue: parseFloat(discountValue),
        discountCode,
        sellerId: req.seller.id,
      },
    });

    res.status(200).json({
      success: true,
      discount_code,
    });
  } catch (error) {
    next(error);
  }
};

// Get discount codes
export const getDiscountCodes = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const discount_code = await prisma.discount_codes.findMany({
      where: {
        sellerId: req.seller.id,
      },
    });

    res.status(201).json({
      success: true,
      discount_code,
    });
  } catch (error) {
    return next(error);
  }
};

// Delete discount code
export const deleteDiscountCode = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        const {id} = req.params;
        const sellerId = req.seller?.id

        const discountCode = await prisma.discount_codes.findUnique({
            where: {
                id
            },
            select: {
                id: true, sellerId: true
            }
        })
        if(!discountCode) {
            return next(new NotFoundError("Discount code not found!"))
        }

        if(discountCode.sellerId !== sellerId) {
            return next(new ValidationError("Unauthorized access!"))
        }

        await prisma.discount_codes.delete({where : {id}})

        return res.status(200).json({
            message: "Discount code successfully deleted"
        })
    } catch (error) {
        next(error)
    }
}

// Upload product image
export const uploadProductImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {fileName} = req.body;
    const response = await imagekit.files.upload({
      file: fileName,
      fileName: `product-${Date.now()}.jpg`,
      folder: '/products'
    });
    res.status(201).json({
      file_url: response.url,
      fileName: response.fileId
    })
  } catch (error) {
    next(error)
  }
}