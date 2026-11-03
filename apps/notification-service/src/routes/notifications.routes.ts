import express, { Router } from 'express';
import {
  isAdminAuthenticated,
  isSellerAuthenticated,
  isUserAuthenticated,
} from '@repo/middleware/isAuthenticated';
import {
  broadcastNotifications,
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notifications.controller';

const createNotificationRouter = (
  authenticate: express.RequestHandler,
  includeBroadcast = false,
) => {
  const router: Router = express.Router();
  router.use(authenticate);
  router.get('/', getNotifications);
  router.get('/unread-count', getUnreadCount);
  router.patch('/read-all', markAllNotificationsRead);
  router.patch('/:id/read', markNotificationRead);
  router.delete('/:id', deleteNotification);
  if (includeBroadcast) {
    router.post('/broadcast', broadcastNotifications);
  }
  return router;
};

export const userNotificationRoutes =
  createNotificationRouter(isUserAuthenticated);
export const sellerNotificationRoutes =
  createNotificationRouter(isSellerAuthenticated);
export const adminNotificationRoutes =
  createNotificationRouter(isAdminAuthenticated, true);
