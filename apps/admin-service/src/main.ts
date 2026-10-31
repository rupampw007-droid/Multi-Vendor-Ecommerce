/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import express from 'express';
import * as path from 'path';
import cookieParser from 'cookie-parser'
import { errorMiddleWare } from '@repo/error-handler/error-middleware';
import router from './routes/admin.routes';


const app = express();
app.use(express.json({ limit: '5mb' }))
app.use(cookieParser())

app.use('/assets', express.static(path.join(__dirname, 'assets')));

// routes
app.use('/api', router)

app.get('/', (req, res) => {
  res.send({ message: 'Welcome to admin-service!' });
});

app.use(errorMiddleWare)

const port = process.env.PORT || 6005;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
