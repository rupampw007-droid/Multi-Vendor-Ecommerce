import { ValidationError } from '@repo/error-handler';
import prisma from '@repo/lib/prisma/prisma';
import redis from '@repo/lib/redis';
import { getUnseenCount } from '@repo/lib/redis/message.redis';
import { group } from 'console';
import { Request, Response, NextFunction } from 'express';

// create a new conversation
export const newConversation = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sellerId } = req.body;
    const userId = req.user.id;

    if (!sellerId) {
      return next(new ValidationError('Seller Id is required!'));
    }

    const existingGroup = await prisma.conversationGroup.findFirst({
      where: {
        isGroup: false,
        participantIds: {
          hasEvery: [userId, sellerId],
        },
      },
    });

    if (existingGroup) {
      return res.status(200).json({
        conversation: existingGroup,
        isNew: false,
      });
    }

    const newGroup = await prisma.conversationGroup.create({
      data: {
        isGroup: false,
        creatorId: userId,
        participantIds: [userId, sellerId],
      },
    });

    await prisma.participant.createMany({
      data: [
        {
          conversationId: newGroup.id,
          userId,
        },
        {
          conversationId: newGroup.id,
          sellerId,
        },
      ],
    });

    return res.status(201).json({
      conversation: newGroup,
      isNew: true,
    });
  } catch (error) {
    next(error);
  }
};

// get user conversations
export const getUserConversations = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user.id;
    const conversations = await prisma.conversationGroup.findMany({
      where: {
        participantIds: {
          has: userId,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const responseData = await Promise.all(
      conversations.map(async (group) => {
        // Get the seller participant inside this conversation
        const sellerParticipant = await prisma.participant.findFirst({
          where: {
            conversationId: group.id,
            sellerId: { not: null },
          },
        });

        // Get the seller's full info
        let seller = null;
        if (sellerParticipant?.sellerId) {
          seller = await prisma.sellers.findUnique({
            where: {
              id: sellerParticipant.sellerId,
            },
            include: {
              shop: true,
            },
          });
        }

        // Get last message in the conversation
        const lastMessage = await prisma.message.findFirst({
          where: {
            conversationId: group.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Check online status from Redis
        let isOnline = false;
        if (sellerParticipant?.sellerId) {
          const redisKey = `online:seller:${sellerParticipant.sellerId}`;
          const redisResult = await redis.get(redisKey);
          isOnline = !!redisResult;
        }

        const unreadCount = await getUnseenCount('user', group.id);

        return {
          conversationId: group.id,
          seller: {
            id: seller?.id || null,
            name: seller?.shop?.name || 'Unknown',
            isOnline,
            avatar: seller?.shop?.avatar,
          },
          lastMessage:
            lastMessage?.content || 'Say something to start the conversation',
          lastMessageAt: lastMessage?.createdAt || group.updatedAt,
          unreadCount,
        };
      }),
    );
  } catch (error) {
    next(error);
  }
};

// get seller conversations
export const getSellerConversations = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = req.seller.id;

    const conversations = await prisma.conversationGroup.findMany({
      where: {
        participantIds: {
          has: sellerId,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const responseData = await Promise.all(
      conversations.map(async (group) => {
        // Get the userParticipant (NOT Seller) for this conversaton
        const userParticipant = await prisma.participant.findFirst({
          where: {
            conversationId: group.id,
            userId: { not: null },
          },
        });

        // get user details
        let user = null;
        if (userParticipant?.userId) {
          user = await prisma.users.findUnique({
            where: {
              id: userParticipant.userId,
            },
            include: {
              avatars: true,
            },
          });
        }

        // Get last message in the conversation
        const lastMessage = await prisma.message.findFirst({
          where: {
            conversationId: group.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Check online status from Redis
        let isOnline = false;
        if (userParticipant?.userId) {
          const redisKey = `online:user:user_${userParticipant.userId}`;
          const redisResult = await redis.get(redisKey);
          isOnline = !!redisResult;
        }
        const unreadCount = await getUnseenCount('seller', group.id);
      }),
    );
  } catch (error) {
    next(error);
  }
};


// Fetch User Messages using pagination and also cache it for the second time and clear unseen messages etc etc useful things

// Similarly do for seller messages