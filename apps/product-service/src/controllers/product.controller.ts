import { Prisma } from '@multivendor-ecommerce/generated/prisma/client';
import { AuthError, NotFoundError, ValidationError } from '@repo/error-handler';
import { imagekit } from '@repo/lib/imagekit';
import prisma from '@repo/lib/prisma/prisma';
import { Request, Response, NextFunction } from 'express';

const parseQueryList = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((item) => (typeof item === 'string' ? item.split(',') : []))
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseNumberRange = (
  value: unknown,
  defaultRange: [number, number],
  fieldName: string,
): [number, number] => {
  if (value === undefined) {
    return defaultRange;
  }

  const values =
    typeof value === 'string'
      ? value.split(',')
      : Array.isArray(value)
        ? value
        : [];
  const range = values.map((item) =>
    typeof item === 'string' ? Number(item) : Number.NaN,
  );

  if (
    range.length !== 2 ||
    range.some((number) => !Number.isFinite(number)) ||
    range[0] < 0 ||
    range[0] > range[1]
  ) {
    throw new ValidationError(
      `${fieldName} must contain a valid minimum and maximum`,
    );
  }

  return [range[0], range[1]];
};

const parsePagination = (
  req: Request,
  defaultLimit: number,
): { page: number; limit: number; skip: number } => {
  const parseValue = (value: unknown, fallback: number, fieldName: string) => {
    if (value === undefined) {
      return fallback;
    }

    const parsed = typeof value === 'string' ? Number(value) : Number.NaN;
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new ValidationError(`${fieldName} must be a positive integer`);
    }

    return parsed;
  };

  const page = parseValue(req.query.page, 1, 'page');
  const limit = parseValue(req.query.limit, defaultLimit, 'limit');

  if (limit > 100) {
    throw new ValidationError('limit cannot exceed 100');
  }

  return { page, limit, skip: (page - 1) * limit };
};

const parseOptionalDate = (
  value: unknown,
  fieldName: string,
): Date | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }

  return date;
};

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
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const sellerId = req.seller?.id;

    const discountCode = await prisma.discount_codes.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        sellerId: true,
      },
    });
    if (!discountCode) {
      return next(new NotFoundError('Discount code not found!'));
    }

    if (discountCode.sellerId !== sellerId) {
      return next(new ValidationError('Unauthorized access!'));
    }

    await prisma.discount_codes.delete({ where: { id } });

    return res.status(200).json({
      message: 'Discount code successfully deleted',
    });
  } catch (error) {
    next(error);
  }
};

// Upload product image
export const uploadProductImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fileName } = req.body;
    const response = await imagekit.files.upload({
      file: fileName,
      fileName: `product-${Date.now()}.jpg`,
      folder: '/products',
    });
    res.status(201).json({
      file_url: response.url,
      fileId: response.fileId,
    });
  } catch (error) {
    next(error);
  }
};

// delete product image
export const deleteProductImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fileId } = req.body;
    const response = await imagekit.files.delete(fileId);

    res.status(201).json({
      success: true,
      response,
    });
  } catch (error) {
    next(error);
  }
};

// create product
const parseJsonValue = <T>(value: unknown, fallback: T): T => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  return (value ?? fallback) as T;
};

