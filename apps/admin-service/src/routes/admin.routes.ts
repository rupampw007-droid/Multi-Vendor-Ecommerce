import { isAdmin } from '@repo/middleware/authorizeRoles';
import isAuthenticated from '@repo/middleware/isAuthenticated';
import express, { Router } from 'express'
import {
  addNewAdmin,
  getAdminSession,
  getAllAdmins,
  getAllCustomizations,
  getAllEvents,
  getAllProducts,
  getAllUsers,
  getAllSellers,
  getDashboardStats,
  updateCustomizations,
} from '../controllers/admin.controller';

const router: Router = express.Router();
const adminOnly = [isAuthenticated, isAdmin];

router.get('/admin-session', ...adminOnly, getAdminSession);
router.get('/dashboard-stats', ...adminOnly, getDashboardStats);
router.get('/get-all-products', ...adminOnly, getAllProducts);
router.get('/get-all-events', ...adminOnly, getAllEvents);
router.get('/get-all-admins', ...adminOnly, getAllAdmins);
router.put('/add-new-admin', ...adminOnly, addNewAdmin);
router.get('/get-all-users', ...adminOnly, getAllUsers);
router.get('/get-all-sellers', ...adminOnly, getAllSellers);
router.get('/get-all', ...adminOnly, getAllCustomizations);
router.put('/customizations', ...adminOnly, updateCustomizations);


export default router