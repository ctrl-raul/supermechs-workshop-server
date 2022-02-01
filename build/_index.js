"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = __importDefault(require("socket.io"));
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const env_1 = __importDefault(require("./utils/env"));
const simple_js_sha2_256_1 = __importDefault(require("simple-js-sha2-256"));
const Player_1 = __importDefault(require("./Player"));
const BattleUtils_1 = __importDefault(require("./battle/BattleUtils"));
const Battle_1 = __importDefault(require("./battle/Battle"));
const BattleManager_1 = __importDefault(require("./battle/BattleManager"));
const promise_socket_io_1 = __importDefault(require("./promise-socket.io"));
dotenv_1.default.config();
const PORT = Number(env_1.default('PORT', '5001'));
const server = http_1.default.createServer();
const io = new socket_io_1.default.Server(server, {
    cors: {
        origin: env_1.default('DEV', '0') === '1' ? 'http://localhost:5000' : 'https://workshop-unlimited.vercel.app/',
        methods: ["GET", "POST"],
    }
});
const matchMakerPool = [];
io.on('connection', _socket => {
    console.log(_socket.id, 'has connected');
    const psocket = new promise_socket_io_1.default(_socket);
    const player = new Player_1.default(psocket);
    _socket.on('disconnect', () => {
        leaveBattle(player);
        removeFromMatchMaker(player);
    });
    psocket.on('match_maker.join', (resolve, _reject, data) => {
        console.log(player.id, '-> match_maker.join');
        if (!isInMatchMaker(player)) {
            player.name = data.name;
            player.setup = data.setup;
            player.setupHash = simple_js_sha2_256_1.default(JSON.stringify(data.setup));
            addToMatchMaker(player);
            updateMatchMaker();
        }
        resolve();
    });
    psocket.on('match_maker.quit', (resolve, reject) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(player.id, '-> match_maker.quit');
        if (player.opponentValidationPromise) {
            try {
                yield player.opponentValidationPromise;
                reject({ message: 'Battle started' });
                return;
            }
            catch (err) { }
        }
        resolve();
        removeFromMatchMaker(player);
    }));
    psocket.on('battle.quit', resolve => {
        resolve();
        leaveBattle(player);
    });
    psocket.on('battle.event', (resolve, reject, data) => {
        if (player.battleData) {
            player.emit('battle.event', data).catch();
            player.battleData.opponent.emit('battle.event', data).catch();
            resolve();
        }
        else {
            reject({ message: 'Not in battle' });
        }
    });
});
server.listen(PORT, () => {
    console.log('Listening on port', PORT);
});
function updateMatchMaker() {
    console.log('matchMakerCount:', matchMakerPool.length);
    console.time('updateMatchMaker');
    for (const [p1, p2] of pairs(matchMakerPool)) {
        if (p1.opponentValidationPromise)
            continue;
        if (p2.opponentValidationPromise)
            continue;
        if (p1.doNotMatch.includes(p2))
            continue;
        p1.opponentValidationPromise = validateOpponent(p1, p2);
        p2.opponentValidationPromise = validateOpponent(p2, p1);
        const promise = Promise.all([
            p1.opponentValidationPromise,
            p2.opponentValidationPromise,
        ]);
        promise.then(() => {
            removeFromMatchMaker(p1);
            removeFromMatchMaker(p2);
            startBattle(p1, p2);
        }).catch(err => {
            console.log('Could not match:', err.message);
        }).finally(() => {
            p1.opponentValidationPromise = null;
            p2.opponentValidationPromise = null;
        });
    }
    console.timeEnd('updateMatchMaker');
}
function startBattle(p1, p2) {
    const [pos1, pos2] = BattleUtils_1.default.getRandomStartPositions();
    const starterID = Math.random() > 0.5 ? p1.id : p2.id;
    const p1Data = {
        id: p1.id,
        name: p1.name,
        setup: p1.setup,
        position: pos1,
    };
    const p2Data = {
        id: p2.id,
        name: p2.name,
        setup: p2.setup,
        position: pos2,
    };
    const battle = new Battle_1.default({
        online: true,
        playerID: p1.id,
        starterID,
        p1: p1Data,
        p2: p2Data,
    });
    p1.battleData = {
        opponent: p2,
        battle,
    };
    p2.battleData = {
        opponent: p1,
        battle,
    };
    p1.emit('battle.start', {
        online: true,
        playerID: p1.id,
        starterID,
        p1: p1Data,
        p2: p2Data,
    }).catch(err => {
        console.log('p1 can\'t battle:', err.message);
        leaveBattle(p1);
    });
    p2.emit('battle.start', {
        online: true,
        playerID: p2.id,
        starterID,
        p1: p1Data,
        p2: p2Data,
    }).catch(err => {
        console.log('p2 can\'t battle:', err.message);
        leaveBattle(p2);
    });
}
;
function leaveBattle(player) {
    if (!player.battleData) {
        return;
    }
    if (!player.battleData.battle.complete) {
        BattleManager_1.default.setBattleComplete(player.battleData.battle, player.battleData.opponent.id, true);
        leaveBattle(player.battleData.opponent);
        player.battleData.opponent.emit('battle.opponent_quit').catch();
    }
    player.battleData = null;
}
function addToMatchMaker(player) {
    if (!matchMakerPool.includes(player)) {
        matchMakerPool.push(player);
    }
}
function isInMatchMaker(player) {
    return matchMakerPool.includes(player);
}
function removeFromMatchMaker(player) {
    const index = matchMakerPool.indexOf(player);
    if (index >= 0) {
        matchMakerPool.splice(index, 1);
    }
}
function validateOpponent(player, opponent) {
    return player.psocket.emit('match_maker.is_valid_setup', {
        setup: opponent.setup,
        setupHash: opponent.setupHash,
    }, 5000);
}
function* pairs(array) {
    for (let i = 0; i < array.length; ++i) {
        for (var j = i + 1; j < array.length; ++j) {
            yield [array[i], array[j]];
        }
    }
}
