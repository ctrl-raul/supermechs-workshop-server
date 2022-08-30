import * as http from 'http';
import { env } from './utils/env';
import { SocketManager } from './managers/SocketManager';



// Config

const PORT = Number(env('PORT', '3000')); // 3000 it's the port allowed by repl.it



// Init

const server = http.createServer();

SocketManager.init(server);

server.listen(PORT, () => console.log('Listening at', PORT));
