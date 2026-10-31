import {
  isSellerAuthenticated,
  isUserAuthenticated,
} from '@repo/middleware/isAuthenticated';
import express, { Router } from 'express';
import {
  fetchMessages,
  fetchSellerMessages,
  getSellerConversations,
  getUserConversations,
  newConversation,
  sendMessage,
} from '../controllers/chatting.controller';

const router: Router = express.Router();

router.post('/create-user-conversationGroup', isUserAuthenticated, newConversation);
router.get('/get-user-conversation', isUserAuthenticated, getUserConversations);
router.get('/get-seller-conversations', isSellerAuthenticated, getSellerConversations);

router.get('/get-messages/:conversationId', isUserAuthenticated, fetchMessages);
router.get(
  '/get-seller-messages/:conversationId',
  isSellerAuthenticated,
  fetchSellerMessages,
);
router.post('/messages', isUserAuthenticated, sendMessage);
router.post('/seller-messages', isSellerAuthenticated, sendMessage);

export default router;