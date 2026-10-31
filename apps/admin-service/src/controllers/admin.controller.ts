import { NextFunction, Request, Response } from 'express';
import prisma from '@repo/lib/prisma/prisma';
import { ValidationError } from '@repo/error-handler';
import { Prisma } from '@multivendor-ecommerce/generated/prisma/client';

type AdminRequest = Request & { user?: { id: string; name: string; email: string; role: string } };

const getPageOptions = (req: Request) => {
  const parsedPage = Number.parseInt(String(req.query.page ?? '1'), 10);
  const parsedLimit = Number.parseInt(
    String(req.query.pageSize ?? req.query.limit ?? '20'),
    10,
  );
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(100, Math.max(1, parsedLimit))
    : 20;
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    search: String(req.query.search ?? '').trim(),
    sortDirection: req.query.sortDirection === 'asc' ? 'asc' : 'desc',
  } as const;
};

const paginationMeta = (page: number, limit: number, total: number) => ({
  total,
  currentPage: page,
  totalPages: Math.ceil(total / limit),
});

export const getAdminSession = (req: AdminRequest, res: Response) =>
  res.status(200).json({ success: true, admin: req.user });

export const getDashboardStats = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [orders, orderCount, users, sellers] = await Promise.all([
      prisma.orders.aggregate({ _sum: { totalAmount: true } }),
      prisma.orders.count(),
      prisma.users.count({ where: { role: 'user' } }),
      prisma.sellers.count(),
    ]);

    return res.status(200).json({
      success: true,
      revenue: orders._sum.totalAmount ?? 0,
      orders: orderCount,
      users,
      sellers,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, skip, search, sortDirection } = getPageOptions(req);
    const status = String(req.query.status ?? '');
    const where: Prisma.productsWhereInput = {
      starting_date: null,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(status && ['Active', 'Pending', 'Draft'].includes(status)
        ? { status: status as 'Active' | 'Pending' | 'Draft' }
        : {}),
    };
    const requestedSort = String(req.query.sortBy ?? 'createdAt');
    const sortField =
      requestedSort === 'price'
        ? 'sale_price'
        : requestedSort === 'name'
          ? 'title'
          : ['stock', 'status', 'createdAt'].includes(requestedSort)
            ? requestedSort
            : 'createdAt';
    const orderBy = {
      [sortField === 'price' ? 'sale_price' : 'createdAt']: sortDirection,
    } as Prisma.productsOrderByWithRelationInput;
    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          Shop: { select: { name: true } },
          images: { select: { url: true }, take: 1 },
        },
      }),
      prisma.products.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: products,
      meta: paginationMeta(page, limit, total),
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, skip, search, sortDirection } = getPageOptions(req);
    const status = String(req.query.status ?? '');
    const now = new Date();
    const where: Prisma.productsWhereInput = {
      starting_date: { not: null },
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(status === 'Live'
        ? { starting_date: { lte: now }, ending_date: { gte: now } }
        : status === 'Upcoming'
          ? { starting_date: { gt: now } }
          : status === 'Ended'
            ? { ending_date: { lt: now } }
            : {}),
    };
    const requestedSort = String(req.query.sortBy ?? 'createdAt');
    const sortField =
      requestedSort === 'name'
        ? 'title'
        : requestedSort === 'start'
          ? 'starting_date'
          : requestedSort === 'end'
            ? 'ending_date'
            : 'createdAt';
    const orderBy = {
      [sortField]: sortDirection,
    } as Prisma.productsOrderByWithRelationInput;
    const [events, total] = await Promise.all([
      prisma.products.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { Shop: { select: { name: true } } },
      }),
      prisma.products.count({ where }),
    ]);
    return res.status(200).json({
      success: true,
      data: events,
      meta: paginationMeta(page, limit, total),
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllAdmins = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, skip, search } = getPageOptions(req);
    const where: Prisma.usersWhereInput = {
      role: 'admin',
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [admins, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.users.count({ where }),
    ]);
    return res.status(200).json({
      success: true,
      data: admins,
      meta: paginationMeta(page, limit, total),
    });
  } catch (error) {
    return next(error);
  }
};

export const addNewAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError('A valid email is required');
    }

    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (!existingUser) {
      throw new ValidationError(
        'An account with this email must be registered before it can be promoted',
      );
    }
    const admin = await prisma.users.update({
      where: { email },
      data: { role: 'admin' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return res.status(200).json({ success: true, admin });
  } catch (error) {
    return next(error);
  }
};

export const getAllCustomizations = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const config = await prisma.site_config.findFirst();
    return res.status(200).json({
      success: true,
      categories: config?.categories ?? [],
      subCategories: config?.subCategories ?? {},
      logo: config?.logo ?? null,
      banner: config?.banner ?? null,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateCustomizations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { categories, subCategories, logo, banner } = req.body ?? {};
    if (
      !Array.isArray(categories) ||
      categories.some((category) => typeof category !== 'string') ||
      !subCategories ||
      typeof subCategories !== 'object' ||
      Array.isArray(subCategories) ||
      (logo !== undefined && logo !== null && typeof logo !== 'string') ||
      (banner !== undefined && banner !== null && typeof banner !== 'string')
    ) {
      throw new ValidationError('Customization data is invalid');
    }
    const existing = await prisma.site_config.findFirst();
    const data = {
      categories,
      subCategories: subCategories as Prisma.InputJsonValue,
      ...(logo !== undefined ? { logo } : {}),
      ...(banner !== undefined ? { banner } : {}),
    };
    const config = existing
      ? await prisma.site_config.update({ where: { id: existing.id }, data })
      : await prisma.site_config.create({
          data: {
            categories,
            subCategories: subCategories as Prisma.InputJsonValue,
            logo: logo ?? null,
            banner: banner ?? null,
          },
        });
    return res.status(200).json({ success: true, config });
  } catch (error) {
    return next(error);
  }
};

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, skip, search, sortDirection } = getPageOptions(req);
    const requestedSort = String(req.query.sortBy ?? 'createdAt');
    const sortField =
      requestedSort === 'name' || requestedSort === 'email'
        ? requestedSort
        : 'createdAt';
    const where: Prisma.usersWhereInput = {
      role: 'user',
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy = {
      [sortField]: sortDirection,
    } as Prisma.usersOrderByWithRelationInput;
    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.users.count({ where }),
    ]);
    return res.status(200).json({
      success: true,
      data: users,
      meta: paginationMeta(page, limit, total),
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllSellers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, skip, search, sortDirection } = getPageOptions(req);
    const requestedSort = String(req.query.sortBy ?? 'createdAt');
    const sortField =
      requestedSort === 'name' || requestedSort === 'email'
        ? requestedSort
        : 'createdAt';
    const where: Prisma.sellersWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const orderBy = {
      [sortField]: sortDirection,
    } as Prisma.sellersOrderByWithRelationInput;
    const [sellers, total] = await Promise.all([
      prisma.sellers.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          shop: {
            select: { id: true, name: true, products: { select: { id: true } } },
          },
        },
      }),
      prisma.sellers.count({ where }),
    ]);
    return res.status(200).json({
      success: true,
      data: sellers,
      meta: paginationMeta(page, limit, total),
    });
  } catch (error) {
    return next(error);
  }
};
