"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BattleUtils_1 = __importDefault(require("./BattleUtils"));
const eventHandlers = {
    drone_toggle(battle) {
        const { attacker } = BattleUtils_1.default.getAttackerAndDefender(battle);
        const droneIndex = 8;
        const drone = attacker.items[droneIndex];
        if (!drone) {
            log(battle, 3, `%attacker% tried to toggle drone but doesn't have one. Wasted a turn.`);
            passTurn(battle);
            return;
        }
        attacker.droneActive = !attacker.droneActive;
        if (attacker.droneActive && drone.stats.uses) {
            attacker.uses[droneIndex] = drone.stats.uses;
        }
        log(battle, 0, `%attacker% ${attacker.droneActive ? 'enabled' : 'disabled'} drone`);
        passTurn(battle);
    },
    stomp(battle, event) {
        const { attacker } = BattleUtils_1.default.getAttackerAndDefender(battle);
        const legsIndex = 1;
        const legs = attacker.items[1];
        const finalDamage = effectHandlers.deal_damages(battle, 1, event.damageDealt);
        log(battle, 0, `%attacker% stomped with ${legs.name} (${finalDamage} damage)`);
        effectHandlers.count_item_usage(battle, legsIndex);
        passTurn(battle);
    },
    cooldown(battle, event) {
        const { doubleCooldown } = event;
        if (typeof doubleCooldown === 'undefined') {
            throw new TypeError(`'doubleCooldown' argument missing to execute action 'cooldown'`);
        }
        const { attacker } = BattleUtils_1.default.getAttackerAndDefender(battle);
        const cooldown = Math.min(attacker.stats.heaCol * (doubleCooldown ? 2 : 1), attacker.stats.heat);
        attacker.stats.heat -= cooldown;
        log(battle, 0, `%attacker% cooled down by ${cooldown}`);
        if (doubleCooldown) {
            effectHandlers.energy_regeneration(battle);
            switchTurnOwner(battle);
        }
        else {
            passTurn(battle);
        }
    },
    use_weapon(battle, event) {
        const { weaponIndex, damageDealt } = event;
        if (typeof weaponIndex === 'undefined') {
            throw new TypeError(`'weaponIndex' argument missing to execute action 'fire'`);
        }
        const { attacker } = BattleUtils_1.default.getAttackerAndDefender(battle);
        if (attacker.uses[weaponIndex] < 1) {
            throw new TypeError(`Tried to use item without uses left`);
        }
        const item = attacker.items[weaponIndex];
        const finalDamage = effectHandlers.deal_damages(battle, weaponIndex, damageDealt);
        log(battle, 0, `%attacker% used ${item.name} (${finalDamage} damage)`);
        effectHandlers.count_item_usage(battle, weaponIndex);
        passTurn(battle);
    },
    charge_engine(battle, event) {
        const { attacker, defender } = BattleUtils_1.default.getAttackerAndDefender(battle);
        const chargeIndex = 9;
        if (attacker.uses[chargeIndex] < 1) {
            throw new TypeError(`Tried to use item without uses left`);
        }
        const charge = attacker.items[chargeIndex];
        const dir = attacker.position < defender.position ? 1 : -1;
        const finalDamage = effectHandlers.deal_damages(battle, chargeIndex, event.damageDealt);
        attacker.position = defender.position - dir;
        defender.position = Math.max(0, Math.min(9, defender.position + dir));
        log(battle, 0, `%attacker% charged using ${charge.name} (${finalDamage} damage)`);
        effectHandlers.count_item_usage(battle, chargeIndex);
        passTurn(battle);
    },
    grappling_hook(battle, args) {
        const { attacker, defender } = BattleUtils_1.default.getAttackerAndDefender(battle);
        const hookIndex = 11;
        if (attacker.uses[hookIndex] < 1) {
            throw new TypeError(`Tried to use item without uses left`);
        }
        const hook = attacker.items[hookIndex];
        const dir = attacker.position < defender.position ? 1 : -1;
        const finalDamage = effectHandlers.deal_damages(battle, hookIndex, args.damageDealt);
        defender.position = attacker.position + dir;
        log(battle, 0, `%attacker% grappled using ${hook.name} (${finalDamage} damage)`);
        effectHandlers.count_item_usage(battle, hookIndex);
        passTurn(battle);
    },
    teleport(battle, args) {
        const { movingPosition } = args;
        if (typeof movingPosition === 'undefined') {
            throw new TypeError(`'movingPosition' argument missing to execute action 'teleport'`);
        }
        const { attacker, defender } = BattleUtils_1.default.getAttackerAndDefender(battle);
        const teleporterIndex = 10;
        if (attacker.uses[teleporterIndex] < 1) {
            throw new TypeError(`Tried to use item without uses left`);
        }
        const teleporter = attacker.items[teleporterIndex];
        const dir = movingPosition < defender.position ? 1 : -1;
        const initial = attacker.position;
        const finalDamage = (attacker.position + dir === defender.position
            ? effectHandlers.deal_damages(battle, teleporterIndex, args.damageDealt)
            : 0);
        attacker.position = movingPosition;
        log(battle, 0, `%attacker% teleported from ${initial} to ${attacker.position} using ${teleporter.name} (${finalDamage} damage)`);
        effectHandlers.count_item_usage(battle, teleporterIndex);
        passTurn(battle);
    },
    walk(battle, args) {
        const { movingPosition } = args;
        if (typeof movingPosition === 'undefined') {
            throw new TypeError(`'position' argument missing to execute action 'walk'`);
        }
        const { attacker } = BattleUtils_1.default.getAttackerAndDefender(battle);
        const initial = attacker.position;
        attacker.position = movingPosition;
        log(battle, 0, `%attacker% moved from position ${initial} to ${movingPosition}`);
        passTurn(battle);
    },
};
const effectHandlers = {
    drone_fire(battle) {
        const { attacker } = BattleUtils_1.default.getAttackerAndDefender(battle);
        const droneIndex = 8;
        const drone = attacker.items[droneIndex];
        const { can, reason } = BattleUtils_1.default.canPlayerUseItem(battle, droneIndex);
        if (!can) {
            log(battle, 2, `%attacker% can't use drone (${reason})`);
            return;
        }
        if (attacker.uses[droneIndex] < 1) {
            attacker.uses[droneIndex] = drone.stats.uses;
            attacker.droneActive = false;
        }
        const dmgDealt = effectHandlers.deal_damages(battle, droneIndex);
        effectHandlers.count_item_usage(battle, droneIndex);
        log(battle, 1, `%attacker% used ${drone.name} (${dmgDealt} damage)`);
    },
    deal_damages(battle, itemIndex, damage) {
        if (typeof damage === 'undefined') {
            damage = BattleUtils_1.default.getDamageToDeal(battle, itemIndex);
        }
        const { attacker, defender } = BattleUtils_1.default.getAttackerAndDefender(battle);
        const item = attacker.items[itemIndex];
        const statElement = item.element.substring(0, 3).toLowerCase();
        const resStatKey = statElement + 'Res';
        const resStatDmgKey = resStatKey + 'Dmg';
        attacker.stats.health -= item.stats.backfire || 0;
        attacker.stats.heat += item.stats.heaCost || 0;
        attacker.stats.energy -= item.stats.eneCost || 0;
        defender.stats.health -= damage;
        defender.stats.heat += item.stats.heaDmg || 0;
        defender.stats[resStatKey] -= item.stats[resStatDmgKey] || 0;
        if (item.stats.heaCapDmg) {
            defender.stats.heaCap = Math.max(1, defender.stats.heaCap - item.stats.heaCapDmg);
        }
        if (item.stats.heaColDmg) {
            defender.stats.heaCol = Math.max(1, defender.stats.heaCol - item.stats.heaColDmg);
        }
        if (item.stats.eneDmg) {
            defender.stats.energy = Math.max(0, defender.stats.energy - item.stats.eneDmg || 0);
        }
        if (item.stats.eneCapDmg) {
            defender.stats.eneCap = Math.max(1, defender.stats.eneCap - item.stats.eneCapDmg);
            defender.stats.energy = Math.min(defender.stats.eneCap, defender.stats.energy);
        }
        if (item.stats.eneRegDmg) {
            defender.stats.eneReg = Math.max(1, defender.stats.eneReg - item.stats.eneRegDmg);
        }
        effectHandlers.update_positions(battle, itemIndex);
        return damage;
    },
    count_item_usage(battle, itemIndex) {
        const { attacker } = BattleUtils_1.default.getAttackerAndDefender(battle);
        const item = attacker.items[itemIndex];
        attacker.uses[itemIndex]--;
        attacker.usedInTurn.push(itemIndex);
        if (attacker.uses[itemIndex] < 1) {
            if (item.type === 'DRONE') {
                attacker.droneActive = false;
            }
            log(battle, 2, `%attacker% ran out of ${item.name} uses`);
        }
    },
    update_positions(battle, itemIndex) {
        const { attacker, defender } = BattleUtils_1.default.getAttackerAndDefender(battle);
        const item = attacker.items[itemIndex];
        const dir = attacker.position < defender.position ? 1 : -1;
        if (item.stats.recoil) {
            attacker.position = Math.max(0, Math.min(9, attacker.position - item.stats.recoil * dir));
        }
        if (item.stats.retreat) {
            attacker.position -= item.stats.retreat * dir;
        }
        if (item.stats.advance) {
            attacker.position = (attacker.position * dir + item.stats.advance < defender.position * dir
                ? attacker.position + item.stats.advance * dir
                : defender.position - dir);
        }
        if (item.stats.push) {
            defender.position = Math.max(0, Math.min(9, defender.position + item.stats.push * dir));
        }
        if (item.stats.pull) {
            defender.position = (defender.position * dir - item.stats.pull > attacker.position * dir
                ? defender.position - item.stats.pull * dir
                : attacker.position + dir);
        }
    },
    energy_regeneration(battle) {
        const { attacker } = BattleUtils_1.default.getAttackerAndDefender(battle);
        const initial = attacker.stats.energy;
        if (attacker.stats.eneCap < (attacker.stats.energy + attacker.stats.eneReg)) {
            attacker.stats.energy = attacker.stats.eneCap;
        }
        else {
            attacker.stats.energy += attacker.stats.eneReg;
        }
        log(battle, 1, `regenerated ${attacker.stats.energy - initial} energy`);
        return attacker.stats.energy - initial;
    },
};
function log(battle, type, ...msg) {
    const typeSufixes = ['action', 'effect', 'info', 'ERROR'];
    const { attacker, defender } = BattleUtils_1.default.getAttackerAndDefender(battle);
    const message = msg
        .join(' ')
        .replace(/%attacker%/g, attacker.name)
        .replace(/%defender%/g, defender.name);
    battle.logs.push({
        playerID: battle.playerID,
        message: `[${typeSufixes[type]}] ${message}`,
    });
}
function passTurn(battle) {
    const { attacker } = BattleUtils_1.default.getAttackerAndDefender(battle);
    if (battle.p1.stats.health <= 0 || battle.p2.stats.health <= 0) {
        const winnerID = battle.p1.stats.health <= 0 ? battle.p2.id : battle.p1.id;
        setBattleComplete(battle, winnerID);
        log(battle, 0, 'Battle complete!');
        return;
    }
    battle.turns--;
    if (battle.turns === 0) {
        if (attacker.droneActive) {
            effectHandlers.drone_fire(battle);
        }
        effectHandlers.energy_regeneration(battle);
        switchTurnOwner(battle);
    }
}
function switchTurnOwner(battle) {
    battle.turns = 2;
    battle.turnOwnerID = battle.turnOwnerID === battle.p1.id ? battle.p2.id : battle.p1.id;
    const { attacker, defender } = BattleUtils_1.default.getAttackerAndDefender(battle);
    defender.usedInTurn = [];
    {
        const { heat, heaCap, heaCol } = attacker.stats;
        if (heat > heaCap) {
            handleEvent(battle, {
                name: 'cooldown',
                doubleCooldown: heaCol < heat - heaCap,
            });
        }
    }
}
function handleEvent(battle, event) {
    if (!eventHandlers.hasOwnProperty(event.name)) {
        throw new Error(`Unknown battle event "${event.name}"`);
    }
    eventHandlers[event.name](battle, event);
}
function setBattleComplete(battle, winnerID, quit = false) {
    battle.complete = { winnerID, quit };
}
const BattleManager = {
    setBattleComplete,
    handleEvent,
};
exports.default = BattleManager;
