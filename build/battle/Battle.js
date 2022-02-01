"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BattlePlayerData_1 = __importDefault(require("./BattlePlayerData"));
class Battle {
    constructor(data) {
        this.logs = [];
        this.turns = 1;
        this.complete = null;
        this.online = data.online;
        this.turnOwnerID = data.starterID;
        this.playerID = data.playerID;
        this.p1 = new BattlePlayerData_1.default(data.p1);
        this.p2 = new BattlePlayerData_1.default(data.p2);
    }
}
exports.default = Battle;
