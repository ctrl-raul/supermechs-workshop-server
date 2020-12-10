"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const rt = __importStar(require("runtypes"));
const Battle_1 = __importDefault(require("./Battle"));
const BattleManager_1 = __importDefault(require("../managers/BattleManager"));
const pool = [];
class Connection {
    constructor(procket) {
        this.opponent = null;
        this.battle = null;
        this.inArenaPool = false;
        this.inMatchingPhase = false;
        this.procket = procket;
        this.ip = procket.socket.handshake.headers['x-forwarded-for'];
        this.setListeners(procket);
    }
    setListeners(procket) {
        procket.on('arena_pool_join', (resolve, reject, data) => {
            if (this.inArenaPool) {
                reject({ error: true, message: `Already in pool` });
                return;
            }
            if (this.battle) {
                reject({ error: true, message: `In battle` });
                return;
            }
            if (this.inMatchingPhase) {
                reject({ error: true, message: `In matching phase` });
                return;
            }
            const data_runtype = rt.Record({
                name: rt.String,
                setup: rt.Array(rt.Unknown),
                items_pack_hash: rt.String
            });
            try {
                const _data = data_runtype.check(data);
                this.name = _data.name;
                this.setup = _data.setup;
                this.items_pack_hash = _data.items_pack_hash;
                this.inArenaPool = true;
                pool.push(this);
                resolve();
                this.tickMatchMaking();
            }
            catch (error) {
                reject({ error: true, message: error.message });
            }
            console.log('Pool:', pool.map(c => c.name).join(' '));
        });
        procket.on('arena_pool_quit', (resolve, reject) => {
            if (!this.inArenaPool) {
                this.inArenaPool = false;
                reject({ error: true, message: `Not in arena pool` });
                return;
            }
            if (this.battle) {
                reject({ error: true, message: `In battle` });
                return;
            }
            if (this.inMatchingPhase) {
                reject({ error: true, message: `In matching phase` });
                return;
            }
            this.arenaPoolQuit() ? (resolve()) : (reject({ error: true, code: 500, message: '' }));
            console.log('Pool:', pool.map(c => c.name).join(' '));
        });
        procket.on('battle_action', (resolve, reject, data) => __awaiter(this, void 0, void 0, function* () {
            if (this.inArenaPool) {
                return reject({ message: `In arena pool` });
            }
            if (!this.battle || !this.opponent) {
                this.battle = null;
                this.opponent = null;
                return reject({ message: `Not in battle` });
            }
            if (this.inMatchingPhase) {
                return reject({ message: `In matching phase` });
            }
            if (this.procket.socket.id !== this.battle.players[this.battle.turnOwnerIndex].id) {
                return reject({ message: `Not your turn` });
            }
            const data_runtype = rt.Record({
                action: rt.Union(rt.Literal('cooldown'), rt.Literal('drone_toggle'), rt.Literal('charge'), rt.Literal('teleport'), rt.Literal('hook'), rt.Literal('fire'), rt.Literal('stomp'), rt.Literal('walk')),
                args: rt.Record({
                    double: rt.Boolean.Or(rt.Undefined),
                    position: rt.Number.Or(rt.Undefined),
                    itemIndex: rt.Number.Or(rt.Undefined)
                })
            });
            try {
                const _data = data_runtype.check(data);
                BattleManager_1.default.resolveAction(this.battle, _data.action, _data.args);
                const { battle } = this;
                const turnOwnerID = this.battle.players[this.battle.turnOwnerIndex].id;
                delete battle.players[0].battle;
                delete battle.players[1].battle;
                const safeBattleData = JSON.parse(JSON.stringify(battle));
                battle.players[0].battle = battle;
                battle.players[1].battle = battle;
                Promise.all([
                    this.emit('battle_update', { battle: safeBattleData, turnOwnerID }),
                    this.opponent.emit('battle_update', { battle: safeBattleData, turnOwnerID })
                ]).then(() => resolve());
                if (battle.over) {
                    this.finishBattle(false);
                }
            }
            catch (error) {
                reject({ error: true, message: error.message });
                throw error;
            }
        }));
        procket.on('battle_quit', (resolve, _reject) => {
            resolve();
            this.finishBattle(true);
        });
        procket.socket.on('disconnect', () => {
            this.arenaPoolQuit();
            if (this.battle) {
                this.finishBattle(true);
            }
        });
    }
    emit(event, data) {
        return this.procket.emit(event, data);
    }
    arenaPoolQuit() {
        if (pool.includes(this)) {
            pool.splice(pool.indexOf(this), 1);
            this.inArenaPool = false;
            return true;
        }
        return false;
    }
    tickMatchMaking() {
        for (const conn of pool) {
            if (conn !== this && !conn.inMatchingPhase) {
                if (conn.items_pack_hash === this.items_pack_hash) {
                    this.inMatchingPhase = true;
                    conn.inMatchingPhase = true;
                    this.arena_pool_validate_opponent(conn)
                        .then(() => {
                        this.startBattle(conn);
                    })
                        .catch(error => {
                        console.log('Match failed', [this.name, conn.name]);
                        console.log(error);
                    })
                        .finally(() => {
                        this.inMatchingPhase = false;
                        conn.inMatchingPhase = false;
                    });
                }
            }
        }
    }
    startBattle(conn) {
        this.arenaPoolQuit();
        conn.arenaPoolQuit();
        const battle = new Battle_1.default(this, conn);
        const turnOwnerID = battle.players[battle.turnOwnerIndex].id;
        this.battle = battle;
        conn.battle = battle;
        this.opponent = conn;
        conn.opponent = this;
        delete battle.players[0].battle;
        delete battle.players[1].battle;
        const safeBattleData = JSON.parse(JSON.stringify(battle));
        battle.players[0].battle = battle;
        battle.players[1].battle = battle;
        const promise = Promise.all([
            this.procket.emit('battle_start', { battle: safeBattleData, turnOwnerID }),
            conn.procket.emit('battle_start', { battle: safeBattleData, turnOwnerID })
        ]);
        promise.then(console.log).catch(console.error);
    }
    finishBattle(quit) {
        if (this.opponent) {
            if (quit) {
                this.opponent.emit('battle_opponent_quit')
                    .catch(console.error);
            }
            this.opponent.name = '';
            this.opponent.setup = [];
            this.opponent.items_pack_hash = '';
            this.opponent.opponent = null;
            this.opponent.battle = null;
        }
        this.name = '';
        this.setup = [];
        this.items_pack_hash = '';
        this.opponent = null;
        this.battle = null;
    }
    arena_pool_validate_opponent(conn) {
        return Promise.all([
            this.emit('arena_pool_validate_opponent', { setup: conn.setup }),
            conn.emit('arena_pool_validate_opponent', { setup: this.setup })
        ]);
    }
}
exports.default = Connection;
//# sourceMappingURL=Connection.js.map