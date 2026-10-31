import express from 'express';
import * as path from 'path';
import cookieParser from 'cookie-parser'
import { createWebSocketServer } from './websocket';
import { startConsumer } from './chat-message.consumer';
import router from './routes/chat.routes';


const app = express();

app.use(express.json());
app.use(cookieParser())


app.use('/assets', express.static(path.join(__dirname, 'assets')));

//router
app.get('/api', router) 

const port = process.env.PORT || 6006;

const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});

// Websocket server
createWebSocketServer(server)

// start kafka consumer
startConsumer().catch((error: any) => console.log(error))


server.on('error', console.error);
