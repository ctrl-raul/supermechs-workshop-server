"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rawStatsData = [{
        key: 'weight',
        name: 'Weight',
        type: 'number',
        buff: null
    }, {
        key: 'health',
        name: 'Health',
        type: 'number',
        buff: {
            mode: 'add',
            amount: 350
        }
    }, {
        key: 'eneCap',
        name: 'Energy Capacity',
        type: 'number',
        buff: {
            mode: 'mul',
            amount: 1.2
        }
    }, {
        key: 'eneReg',
        name: 'Energy Regeneration',
        type: 'number',
        buff: {
            mode: 'mul',
            amount: 1.2
        }
    }, {
        key: 'heaCap',
        name: 'Heat Capacity',
        type: 'number',
        buff: {
            mode: 'mul',
            amount: 1.2
        }
    }, {
        key: 'heaCol',
        name: 'Cooling',
        type: 'number',
        buff: {
            mode: 'mul',
            amount: 1.2
        }
    }, {
        key: 'phyRes',
        name: 'Physical Resistance',
        type: 'number',
        buff: {
            mode: 'mul',
            amount: 1.4
        }
    }, {
        key: 'expRes',
        name: 'Explosive Resistance',
        type: 'number',
        buff: {
            mode: 'mul',
            amount: 1.4
        }
    }, {
        key: 'eleRes',
        name: 'Electric Resistance',
        type: 'number',
        buff: {
            mode: 'mul',
            amount: 1.4
        }
    }, {
        key: 'phyDmg',
        name: 'Physical Damage',
        type: 'range',
        buff: {
            mode: 'mul',
            amount: 1.2
        }
    }, {
        key: 'phyResDmg',
        name: 'Physical Resistance Damage',
        type: 'number',
        buff: null
    }, {
        key: 'eleDmg',
        name: 'Electric Damage',
        type: 'range',
        buff: {
            mode: 'mul',
            amount: 1.2
        }
    }, {
        key: 'eneDmg',
        name: 'Energy Damage',
        type: 'number',
        buff: {
            mode: 'mul',
            amount: 1.2
        }
    }, {
        key: 'eneCapDmg',
        name: 'Energy Capacity Damage',
        type: 'number',
        buff: null
    }, {
        key: 'eneRegDmg',
        name: 'Energy Regeneration Damage',
        type: 'number',
        buff: null
    }, {
        key: 'eleResDmg',
        name: 'Electric Resistance Damage',
        type: 'number',
        buff: null
    }, {
        key: 'expDmg',
        name: 'Explosive Damage',
        type: 'range',
        buff: {
            mode: 'mul',
            amount: 1.2
        }
    }, {
        key: 'heaDmg',
        name: 'Heat Damage',
        type: 'number',
        buff: {
            mode: 'mul',
            amount: 1.2
        }
    }, {
        key: 'heaCapDmg',
        name: 'Heat Capacity Damage',
        type: 'number',
        buff: null
    }, {
        key: 'heaColDmg',
        name: 'Cooling Damage',
        type: 'number',
        buff: null
    }, {
        key: 'expResDmg',
        name: 'Explosive Resistance Damage',
        type: 'number',
        buff: null
    }, {
        key: 'walk',
        name: 'Walking Distance',
        type: 'number',
        buff: null
    }, {
        key: 'jump',
        name: 'Jumping Distance',
        type: 'number',
        buff: null
    }, {
        key: 'range',
        name: 'Range',
        type: 'range',
        buff: null
    }, {
        key: 'push',
        name: 'Knockback',
        type: 'number',
        buff: null
    }, {
        key: 'pull',
        name: 'Pull',
        type: 'number',
        buff: null
    }, {
        key: 'recoil',
        name: 'Recoil',
        type: 'number',
        buff: null
    }, {
        key: 'advance',
        name: 'Advance',
        type: 'number',
        buff: null
    }, {
        key: 'retreat',
        name: 'Retreat',
        type: 'number',
        buff: null
    }, {
        key: 'uses',
        name: 'Uses',
        type: 'number',
        buff: null
    }, {
        key: 'backfire',
        name: 'Backfire',
        type: 'number',
        buff: {
            mode: 'mul',
            amount: 0.8
        }
    }, {
        key: 'heaCost',
        name: 'Heat Generation',
        type: 'number',
        buff: null
    }, {
        key: 'eneCost',
        name: 'Energy Consumption',
        type: 'number',
        buff: null
    }];
class StatsManager {
    constructor() {
        this.mechStatsKeys = [
            'weight', 'health', 'eneCap',
            'eneReg', 'heaCap', 'heaCol',
            'phyRes', 'expRes', 'eleRes'
        ];
    }
    getMechSummary(items) {
        const sum = {};
        for (const item of items) {
            if (item === null) {
                continue;
            }
            for (const key of this.mechStatsKeys) {
                const value = item.stats[key] || 0;
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
    getStats(source) {
        let shouldBuffHealth = false;
        const stats = (Array.isArray(source)
            ? (shouldBuffHealth = true) && this.getMechSummary(source)
            : Object.assign({}, source.stats));
        const buffFunctions = {
            add: (x, amount) => x + amount,
            mul: (x, amount) => x * amount
        };
        const keys = Object.keys(stats);
        for (const key of keys) {
            const value = stats[key];
            if (!value || (key === 'health' && !shouldBuffHealth)) {
                continue;
            }
            const statTemplate = rawStatsData.find(data => data.key === key);
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
}
exports.default = new StatsManager();
//# sourceMappingURL=StatsManager.js.map