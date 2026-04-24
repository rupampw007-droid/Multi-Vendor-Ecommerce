/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import express from 'express';
import * as path from 'path';
import cors from 'cors'
import morgan from 'morgan'
import axios  from 'axios';
import rateLimit from 'express-rate-limit';
import swaggerUI from 'swagger-ui-express'
import proxy from 'express-http-proxy'
import cookieParser from 'cookie-parser'
const app = express();

app.use(express.json())
app.use(morgan('dev'))
app.use(express.urlencoded({limit: '100mb', extended: true}))
app.use(cors({
  origin: 'http://localhost:3000',
  allowedHeaders: ["authorization", "contentType"],
  credentials: true,
}))
app.use(cookieParser())
app.set("trust proxy" , 1)

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: (req: any) => (req.user ? 1000 : 100), // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
	// store: ... , // Redis, Memcached, etc. See below.
})

// Apply the rate limiting middleware to all requests.
app.use(limiter)


app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/gateway-health', (req, res) => {
  res.send({ message: 'Welcome to api-gateway!' });
});

app.use('/', proxy("http://localhost:6001"))

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
