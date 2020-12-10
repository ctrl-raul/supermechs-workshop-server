"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BattlePlayerData_1 = __importDefault(require("./BattlePlayerData"));
const arrayRandom_1 = require("../utils/arrayRandom");
class Battle {
    constructor(conn1, conn2) {
        this.logs = [];
        this.turns = 1;
        this.turnOwnerIndex = 0;
        this.multiplayer = true;
        this.over = false;
        this.quit = false;
        const positions = arrayRandom_1.arrayRandomItem([[4, 5], [3, 6], [2, 7]]);
        this.players = [
            new BattlePlayerData_1.default(conn1, positions[0], this),
            new BattlePlayerData_1.default(conn2, positions[1], this)
        ];
        this.turnOwnerIndex = 0;
    }
}
exports.default = Battle;
//# sourceMappingURL=Battle.js.map