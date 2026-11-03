import {
  NotificationRecipientRole,
  type Prisma,
} from '@multivendor-ecommerce/generated/prisma/client';
import { NotFoundError, ValidationError } from '@repo/error-handler';
import prisma from '@repo/lib/prisma/prisma';
import type { NextFunction, Request, Response } from 'express';

type AuthenticatedRequest = Request & {
  user?: { id: string };
  seller?: { id: string };
  role?: NotificationRecipientRole;
};

type Recipient = {
  id: string;
  role: NotificationRecipientRole;
};

const getRecipient = (req: AuthenticatedRequest): Recipient => {
  if (req.role === NotificationRecipientRole.seller && req.seller?.id) {
    return { id: req.seller.id, role: NotificationRecipientRole.seller };
  }
  if (
    (req.role === NotificationRecipientRole.user ||
      req.role === NotificationRecipientRole.admin) &&
    req.user?.id
  ) {
    return { id: req.user.id, role: req.role };
  }
  throw new ValidationError('Authenticated account could not be resolved');
};

const recipientWhere = (
  recipient: Recipient,
): Prisma.notificationsWhereInput => ({
  receiverId: recipient.id,
  ...(recipient.role === NotificationRecipientRole.seller
    ? {
        OR: [
          { recipientRole: NotificationRecipientRole.seller },
          { recipientRole: null },
        ],
      }
    : { recipientRole: recipient.role }),
});

const isObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value);

const getNotificationId = (id: string) => {
  if (!isObjectId(id)) {
    throw new ValidationError('A valid notification id is required');
  }
  return id;
};

const getPageSize = (value: unknown) => {
  if (value === undefined) return 20;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError('The page size must be a positive integer');
  }
  return Math.min(parsed, 50);
};

const getRedirectLink = (value: unknown) => {
  if (value === undefined || value === '') return '/notifications';
  if (
    typeof value !== 'string' ||
    value.length > 500 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    throw new ValidationError('The redirect link must be a local path');
  }
  return value;
};

const getRecipientRedirectLink = (
  redirectLink: string,
  role: NotificationRecipientRole,
) =>
  redirectLink === '/notifications' || redirectLink === '/dashboard/notifications'
    ? role === NotificationRecipientRole.admin
      ? '/dashboard/notifications'
      : '/notifications'
    : redirectLink;

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const recipient = getRecipient(req);
    const pageSize = getPageSize(req.query.limit);
    const cursor =
      typeof req.query.cursor === 'string'
        ? getNotificationId(req.query.cursor)
        : undefined;
    const where = recipientWhere(recipient);

    const [page, unreadCount] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.notifications.count({ where: { ...where, isRead: false } }),
    ]);

    const hasMore = page.length > pageSize;
    const notifications = hasMore ? page.slice(0, pageSize) : page;

    return res.status(200).json({
      notifications,
      unreadCount,
      nextCursor: hasMore ? notifications[notifications.length - 1]?.id : null,
    });
  } catch (error) {
    return next(error);
  }
};

export const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const where = recipientWhere(getRecipient(req));
    const unreadCount = await prisma.notifications.count({
      where: { ...where, isRead: false },
    });
    return res.status(200).json({ unreadCount });
  } catch (error) {
    return next(error);
  }
};

export const markNotificationRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await prisma.notifications.updateMany({
      where: {
        ...recipientWhere(getRecipient(req)),
        id: getNotificationId(req.params.id),
      },
      data: { isRead: true },
    });
    if (!result.count) {
      return next(new NotFoundError('Notification not found'));
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

export const markAllNotificationsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await prisma.notifications.updateMany({
      where: { ...recipientWhere(getRecipient(req)), isRead: false },
      data: { isRead: true },
    });
    return res.status(200).json({ updatedCount: result.count });
  } catch (error) {
    return next(error);
  }
};

export const deleteNotification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await prisma.notifications.deleteMany({
      where: {
        ...recipientWhere(getRecipient(req)),
        id: getNotificationId(req.params.id),
      },
    });
    if (!result.count) {
      return next(new NotFoundError('Notification not found'));
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

export const broadcastNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body: unknown = req.body;
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new ValidationError('A notification announcement is required');
    }
    const { title, message, audience, redirectLink } = body as Record<
      string,
      unknown
    >;
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
      throw new ValidationError('Title is required and must be 120 characters or fewer');
    }
    if (
      typeof message !== 'string' ||
      !message.trim() ||
      message.trim().length > 2000
    ) {
      throw new ValidationError(
        'Message is required and must be 2000 characters or fewer',
      );
    }
    if (
      audience !== 'user' &&
      audience !== 'seller' &&
      audience !== 'admin' &&
      audience !== 'all'
    ) {
      throw new ValidationError('Choose a valid notification audience');
    }

    const safeRedirectLink = getRedirectLink(redirectLink);
    const adminId = getRecipient(req).id;
    const recipients: Array<{
      receiverId: string;
      recipientRole: NotificationRecipientRole;
    }> = [];
    const includeUsers =
      audience === 'user' || audience === 'all';
    const includeAdmins =
      audience === 'admin' || audience === 'all';
    const includeSellers =
      audience === 'seller' || audience === 'all';

    if (includeUsers) {
      const users = await prisma.users.findMany({
        where: { role: 'user' },
        select: { id: true },
      });
      recipients.push(
        ...users.map(({ id }) => ({
          receiverId: id,
          recipientRole: NotificationRecipientRole.user,
        })),
      );
    }
    if (includeAdmins) {
      const admins = await prisma.users.findMany({
        where: { role: 'admin' },
        select: { id: true },
      });
      recipients.push(
        ...admins.map(({ id }) => ({
          receiverId: id,
          recipientRole: NotificationRecipientRole.admin,
        })),
      );
    }
    if (includeSellers) {
      const sellers = await prisma.sellers.findMany({
        select: { id: true },
      });
      recipients.push(
        ...sellers.map(({ id }) => ({
          receiverId: id,
          recipientRole: NotificationRecipientRole.seller,
        })),
      );
    }
    if (!recipients.length) {
      throw new ValidationError('There are no accounts in the selected audience');
    }

    const result = await prisma.notifications.createMany({
      data: recipients.map(({ receiverId, recipientRole }) => ({
        title: title.trim(),
        message: message.trim(),
        creatorId: adminId,
        receiverId,
        recipientRole,
        type: 'system',
        redirect_link: getRecipientRedirectLink(safeRedirectLink, recipientRole),
      })),
    });

    return res.status(201).json({ createdCount: result.count });
  } catch (error) {
    return next(error);
  }
};
