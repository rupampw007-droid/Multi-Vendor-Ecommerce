import express from 'express';
import * as path from 'path';
import cookieParser from 'cookie-parser'
import { errorMiddleWare } from '@repo/error-handler/error-middleware';
import { createWebSocketServer } from './websocket';
import { startConsumer } from './chat-message.consumer';
import router from './routes/chat.routes';


const app = express();

app.use(express.json());
app.use(cookieParser())


app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use('/api', router);
app.use(errorMiddleWare);

const port = process.env.PORT || 6006;

const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});

// Websocket server
createWebSocketServer(server).catch((error) =>
  console.error('Unable to start chat websocket server:', error),
);

// start kafka consumer
startConsumer().catch((error: unknown) =>
  console.error('Unable to start chat message consumer:', error),
);


server.on('error', console.error);