export const createProduct = async (
  req: Request & { seller?: { id?: string; shop?: { id?: string } } },
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body ?? {};
    const {
      title,
      short_description,
      detailed_description,
      warranty,
      custom_specifications,
      slug,
      tags,
      cash_on_delivery,
      status,
      brand,
      video_url,
      category,
      colors = [],
      sizes = [],
      discountCodes,
      stock,
      sale_price,
      regular_price,
      subCategory: subCategoryValue,
      subcategory,
      customProperties: customPropertiesValue,
      custom_properties,
      discount_codes,
      images = [],
      id,
    } = body;
    const subCategory = subCategoryValue ?? subcategory;
    const customProperties = customPropertiesValue ?? custom_properties ?? {};
    const submittedDiscountCodes = discountCodes ?? discount_codes;
    const isDraft = status === 'draft';

    const normalizedColors = Array.isArray(colors)
      ? colors
      : parseJsonValue<string[]>(colors, []);
    const normalizedSizes = Array.isArray(sizes)
      ? sizes
      : parseJsonValue<string[]>(sizes, []);
    const normalizedDiscountCodes = Array.isArray(discountCodes)
      ? discountCodes
      : parseJsonValue<string[]>(submittedDiscountCodes, []);
    const normalizedImages = Array.isArray(images)
      ? images
      : parseJsonValue<any[]>(images, []);
    const normalizedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
        ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [];
    const normalizedCustomSpecifications = parseJsonValue<any>(
      custom_specifications,
      {},
    );
    const normalizedCustomProperties = parseJsonValue<any>(
      customProperties,
      {},
    );

    if (!title) {
      return next(new ValidationError('Product title is required'));
    }

    if (
      !isDraft && (
      !title ||
      !short_description ||
      !detailed_description ||
      !warranty ||
      !slug ||
      !category ||
      !stock ||
      !sale_price ||
      !regular_price ||
      !subCategory ||
      !normalizedImages.length
      )
    ) {
      return next(new ValidationError('Missing required fields'));
    }

    if (!req.seller?.id) {
      return next(new AuthError('Only seller can create products!'));
    }

    if (!req.seller?.shop?.id) {
      return next(new ValidationError('Seller shop not found!'));
    }

    const discountCodeRecords = normalizedDiscountCodes.length
      ? await prisma.discount_codes.findMany({
          where: {
            sellerId: req.seller.id,
            discountCode: { in: normalizedDiscountCodes.map(String) },
          },
          select: { id: true, discountCode: true },
        })
      : [];

    if (discountCodeRecords.length !== normalizedDiscountCodes.length) {
      return next(new ValidationError('One or more discount codes are invalid'));
    }

    const normalizedDiscountCodeIds = discountCodeRecords.map(
      (discountCode) => discountCode.id,
    );

    const existingProduct = id
      ? await prisma.products.findFirst({
          where: { id: String(id), shopId: req.seller.shop.id },
        })
      : null;

    if (id && (!existingProduct || existingProduct.status !== 'Draft')) {
      return next(new NotFoundError('Draft product not found'));
    }

    const productSlug = String(
      slug || existingProduct?.slug || `draft-${req.seller.id}-${Date.now()}`,
    );
    const slugChecking = await prisma.products.findUnique({
      where: { slug: productSlug },
    });

    if (slugChecking && slugChecking.id !== existingProduct?.id) {
      return next(
        new ValidationError('Slug already exist! Please use a different slug'),
      );
    }

    const productStatus: 'Draft' | 'Pending' | 'Active' =
      status === 'draft'
        ? 'Draft'
        : status === 'pending'
          ? 'Pending'
          : 'Active';

    const createdImages = await Promise.all(
      normalizedImages.map(async (image: any) => {
        const fileId = image?.fileId || image?.file_id || image?.id;
        const url = image?.file_url || image?.url;

        if (!fileId || !url) {
          return null;
        }

        const existingImage = await prisma.images.findFirst({
          where: { file_id: String(fileId) },
          select: { id: true },
        });

        if (existingImage) {
          await prisma.images.update({
            where: { id: existingImage.id },
            data: { url: String(url) },
          });
          return existingImage.id;
        }

        const createdImage = await prisma.images.create({
          data: {
            file_id: String(fileId),
            url: String(url),
          },
        });
        return createdImage.id;
      }),
    );

    const validImageIds = createdImages.filter(
      (imageId): imageId is string => Boolean(imageId),
    );

    const productData = {
      title: String(title),
      short_description: String(short_description ?? ''),
      detailed_description: String(detailed_description ?? ''),
      warranty: warranty ? String(warranty) : null,
      custom_specifications: normalizedCustomSpecifications,
      slug: productSlug,
      tags: normalizedTags.join(','),
      cashOnDelivery: String(cash_on_delivery ?? 'no'),
      brand: brand ? String(brand) : null,
      video_url: video_url ? String(video_url) : null,
      category: String(category ?? ''),
      colors: normalizedColors.map(String),
      sizes: normalizedSizes.map(String),
      stock: Number(stock) || 0,
      sale_price: Number(sale_price) || 0,
      regular_price: Number(regular_price) || 0,
      subCategory: String(subCategory ?? ''),
      custom_properties: normalizedCustomProperties,
      discount_codes: normalizedDiscountCodeIds,
      status: productStatus,
    };

    const newProduct = existingProduct
      ? await prisma.products.update({
          where: { id: existingProduct.id },
          data: {
            ...productData,
            images: { set: validImageIds.map((imageId) => ({ id: imageId })) },
          },
        })
      : await prisma.products.create({
          data: {
            ...productData,
            shopId: req.seller.shop.id,
            images: { connect: validImageIds.map((imageId) => ({ id: imageId })) },
          },
        });

    return res.status(201).json({
      success: true,
      product: newProduct,
    });
  } catch (error) {
    return next(error);
  }
};

