"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomStartPositions = void 0;
function getDirection(battle) {
    const { player, opponent } = BattleUtils.getPlayerAndOpponent(battle);
    return (player.position < opponent.position
        ? 1
        : -1);
}
function isPlayerTurn(battle) {
    return battle.turnOwnerID === battle.playerID;
}
function getRandomStartPositions() {
    const presets = [[4, 5], [3, 6], [2, 7]];
    return presets[Math.floor(Math.random() * presets.length)];
}
exports.getRandomStartPositions = getRandomStartPositions;
function canBattleWithSetup(setup) {
    const items = (typeof setup[0] === 'number') ? ItemsManager.ids2items(setup) : setup;
    const modules = items.slice(12, 20).filter(Boolean);
    const resistances = [];
    const weight = items.filter(Boolean)
        .reduce((a, b) => a + (b.stats.weight || 0), 0);
    const cant = (reason) => ({
        can: false,
        reason
    });
    if (!items[0]) {
        return cant(`Missing torso`);
    }
    if (items[1]) {
        if (!items[1].stats.jump) {
            const weapons = items.slice(2, 8).filter(Boolean);
            for (const weapon of weapons) {
                if ('advance' in weapon.stats || 'retreat' in weapon.stats) {
                    if (!weapon.tags.includes('melee')) {
                        return cant(`${weapon.name} requires jumping! The legs you're using can't jump.`);
                    }
                }
            }
        }
    }
    else {
        return cant(`Missing legs`);
    }
    for (const modu of modules) {
        for (const elementPrefix of ['phy', 'exp', 'ele']) {
            const resStatKey = elementPrefix + 'Res';
            if (resStatKey in modu.stats) {
                if (resistances.includes(resStatKey)) {
                    return cant(`Can not use multiple modules with the same resistance type in battle.`);
                }
                else {
                    resistances.push(resStatKey);
                }
            }
        }
    }
    if (weight > 1015) {
        return cant('Too heavy');
    }
    return {
        can: true,
        reason: ''
    };
}
function getItemRangePlot(battle, itemIndex) {
    const { attacker, defender } = getAttackerAndDefender(battle);
    const item = attacker.items[itemIndex];
    if (!item) {
        throw new Error(`Item for index (${itemIndex}) of player "${attacker.name}" is ${item}`);
    }
    const result = Array(10).fill(true);
    if (item.stats.range === undefined) {
        return result;
    }
    const dir = attacker.position < defender.position ? 1 : -1;
    const { range } = item.stats;
    return result.map((_, i) => i * dir >= attacker.position * dir + range[0] &&
        i * dir <= attacker.position * dir + range[1]);
}
function getAttackerAndDefender(battle) {
    return (battle.p1.id === battle.turnOwnerID
        ? { attacker: battle.p1, defender: battle.p2 }
        : { defender: battle.p1, attacker: battle.p2 });
}
function getTeleportablePositions(battle) {
    const positions = Array(10).fill(true);
    positions[battle.p1.position] = false;
    positions[battle.p2.position] = false;
    return positions;
}
function getWalkablePositions(battle) {
    const { attacker, defender } = getAttackerAndDefender(battle);
    const legs = attacker.items[1];
    const maxDistance = Math.max(legs.stats.walk || 0, legs.stats.jump || 0);
    const positions = Array(10).fill(false);
    if (maxDistance) {
        for (let i = 0; i < positions.length; i++) {
            positions[i] = (i <= attacker.position + maxDistance &&
                i >= attacker.position - maxDistance);
        }
    }
    if (!legs.stats.jump) {
        const distance = Math.abs(attacker.position - defender.position);
        const direction = attacker.position < defender.position ? 1 : -1;
        for (let i = 0; i < positions.length; i++) {
            positions[i] = positions[i] && (i * direction < attacker.position * direction + distance);
        }
    }
    positions[battle.p1.position] = false;
    positions[battle.p2.position] = false;
    return positions;
}
function canPlayerUseItem(battle, itemIndex, suppressList = []) {
    const { attacker, defender } = getAttackerAndDefender(battle);
    const item = attacker.items[itemIndex];
    const cant = (reason) => ({ can: false, reason });
    if (item === null) {
        return cant(`No item with index ${itemIndex}`);
    }
    if (item.stats.eneCost && item.stats.eneCost > attacker.stats.energy) {
        return cant('Low energy');
    }
    if (item.stats.backfire && item.stats.backfire >= attacker.stats.health) {
        return cant('Low health');
    }
    if (attacker.uses[itemIndex] < 1) {
        return cant('Out of uses');
    }
    if (itemIndex > 1 && itemIndex < 8) {
        if (attacker.usedInTurn.includes(itemIndex)) {
            return cant('Already used in this turn');
        }
    }
    if (!suppressList.includes('range') && item.stats.range) {
        const range = getItemRangePlot(battle, itemIndex);
        if (!range[defender.position]) {
            return cant('Out of range');
        }
    }
    if ((item.stats.advance || item.stats.retreat) && !item.tags.includes('melee')) {
        if (!attacker.items[1] || !attacker.items[1].stats.jump) {
            return cant('Jumping required');
        }
    }
    if (item.stats.retreat) {
        const dir = attacker.position < defender.position ? 1 : -1;
        const futurePosition = attacker.position - item.stats.retreat * dir;
        if (futurePosition < 0 || futurePosition > 9) {
            return cant('Out of retreat range');
        }
    }
    return { can: true, reason: '' };
}
function getDamageToDeal(battle, itemIndex) {
    const typesWithDamage = [
        'LEGS', 'SIDE_WEAPON', 'TOP_WEAPON', 'DRONE',
        'CHARGE_ENGINE', 'TELEPORTER', 'GRAPPLING_HOOK'
    ];
    const { attacker, defender } = getAttackerAndDefender(battle);
    const item = attacker.items[itemIndex];
    if (!typesWithDamage.includes(item.type)) {
        return 0;
    }
    const statElement = item.element.substring(0, 3).toLowerCase();
    const dmgStatKey = statElement + 'Dmg';
    const resStatKey = statElement + 'Res';
    const dmgStatValue = item.stats[dmgStatKey];
    let damage = 0;
    if (typeof dmgStatValue !== 'undefined') {
        const [dmgStatMin, dmgStatMax] = dmgStatValue;
        damage += dmgStatMin + Math.round(Math.random() * (dmgStatMax - dmgStatMin));
        if (defender.stats[resStatKey]) {
            damage = Math.max(1, damage - defender.stats[resStatKey]);
        }
    }
    if (item.stats.eneDmg) {
        damage -= Math.min(0, defender.stats.energy - item.stats.eneDmg);
    }
    return damage;
}
function getUsableWeapons(battle, suppressList = []) {
    const { attacker } = getAttackerAndDefender(battle);
    const usable = [];
    for (const data of attacker.weapons) {
        if (canPlayerUseItem(battle, data[1], suppressList).can) {
            usable.push(data);
        }
    }
    return usable;
}
function getPlayerAndOpponent(battle) {
    return (battle.playerID === battle.p1.id
        ? { player: battle.p1, opponent: battle.p2 }
        : { player: battle.p2, opponent: battle.p1 });
}
const BattleUtils = {
    getDirection,
    isPlayerTurn,
    getRandomStartPositions,
    canBattleWithSetup,
    getAttackerAndDefender,
    getTeleportablePositions,
    getItemRangePlot,
    getWalkablePositions,
    canPlayerUseItem,
    getDamageToDeal,
    getUsableWeapons,
    getPlayerAndOpponent,
};
exports.default = BattleUtils;
