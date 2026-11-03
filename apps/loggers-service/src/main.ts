import express from 'express';
import WebSocket from 'ws'
import http, { request } from 'http'
import { consumeKafkaMessages } from './logger.consumer';

const app = express();

const wsServer = new WebSocket.Server({ noServer: true })

export const clients = new Set<WebSocket>();

wsServer.on("connection", (ws) => {
  console.log("New logger client connecter")
  clients.add(ws)

  wsServer.on("close", () => {
    console.log("Logger client disconnected")
    clients.delete(ws)
  })
})

const server = http.createServer(app)

server.on("upgrade", (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, (ws) => {
    wsServer.emit("connection", ws, request)
  })
})

server.listen(process.env.PORT || 6008 , () => {
  console.log('Listening at 6008 port')
})

// Start Kafka consumer
consumeKafkaMessages()

server.on('error', console.error);