// Get logged in seller products
export const getShopProducts = async (
  req: Request & { seller?: { id?: string; shop?: { id?: string } } },
  res: Response,
  next: NextFunction, 
) => {
  try {
    if (!req.seller?.id) {
      return next(new AuthError('Only seller can access products!'));
    }
    const products = await prisma.products.findMany({
      where: { shopId: req.seller.shop?.id },
      include: {
        images: true,
      },
    });
    res.status(201).json({
      success: true,
      products,
    });
    } catch (error) {
    return next(error);
  }
  }

  // delete product
export const deleteProduct = async (
  req: Request & { seller?: { id?: string; shop?: { id?: string } } },
  res: Response, 
next: NextFunction 
) => {
  try {
    const { id } = req.params;
    if (!req.seller?.id) {
      return next(new AuthError('Only seller can delete products!'));
    }
    const product = await prisma.products.findUnique({
      where: { id },
      select: { id: true, shopId: true, isDeleted: true },
    });
    if (!product) {
      return next(new NotFoundError('Product not found!'));
    }
    if (product.shopId !== req.seller.shop?.id) {
      return next(new ValidationError('Unauthorized access!'));
    }
    if (product.isDeleted) {
      return next(new ValidationError('Product is already deleted!'));
    }
    const deletedProduct = await prisma.products.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(Date.now() + 24*60*60*1000 )},
    })

    return res.status(200).json({
      message : "Product is scheduled for deletion in 24 hours. You can recover it within this time",
      deletedAt : deletedProduct.deletedAt
    })
  } catch (error) {
    return next(error);
  }
}

// recover deleted product
export const recoverDeletedProduct = async (
  req: Request & { seller?: { id?: string; shop?: { id?: string } } },
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!req.seller?.id) {
      return next(new AuthError('Only seller can recover products!'));
    }
    const product = await prisma.products.findUnique({
      where: { id },
      select: { id: true, shopId: true, isDeleted: true, deletedAt: true },
    });
    if (!product) {
      return next(new NotFoundError('Product not found!'));
    }
    if (product.shopId !== req.seller.shop?.id) {
      return next(new ValidationError('Unauthorized access!'));
    }
    if (!product.isDeleted) {
      return next(new ValidationError('Product is not deleted!'));
    }
    const currentTime = new Date();
    if (product.deletedAt && currentTime > product.deletedAt) {
      return next(new ValidationError('Product deletion time has expired!'));
    }
    await prisma.products.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });
    return res.status(200).json({
      message: 'Product recovered successfully!',
    });
  } catch (error) {
    return next(error);
  }
};

// get all products
export const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type;
    const now = new Date();

    const baseFilter: Prisma.productsWhereInput = {
      status: 'Active',
      isDeleted: false,
      AND: [
        {
          OR: [
            { starting_date: null },
            { starting_date: { isSet: false } },
            { starting_date: { lte: now } },
          ],
        },
        {
          OR: [
            { ending_date: null },
            { ending_date: { isSet: false } },
            { ending_date: { gte: now } },
          ],
        },
      ],
    };

    const orderBy: Prisma.productsOrderByWithRelationInput =
      type === 'latest'
        ? { createdAt: 'desc' }
        : { totalSales: 'desc' };

    const [products, total, top10Products] = await Promise.all([
      prisma.products.findMany({
        skip,
        take: limit,
        include: {
          images: true,
          Shop: true,
        },
        where: baseFilter,
        orderBy,
      }),

      prisma.products.count({ where: baseFilter }),
      prisma.products.findMany({
        take: 10,
        where: baseFilter,
        orderBy,
      })
    ]);

    res.status(200).json({
      products,
      top10By: type === 'latest' ? 'latest' : 'topSales',
      top10Products,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    return next(error);
  }
};

