"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stats_1 = __importDefault(require("../data/stats"));
class BattlePlayerData {
    constructor(data) {
        this.usedInTurn = [];
        this.droneActive = false;
        const statsMap = getStats(data.setup);
        const { health = 1, eneCap = 1, eneReg = 1, heaCap = 1, heaCol = 1, phyRes = 0, expRes = 0, eleRes = 0, } = statsMap;
        const itemsAndIndexes = data.setup.map((item, i) => item ? [item, i] : null);
        this.name = data.name;
        this.id = data.id;
        this.weapons = itemsAndIndexes.slice(2, 8).filter(x => x !== null);
        this.specials = itemsAndIndexes.slice(8, 12).filter(x => x !== null);
        this.position = data.position;
        this.items = data.setup;
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
function getStats(source) {
    const stats = getMechSummary(source);
    const buffFunctions = {
        add: (x, amount) => x + amount,
        mul: (x, amount) => x * amount
    };
    const keys = Object.keys(stats);
    for (const key of keys) {
        const value = stats[key];
        if (!value || key === 'health') {
            continue;
        }
        const statTemplate = stats_1.default.find(data => data.key === key);
        if (!statTemplate) {
            console.error(`Unknown stat '${key}'`);
            continue;
        }
        if (statTemplate.buff) {
            const { buff } = statTemplate;
            const buffFunction = buffFunctions[buff.mode];
            if (Array.isArray(value)) {
                stats[key] = value.map(x => Math.round(buffFunction(x, buff.amount)));
            }
            else {
                stats[key] = Math.round(buffFunction(value, buff.amount));
            }
        }
    }
    return stats;
}
function getMechSummary(items) {
    const mechStatsKeys = [
        'weight', 'health', 'eneCap',
        'eneReg', 'heaCap', 'heaCol',
        'phyRes', 'expRes', 'eleRes'
    ];
    const sum = {};
    for (const item of items) {
        if (item === null) {
            continue;
        }
        for (const key of mechStatsKeys) {
            const value = (item.stats[key] || 0);
            const current = sum[key];
            sum[key] = typeof current === 'undefined' ? value : current + value;
        }
    }
    if (sum.weight) {
        const maxWeight = 1000;
        const healthPenaltyForWeight = 15;
        if (sum.weight > maxWeight) {
            const penalty = (sum.weight - maxWeight) * healthPenaltyForWeight;
            sum.health = (sum.health || 0) - penalty;
        }
    }
    return sum;
}
