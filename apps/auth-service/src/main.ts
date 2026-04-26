import express from 'express';
import cors from 'cors'
import { errorMiddleWare } from '@repo/error-handler/error-middleware';
import cookieParser from 'cookie-parser';
import {router} from './routes/auth.route';
const port = process.env.PORT ? Number(process.env.PORT) : 6001;

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  allowedHeaders: ["authorization", "contentType"],
  credentials: true,
}))

app.use(cookieParser())
app.use(express.json())

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});


app.use('/api', router)

app.use(errorMiddleWare)

const server = app.listen(port, () => {
  console.log(`[ ready ] http://localhost:${port}`);
});

server.on("error" , (err : any) => {
  console.log("Server error: " , err)
})
