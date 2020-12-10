"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = __importDefault(require("socket.io"));
const procket_io_1 = __importDefault(require("./procket.io"));
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const Connection_1 = __importDefault(require("./classes/Connection"));
const env_1 = __importDefault(require("./utils/env"));
dotenv_1.default.config();
const app = express_1.default();
const server = http_1.default.createServer(app);
const io = socket_io_1.default(server, {
    pingInterval: 25000,
    pingTimeout: 35000
});
io.on('connect', socket => {
    const procket = new procket_io_1.default(socket);
    new Connection_1.default(procket);
    procket.emit('ip', {
        address: socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress.split(":")[3] || ''
    });
});
app.use(cors_1.default());
app.get('/', (_req, res) => {
    return res.send('Where are you going?');
});
server.listen(env_1.default('PORT', '3600'));
//# sourceMappingURL=index.js.map