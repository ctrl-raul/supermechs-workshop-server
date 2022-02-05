"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = __importDefault(require("socket.io"));
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const env_1 = __importDefault(require("./utils/env"));
const BattleUtils_1 = require("./battle/BattleUtils");
dotenv_1.default.config();
const DEV = env_1.default('DEV', '0') === '1';
const PORT = Number(env_1.default('PORT', '3000'));
const server = http_1.default.createServer();
const io = new socket_io_1.default.Server(server, {
    cors: {
        origin: '*',
    }
});
server.listen(PORT, () => {
    console.log('Listening at', PORT);
});
class Player {
    constructor(socket) {
        this.setup = [];
        this.battle = null;
        this.socket = socket;
        this.name = socket.id;
    }
    json() {
        return {
            id: this.socket.id,
            name: this.name,
            setup: this.setup
        };
    }
}
const matchMaker = [];
io.on('connection', socket => {
    if (DEV) {
        console.log('[index.ts] Socket emits are being delayed for testing purposes!');
        const emit = socket.emit;
        socket.emit = function (...args) {
            setTimeout(() => emit.apply(socket, args), 500);
            return true;
        };
    }
    console.log(socket.id, 'has connected');
    const player = new Player(socket);
    socket.on('matchmaker.join', data => {
        try {
            if (matchMaker.includes(player)) {
                throw new Error('Already in matchmaker');
            }
            if (!Array.isArray(data.setup)) {
                throw new Error('Invalid mech setup (Error A)');
            }
            if (!data.setup.every((id) => typeof id === 'number' && !isNaN(id))) {
                throw new Error('Invalid mech setup (Error B)');
            }
            player.name = String(data.name).slice(0, 32);
            player.setup = data.setup;
            matchMaker.push(player);
            console.log(player.name, 'has joined the matchMaker');
            socket.emit('matchmaker.join.success');
            tryToMatch(player);
        }
        catch (err) {
            socket.emit('matchmaker.join.error', {
                message: err.message
            });
        }
    });
    socket.on('matchmaker.quit', () => {
        try {
            removeFromMatchMaker(player);
            console.log(player.name, 'has quit the matchMaker');
            socket.emit('matchmaker.quit.success');
        }
        catch (err) {
            socket.emit('matchmaker.quit.error', {
                message: err.message
            });
        }
    });
    socket.on('disconnect', () => {
        if (matchMaker.includes(player)) {
            removeFromMatchMaker(player);
        }
        if (player.battle) {
            const opponent = player.battle.p1 === player ? player.battle.p2 : player.battle.p1;
            opponent.socket.emit('battle.opponent.quit');
        }
    });
    socket.on('battle.event', event => {
        console.log('[battle.event] event:', event);
        if (player.battle === null) {
            player.socket.emit('battle.event.error', { message: 'Not in battle' });
            return;
        }
        if (player.battle) {
            const opponent = player.battle.p1 === player ? player.battle.p2 : player.battle.p1;
            Object.assign(event, { droneDamageScale: Math.random() });
            opponent.socket.emit('battle.event.confirmation', event);
            player.socket.emit('battle.event.confirmation', event);
        }
    });
    socket.on('battle.quit', () => {
        if (player.battle) {
            const opponent = player.battle.p1 === player ? player.battle.p2 : player.battle.p1;
            opponent.socket.emit('battle.opponent.quit');
        }
    });
});
class Battle {
    constructor(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
    }
    json() {
        const p1 = this.p1.json();
        const p2 = this.p2.json();
        const randomPositions = BattleUtils_1.getRandomStartPositions();
        Object.assign(p1, { position: randomPositions[0] });
        Object.assign(p2, { position: randomPositions[1] });
        return {
            starterID: Math.random() > 0.5 ? p1.id : p2.id,
            p1,
            p2,
        };
    }
}
function removeFromMatchMaker(player) {
    const index = matchMaker.indexOf(player);
    if (index < 0) {
        throw new Error('Not in matchmaker');
    }
    matchMaker.splice(index, 1);
}
function tryToMatch(player) {
    for (const opponent of matchMaker) {
        if (opponent === player) {
            continue;
        }
        startBattle(player, opponent);
    }
}
function startBattle(p1, p2) {
    removeFromMatchMaker(p1);
    removeFromMatchMaker(p2);
    const battle = new Battle(p1, p2);
    p1.battle = battle;
    p2.battle = battle;
    const battleJSON = battle.json();
    console.log(battleJSON);
    p1.socket.emit('battle.start', battleJSON);
    p2.socket.emit('battle.start', battleJSON);
}
