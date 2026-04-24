import express from 'express';
import cors from 'cors'

const port = process.env.PORT ? Number(process.env.PORT) : 6001;

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  allowedHeaders: ["authorization", "contentType"],
  credentials: true,
}))

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});



const server = app.listen(() => {
  console.log(`[ ready ] http://localhost:${port}`);
});

server.on("error" , (err : any) => {
  console.log("Server error: " , err)
})