// Get all events
export const getAllEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type;
    const now = new Date();

    const baseFilter: Prisma.productsWhereInput = {
      status: 'Active',
      isDeleted: false,
      AND: [
        {
          OR: [
            { starting_date: {not: null} },
            { starting_date: { isSet: false } },
            { starting_date: { lte: now } },
          ],
        },
        {
          OR: [
            { ending_date: {not: null} },
            { ending_date: { isSet: false } },
            { ending_date: { gte: now } },
          ],
        },
      ],
    };

    const orderBy: Prisma.productsOrderByWithRelationInput =
      type === 'latest'
        ? { createdAt: 'desc' }
        : { totalSales: 'desc' };

    const [products, total, top10Products] = await Promise.all([
      prisma.products.findMany({
        skip,
        take: limit,
        include: {
          images: true,
          Shop: true,
        },
        where: baseFilter,
        orderBy,
      }),

      prisma.products.count({ where: baseFilter }),
      prisma.products.findMany({
        take: 10,
        where: baseFilter,
        orderBy,
      })
    ]);

    res.status(200).json({
      products,
      top10By: type === 'latest' ? 'latest' : 'topSales',
      top10Products,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    return next(error);
  }
};

// get product details
export const getProductDetails = async (
  req : Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await prisma.products.findUnique({
      where: {
        slug: req.params.slug
      },
      include: {
        images: true,
        Shop: {
          include: {
            avatars: true
          }
        }
      }
    })
    if (!product) {
      return next(new NotFoundError('Product not found'));
    }
    return res.status(200).json({
      success: true,
      product
    })
  } catch (error) {
    return next(error)
  }
}

// Get filtered products
export const getFilteredProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const priceRange = parseNumberRange(
      req.query.priceRange,
      [0, 10000],
      'priceRange',
    );
    const categories = parseQueryList(req.query.categories);
    const colors = parseQueryList(req.query.colors);
    const sizes = parseQueryList(req.query.sizes);
    const { page, limit, skip } = parsePagination(req, 12);
    const now = new Date();

    const filters: Prisma.productsWhereInput = {
      status: 'Active',
      isDeleted: false,
      sale_price: { gte: priceRange[0], lte: priceRange[1] },
      AND: [
        {
          OR: [
            { starting_date: null },
            { starting_date: { isSet: false } },
            { starting_date: { lte: now } },
          ],
        },
        {
          OR: [
            { ending_date: null },
            { ending_date: { isSet: false } },
            { ending_date: { gte: now } },
          ],
        },
      ],
    };

    if (categories.length > 0) {
      filters.category = { in: categories };
    }

    if (colors.length > 0) {
      filters.colors = { hasSome: colors };
    }

    if (sizes.length > 0) {
      filters.sizes = { hasSome: sizes };
    }

    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: true,
          Shop: true,
        },
      }),
      prisma.products.count({ where: filters }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Get filtered events
export const getFilteredEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const priceRange = parseNumberRange(
      req.query.priceRange,
      [0, 10000],
      'priceRange',
    );
    const categories = parseQueryList(req.query.categories);
    const startDate = parseOptionalDate(req.query.startDate, 'startDate');
    const endDate = parseOptionalDate(req.query.endDate, 'endDate');
    const { page, limit, skip } = parsePagination(req, 12);

    if (startDate && endDate && startDate > endDate) {
      throw new ValidationError('startDate must not be after endDate');
    }

    const filters: Prisma.eventsWhereInput = {
      price: { gte: priceRange[0], lte: priceRange[1] },
    };
    const dateFilters: Prisma.eventsWhereInput[] = [];

    if (categories.length > 0) {
      filters.category = { in: categories };
    }
    if (startDate) {
      dateFilters.push({ ending_date: { gte: startDate } });
    }
    if (endDate) {
      dateFilters.push({ starting_date: { lte: endDate } });
    }
    if (dateFilters.length > 0) {
      filters.AND = dateFilters;
    }

    const [events, total] = await Promise.all([
      prisma.events.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy: { starting_date: 'asc' },
      }),
      prisma.events.count({ where: filters }),
    ]);

    return res.status(200).json({
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Get filtered shops
export const getFilteredShops = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const categories = parseQueryList(req.query.categories);
    const { page, limit, skip } = parsePagination(req, 12);
    const filters: Prisma.shopsWhereInput = {};

    if (categories.length > 0) {
      filters.category = { in: categories };
    }

    const [shops, total] = await Promise.all([
      prisma.shops.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { avatars: true },
      }),
      prisma.shops.count({ where: filters }),
    ]);

    return res.status(200).json({
      shops,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Get the highest-rated shops
export const topShops = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shops = await prisma.shops.findMany({
      take: 10,
      orderBy: [{ ratings: 'desc' }, { createdAt: 'desc' }],
      include: { avatars: true },
    });

    return res.status(200).json({
      success: true,
      topShops: shops,
    });
  } catch (error) {
    return next(error);
  }
};