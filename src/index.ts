import socketio from 'socket.io';
import Procket from './procket.io';
import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Connection from './classes/Connection';
import env from './utils/env';


dotenv.config();


const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  pingInterval: 25000,
  pingTimeout: 35000
});


io.on('connect', socket => {
  const procket = new Procket(socket);
  new Connection(procket);
  procket.emit('ip', {
    address: socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress.split(":")[3] || ''
  });
});


app.use(cors());
app.get('/', (_req:any, res: any) => {
  return res.send('Where are you going?');
});

server.listen(env('PORT', '3600'));
