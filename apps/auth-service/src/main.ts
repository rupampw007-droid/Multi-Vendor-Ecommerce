import express from 'express';
import cors from 'cors'
import { errorMiddleWare } from '@repo/error-handler/error-middleware';
import cookieParser from 'cookie-parser';
import {router} from './routes/auth.route';
const port = process.env.PORT ? Number(process.env.PORT) : 6001;
import swaggerUi from 'swagger-ui-express'
const swaggerDocument = require('./swagger-output.json')
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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
app.get('/docs-json', (req,res) => {
  res.json(swaggerDocument)
})

app.use('/api', router)

app.use(errorMiddleWare)

const server = app.listen(port, () => {
  console.log(`Auth service is running on http://localhost:${port}/api`);
  console.log(`Swagger Docs available at http://localhost:${port}/docs`);

});

server.on("error" , (err : any) => {
  console.log("Server error: " , err)
})
