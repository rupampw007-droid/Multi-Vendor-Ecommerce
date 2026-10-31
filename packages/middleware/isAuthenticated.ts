import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '@repo/lib/prisma/prisma';

type AccountRole = 'user' | 'seller';

const authenticate = (requiredRole?: AccountRole) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const bearerToken = req.headers.authorization?.split(' ')[1];
      const token =
        requiredRole === 'seller'
          ? req.cookies['seller-access-token'] || bearerToken
          : requiredRole === 'user'
            ? req.cookies['access_token'] || bearerToken
            : req.cookies['access_token'] ||
              req.cookies['seller-access-token'] ||
              bearerToken;

      if (!token) {
        return res.status(401).json({ message: 'Unauthorized! Token missing.' });
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
        id: string;
        role: 'user' | 'seller' | 'admin';
      };
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ message: 'Access denied: Invalid account role.' });
      }

      let account;
      if (decoded.role === 'user' || decoded.role === 'admin') {
        account = await prisma.users.findUnique({
          where: { id: decoded.id },
        });
        req.user = account;
      } else {
        account = await prisma.sellers.findUnique({
          where: { id: decoded.id },
          include: { shop: true },
        });
        req.seller = account;
      }
      if (!account) {
        return res.status(401).json({ message: 'Account not found!' });
      }
      if (
        'role' in account &&
        ((decoded.role === 'admin' && account.role !== 'admin') ||
          (decoded.role === 'user' && account.role === 'admin'))
      ) {
        return res
          .status(403)
          .json({ message: 'Access denied: Account role changed' });
      }

      req.role = decoded.role;
      return next();
    } catch (error) {
      return res.status(401).json({
        message: 'Unauthorized! Token expired or invalid',
        error,
      });
    }
  };
};

const isAuthenticated = authenticate();

export const isUserAuthenticated = authenticate('user');
export const isSellerAuthenticated = authenticate('seller');

export default isAuthenticated;
