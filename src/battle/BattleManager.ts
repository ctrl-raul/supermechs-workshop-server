import BattleUtils from "./BattleUtils";
import Battle from "./Battle";



// Types

interface ItemStats {
  weight?: number;
  health?: number;
  eneCap?: number;
  eneReg?: number;
  heaCap?: number;
  heaCol?: number;
  phyRes?: number;
  expRes?: number;
  eleRes?: number;
  bulletsCap?: number;
  rocketsCap?: number;
  phyResDmg?: number;
  expResDmg?: number;
  heaDmg?: number;
  heaCapDmg?: number;
  heaColDmg?: number;
  eleResDmg?: number;
  eneDmg?: number;
  eneCapDmg?: number;
  eneRegDmg?: number;
  walk?: number;
  jump?: number;
  push?: number;
  pull?: number;
  recoil?: number;
  advance?: number;
  retreat?: number;
  uses?: number;
  backfire?: number;
  heaCost?: number;
  eneCost?: number;
  bulletsCost?: number;
  rocketsCost?: number;
  phyDmg?: [number, number];
  expDmg?: [number, number];
  eleDmg?: [number, number];
  range?: [number, number];
}


export interface EssentialItemData {
  id: number;
  name: string;
  type: string;
  element: 'PHYSICAL' | 'EXPLOSIVE' | 'ELECTRIC' | 'COMBINED';
  stats: ItemStats;
  tags: string[];
}


export interface BattleEvent {
	name: keyof typeof eventHandlers;
	weaponIndex?: number;
	damageDealt?: number;
	movingPosition?: number;
	doubleCooldown?: boolean;
}



const eventHandlers = {

	drone_toggle (battle: Battle): void {
    
    const { attacker } = BattleUtils.getAttackerAndDefender(battle);
    const droneIndex = 8;
    const drone = attacker.items[droneIndex];

		if (!drone) {
			log(battle, 3, `%attacker% tried to toggle drone but doesn't have one. Wasted a turn.`);
			passTurn(battle);
			return;
		}

    attacker.droneActive = !attacker.droneActive;
    
    // Refill uses
    if (attacker.droneActive && drone.stats.uses) {
      attacker.uses[droneIndex] = drone.stats.uses;
    }

    log(battle, 0, `%attacker% ${attacker.droneActive ? 'enabled' : 'disabled'} drone`);
    passTurn(battle);
  },


	stomp (battle: Battle, event: BattleEvent): void {
		
		const { attacker } = BattleUtils.getAttackerAndDefender(battle);
    const legsIndex = 1;
    const legs = attacker.items[1] as EssentialItemData;
		const finalDamage = effectHandlers.deal_damages(battle, 1, event.damageDealt);

    log(battle, 0, `%attacker% stomped with ${legs.name} (${finalDamage} damage)`);
    effectHandlers.count_item_usage(battle, legsIndex);
    passTurn(battle);

	},


	cooldown (battle: Battle, event: BattleEvent): void {

    const { doubleCooldown } = event;

    if (typeof doubleCooldown === 'undefined') {
      throw new TypeError(`'doubleCooldown' argument missing to execute action 'cooldown'`);
    }

    const { attacker } = BattleUtils.getAttackerAndDefender(battle);
    const cooldown = Math.min(attacker.stats.heaCol * (doubleCooldown ? 2 : 1), attacker.stats.heat);

    attacker.stats.heat -= cooldown;

    log(battle, 0, `%attacker% cooled down by ${cooldown}`);
    
    if (doubleCooldown) {
      effectHandlers.energy_regeneration(battle);
      switchTurnOwner(battle);
    } else {
      passTurn(battle);
    }
  },


	use_weapon (battle: Battle, event: BattleEvent): void {

    const { weaponIndex, damageDealt } = event;

    if (typeof weaponIndex === 'undefined') {
      throw new TypeError(`'weaponIndex' argument missing to execute action 'fire'`);
    }

    const { attacker } = BattleUtils.getAttackerAndDefender(battle);

    if (attacker.uses[weaponIndex] < 1) {
      throw new TypeError(`Tried to use item without uses left`);
    }

    const item = attacker.items[weaponIndex] as EssentialItemData;
    const finalDamage = effectHandlers.deal_damages(battle, weaponIndex, damageDealt);

    log(battle, 0, `%attacker% used ${item.name} (${finalDamage} damage)`);
    effectHandlers.count_item_usage(battle, weaponIndex);
    passTurn(battle);
  },


	charge_engine (battle: Battle, event: BattleEvent): void {
  
    const { attacker, defender } = BattleUtils.getAttackerAndDefender(battle);
    const chargeIndex = 9;

    if (attacker.uses[chargeIndex] < 1) {
      throw new TypeError(`Tried to use item without uses left`);
    }

    const charge = attacker.items[chargeIndex] as EssentialItemData;
    const dir = attacker.position < defender.position ? 1 : -1;
    const finalDamage = effectHandlers.deal_damages(battle, chargeIndex, event.damageDealt);

    attacker.position = defender.position - dir;
    defender.position = Math.max(0, Math.min(9, defender.position + dir));

    log(battle, 0, `%attacker% charged using ${charge.name} (${finalDamage} damage)`);
    effectHandlers.count_item_usage(battle, chargeIndex);
    passTurn(battle);
  },


	grappling_hook (battle: Battle, args: BattleEvent): void {

    const { attacker, defender } = BattleUtils.getAttackerAndDefender(battle);
    const hookIndex = 11;

    if (attacker.uses[hookIndex] < 1) {
      throw new TypeError(`Tried to use item without uses left`);
    }

    const hook = attacker.items[hookIndex] as EssentialItemData;
    const dir = attacker.position < defender.position ? 1 : -1;
    const finalDamage = effectHandlers.deal_damages(battle, hookIndex, args.damageDealt);

    defender.position = attacker.position + dir;

    log(battle, 0, `%attacker% grappled using ${hook.name} (${finalDamage} damage)`);
    effectHandlers.count_item_usage(battle, hookIndex);
    passTurn(battle);
  },


	teleport (battle: Battle, args: BattleEvent): void {

    const { movingPosition } = args;

    if (typeof movingPosition === 'undefined') {
      throw new TypeError(`'movingPosition' argument missing to execute action 'teleport'`);
    }

    const { attacker, defender } = BattleUtils.getAttackerAndDefender(battle);
    const teleporterIndex = 10;

    if (attacker.uses[teleporterIndex] < 1) {
      throw new TypeError(`Tried to use item without uses left`);
    }

    const teleporter = attacker.items[teleporterIndex] as EssentialItemData;
    const dir = movingPosition < defender.position ? 1 : -1;
    const initial = attacker.position;
    
    // Only deals damage if teleported to opponent's side
    const finalDamage = (
      attacker.position + dir === defender.position
      ? effectHandlers.deal_damages(battle, teleporterIndex, args.damageDealt)
      : 0
    );

    attacker.position = movingPosition;

    log(battle, 0, `%attacker% teleported from ${initial} to ${attacker.position} using ${teleporter.name} (${finalDamage} damage)`);
    effectHandlers.count_item_usage(battle, teleporterIndex);
    passTurn(battle);
  },


	walk (battle: Battle, args: BattleEvent): void {

    const { movingPosition } = args;

    if (typeof movingPosition === 'undefined') {
      throw new TypeError(`'position' argument missing to execute action 'walk'`);
    }

    const { attacker } = BattleUtils.getAttackerAndDefender(battle);
    const initial = attacker.position;
    
    attacker.position = movingPosition;
    log(battle, 0, `%attacker% moved from position ${initial} to ${movingPosition}`);
    passTurn(battle);
  },

};



