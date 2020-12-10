"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = __importDefault(require("src/utils/env"));
const StatsManager_1 = __importDefault(require("../managers/StatsManager"));
const randomHSL_1 = __importDefault(require("../utils/randomHSL"));
class BattlePlayerData {
    constructor(conn, position, battle) {
        this.usedInTurn = [];
        this.droneActive = false;
        this.id = conn.procket.socket.id;
        this.admin = conn.ip === env_1.default('ADMIN_ADDRESS', '');
        this.battle = battle;
        const mech = {
            name: conn.name,
            setup: conn.setup
        };
        const statsMap = StatsManager_1.default.getStats(mech.setup);
        const { health = 1, eneCap = 1, eneReg = 1, heaCap = 1, heaCol = 1, phyRes = 0, expRes = 0, eleRes = 0, } = statsMap;
        const itemsAndIndexes = mech.setup.map((item, i) => item ? [item, i] : null);
        this.weapons = itemsAndIndexes.slice(2, 8).filter(x => x !== null);
        this.specials = itemsAndIndexes.slice(8, 12).filter(x => x !== null);
        this.logColor = randomHSL_1.default();
        this.mech = mech;
        this.position = position;
        this.items = mech.setup;
        this.uses = this.items.map(item => item && item.stats.uses ? item.stats.uses : Infinity);
        this.stats = {
            healthCap: health,
            health: health,
            eneCap: eneCap,
            energy: eneCap,
            eneReg: eneReg,
            heaCap: heaCap,
            heat: 0,
            heaCol: heaCol,
            phyRes: phyRes,
            expRes: expRes,
            eleRes: eleRes
        };
    }
}
exports.default = BattlePlayerData;
//# sourceMappingURL=BattlePlayerData.js.map