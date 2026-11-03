import cookieParser from 'cookie-parser';
import express from 'express';
import { errorMiddleWare } from '@repo/error-handler/error-middleware';
import {
  adminNotificationRoutes,
  sellerNotificationRoutes,
  userNotificationRoutes,
} from './routes/notifications.routes';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/', (_req, res) => {
  res.send({ message: 'Welcome to notification-service!' });
});

app.use('/api/user/notifications', userNotificationRoutes);
app.use('/api/seller/notifications', sellerNotificationRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use(errorMiddleWare);

const port = process.env.PORT || 6009;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});

server.on('error', console.error);