const effectHandlers = {

	drone_fire (battle: Battle): void {

    const { attacker } = BattleUtils.getAttackerAndDefender(battle);
    const droneIndex = 8;
    const drone = attacker.items[droneIndex] as EssentialItemData;

    const { can, reason } = BattleUtils.canPlayerUseItem(battle, droneIndex);

    if (!can) {
      log(battle, 2, `%attacker% can't use drone (${reason})`);
      return;
    }

    if (attacker.uses[droneIndex] < 1) {
      // @ts-ignore
      attacker.uses[droneIndex] = drone.stats.uses;
      attacker.droneActive = false;
    }

    const dmgDealt = effectHandlers.deal_damages(battle, droneIndex);
    effectHandlers.count_item_usage(battle, droneIndex);

    log(battle, 1, `%attacker% used ${drone.name} (${dmgDealt} damage)`);
  },


	deal_damages (battle: Battle, itemIndex: number, damage?: number): number {


		if (typeof damage === 'undefined') {
			damage = BattleUtils.getDamageToDeal(battle, itemIndex);
		}


    // Returns the total damage dealt

    const { attacker, defender } = BattleUtils.getAttackerAndDefender(battle);
    const item = attacker.items[itemIndex] as EssentialItemData;

    const statElement = item.element.substring(0, 3).toLowerCase();
    
    const resStatKey = statElement + 'Res' as 'phyRes' | 'expRes' | 'eleRes';
    const resStatDmgKey = resStatKey + 'Dmg' as 'phyResDmg' | 'expResDmg' | 'eleResDmg';


    /// Effects on attacker
    attacker.stats.health -= item.stats.backfire || 0;
    attacker.stats.heat += item.stats.heaCost || 0;
    attacker.stats.energy -= item.stats.eneCost || 0;


    /// Effects on defender

    defender.stats.health -= damage;
    defender.stats.heat += item.stats.heaDmg || 0;
    defender.stats[resStatKey] -= item.stats[resStatDmgKey] || 0;

    // Heat capacity damage
    if (item.stats.heaCapDmg) {
      defender.stats.heaCap = Math.max(1, defender.stats.heaCap - item.stats.heaCapDmg);
    }

    // Heat cooling damage
    if (item.stats.heaColDmg) {
      defender.stats.heaCol = Math.max(1, defender.stats.heaCol - item.stats.heaColDmg);
    }

    // energy damage
    if (item.stats.eneDmg) {
      defender.stats.energy = Math.max(0, defender.stats.energy - item.stats.eneDmg || 0);
    }

    // energy capacity damage
    if (item.stats.eneCapDmg) {
      defender.stats.eneCap = Math.max(1, defender.stats.eneCap - item.stats.eneCapDmg);
      defender.stats.energy = Math.min(defender.stats.eneCap, defender.stats.energy);
    }

    // energy regeneration damage
    if (item.stats.eneRegDmg) {
      defender.stats.eneReg = Math.max(1, defender.stats.eneReg - item.stats.eneRegDmg);
    }


    effectHandlers.update_positions(battle, itemIndex);


    return damage;
  },


	count_item_usage (battle: Battle, itemIndex: number): void {
		const { attacker } = BattleUtils.getAttackerAndDefender(battle);
		const item = attacker.items[itemIndex] as EssentialItemData;
	
		attacker.uses[itemIndex]--;
		attacker.usedInTurn.push(itemIndex);
	
		// Drone out of uses
		if (attacker.uses[itemIndex] < 1) {
			if (item.type === 'DRONE') {
				attacker.droneActive = false;
			}
			log(battle, 2, `%attacker% ran out of ${item.name} uses`);
		}
	},


	update_positions (battle: Battle, itemIndex: number): void {

    const { attacker, defender } = BattleUtils.getAttackerAndDefender(battle);
    const item = attacker.items[itemIndex] as EssentialItemData;
    const dir = attacker.position < defender.position ? 1 : -1;
  
    // Movements on attacker

    if (item.stats.recoil) {
      attacker.position = Math.max(0, Math.min(9, attacker.position - item.stats.recoil * dir));
    }

    if (item.stats.retreat) {
      attacker.position -= item.stats.retreat * dir;
    }

    if (item.stats.advance) {
      attacker.position = (
        attacker.position * dir + item.stats.advance < defender.position * dir
        ? attacker.position + item.stats.advance * dir
        : defender.position - dir
      );
    }

    // Movements on defender

    if (item.stats.push) {
      defender.position = Math.max(0, Math.min(9, defender.position + item.stats.push * dir));
    }

    if (item.stats.pull) {
      defender.position = (
        defender.position * dir - item.stats.pull > attacker.position * dir
        ? defender.position - item.stats.pull * dir
        : attacker.position + dir
      );
    }
  },


	energy_regeneration (battle: Battle): number {

    // Returns the amount of energy regenerated

    const { attacker } = BattleUtils.getAttackerAndDefender(battle);
    const initial = attacker.stats.energy;

    if (attacker.stats.eneCap < (attacker.stats.energy + attacker.stats.eneReg)) {
      attacker.stats.energy = attacker.stats.eneCap;
    } else {
      attacker.stats.energy += attacker.stats.eneReg;
    }

    log(battle, 1, `regenerated ${attacker.stats.energy - initial} energy`);

    return attacker.stats.energy - initial;
  },

};



