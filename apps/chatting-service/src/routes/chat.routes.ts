import isAuthenticated from '@repo/middleware/isAuthenticated';
import express, { Router } from 'express'
import { getSellerConversations, getUserConversations, newConversation, fetchMessages, fetchSellerMessages } from '../controllers/chatting.controller';
import { isSeller } from '@repo/middleware/authorizeRoles';

const router: Router = express.Router();

router.post("/create-user-conversationGroup", isAuthenticated, newConversation)
router.get("/get-user-conversation", isAuthenticated, getUserConversations)
router.get("/get-seller-conversations", isAuthenticated, isSeller, getSellerConversations)

router.get("/get-messages/:conversationId", isAuthenticated, fetchMessages);
router.get("/get-seller-messages/:conversationId", isAuthenticated, fetchSellerMessages)

export default router