// Private Functions


function log (battle: Battle, type: number, ...msg: any): void {

	const typeSufixes = ['action', 'effect', 'info', 'ERROR'];

	const { attacker, defender } = BattleUtils.getAttackerAndDefender(battle);

	const message = msg
		.join(' ')
		.replace(/%attacker%/g, attacker.name)
		.replace(/%defender%/g, defender.name);

	battle.logs.push({
    playerID: battle.playerID,
    message: `[${typeSufixes[type]}] ${message}`,
  });

}


function passTurn (battle: Battle): void {

	const { attacker } = BattleUtils.getAttackerAndDefender(battle);

	// Battle finished?
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


function switchTurnOwner (battle: Battle): void {

	battle.turns = 2;
	battle.turnOwnerID = battle.turnOwnerID === battle.p1.id ? battle.p2.id : battle.p1.id;

	const { attacker, defender } = BattleUtils.getAttackerAndDefender(battle);

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



// Public Functions

function handleEvent (battle: Battle, event: BattleEvent): void {

	if (!eventHandlers.hasOwnProperty(event.name)) {
		throw new Error(`Unknown battle event "${event.name}"`);
	}

	eventHandlers[event.name](battle, event);

}


function setBattleComplete (battle: Battle, winnerID: string, quit: boolean = false): void {
	battle.complete = { winnerID, quit };
}



// Exports

const BattleManager = {
	setBattleComplete,
	handleEvent,
};

export default BattleManager;
