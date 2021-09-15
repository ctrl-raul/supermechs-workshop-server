import Battle from "./Battle";
import { EssentialItemData } from "./BattleManager";



// Functions

function getDirection (battle: Battle): 1 | -1 {

	const { player, opponent } = BattleUtils.getPlayerAndOpponent(battle);

	return (
		player.position < opponent.position
		?  1
		: -1
	);
}


function isPlayerTurn (battle: Battle): boolean {
	return battle.turnOwnerID === battle.playerID;
}


function getRandomStartPositions (): [number, number] {
	const presets: [number, number][] = [[4, 5], [3, 6], [2, 7]];
	return presets[Math.floor(Math.random() * presets.length)];
}


function canBattleWithSetup (setup: (EssentialItemData | null)[] | number[]) {

	// @ts-ignore
	const items: MechSetup = (typeof setup[0] === 'number') ? ItemsManager.ids2items(setup) : setup; 

	// .filter(Boolean) to remove any falsy value from the array
	const modules = items.slice(12, 20).filter(Boolean) as EssentialItemData[];
	const resistances: string[] = [];
	const weight = (items.filter(Boolean) as EssentialItemData[])
		.reduce((a, b) => a + (b.stats.weight || 0), 0);

	const cant = (reason: string) => ({
		can: false,
		reason
	});
	
	// Missing torso
	if (!items[0]) {
		return cant(`Missing torso`);
	}

	// No jumping legs with weapons that require jump?
	if (items[1]) {

		if (!items[1].stats.jump) {

			// .filter(Boolean) to remove any falsy value from the array
			const weapons = items.slice(2, 8).filter(Boolean) as EssentialItemData[];

			for (const weapon of weapons) {

				if ('advance' in weapon.stats || 'retreat' in weapon.stats) {

					if (!weapon.tags.includes('melee')) {
						return cant(`${weapon.name} requires jumping! The legs you're using can't jump.`);
					}
				}
			}
		}
		
	} else {
		return cant(`Missing legs`);
	}


	// Multiple Resistance Modules
	for (const modu of modules) {

		for (const elementPrefix of ['phy', 'exp', 'ele']) {

			const resStatKey = elementPrefix + 'Res';

			if (resStatKey in modu.stats) {

				if (resistances.includes(resStatKey)) {
					return cant(`Can not use multiple modules with the same resistance type in battle.`);
				} else {
					resistances.push(resStatKey);
				}
			}
		}
	}

	// Overweighted
	if (weight > 1015) {
		return cant('Too heavy');
	}

	return {
		can: true,
		reason: ''
	}
}


function getItemRangePlot (battle: Battle, itemIndex: number): boolean[] {

	const { attacker, defender } = getAttackerAndDefender(battle);
	const item = attacker.items[itemIndex];

	if (!item) {
		throw new Error(`Item for index (${itemIndex}) of player "${attacker.name}" is ${item}`);
	}

	const result = Array(10).fill(true);

	if (item.stats.range === undefined) {
		return result;
	}

	// Notice this is dependent on the turn owner, so
	// don't replace with getDirection(), which always
	// returns the value from the player's perspective
	const dir = attacker.position < defender.position ? 1 : -1;
	
	const { range } = item.stats;

	return result.map((_, i) =>
		i * dir >= attacker.position * dir + range[0] &&
		i * dir <= attacker.position * dir + range[1]
	);

}


function getAttackerAndDefender (battle: Battle) {
	return (
		battle.p1.id === battle.turnOwnerID
		? { attacker: battle.p1, defender: battle.p2 }
		: { defender: battle.p1, attacker: battle.p2 }
	);
}


function getTeleportablePositions (battle: Battle): boolean[] {

	const positions = Array(10).fill(true);

	positions[battle.p1.position] = false;
	positions[battle.p2.position] = false;

	return positions;

}


function getWalkablePositions (battle: Battle): boolean[] {

	const { attacker, defender } = getAttackerAndDefender(battle);

	const legs = attacker.items[1] as EssentialItemData;
	const maxDistance = Math.max(legs.stats.walk || 0, legs.stats.jump || 0);
	const positions = Array(10).fill(false);


	if (maxDistance) {
		for (let i = 0; i < positions.length; i++) {

			positions[i] = (
				i <= attacker.position + maxDistance &&
				i >= attacker.position - maxDistance
			);

		}
	}


	// If can't jump, remove positions beyond the opponent
	if (!legs.stats.jump) {

		const distance = Math.abs(attacker.position - defender.position);
		const direction = attacker.position < defender.position ? 1 : -1;

		for (let i = 0; i < positions.length; i++) {
			positions[i] = positions[i] && (i * direction < attacker.position * direction + distance);
		}

	}


	// Set positions where the players are to inaccessible
	positions[battle.p1.position] = false;
	positions[battle.p2.position] = false;


	return positions;

}


function canPlayerUseItem (
	battle: Battle,
	itemIndex: number,
	suppressList: ('range')[] = []
) {

	const { attacker, defender } = getAttackerAndDefender(battle);

	const item = attacker.items[itemIndex];
	const cant = (reason: string) => ({ can: false, reason });

	if (item === null) {
		return cant(`No item with index ${ itemIndex }`);
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

	// In theory, you shouldn't be able to go to
	// battle with such setup, but we never know.
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


function getDamageToDeal (battle: Battle, itemIndex: number): number {

	const typesWithDamage = [
		'LEGS', 'SIDE_WEAPON', 'TOP_WEAPON', 'DRONE',
		'CHARGE_ENGINE', 'TELEPORTER', 'GRAPPLING_HOOK'
	];

	const { attacker, defender } = getAttackerAndDefender(battle);
	const item = attacker.items[itemIndex] as EssentialItemData;

	if (!typesWithDamage.includes(item.type)) {
		return 0;
	}

	const statElement = item.element.substring(0, 3).toLowerCase();
	
	const dmgStatKey = statElement + 'Dmg' as 'phyDmg' | 'expDmg' | 'eleDmg';
	const resStatKey = statElement + 'Res' as 'phyRes' | 'expRes' | 'eleRes';

	const dmgStatValue = item.stats[dmgStatKey];


	/// Damage calculations

	let damage = 0;

	// Base damage
	if (typeof dmgStatValue !== 'undefined') {
		const [dmgStatMin, dmgStatMax] = dmgStatValue;
		damage += dmgStatMin + Math.round(Math.random() * (dmgStatMax - dmgStatMin));

		// Apply resistance
		if (defender.stats[resStatKey]) {
			damage = Math.max(1, damage - defender.stats[resStatKey]);
		}
	}
	
	// Apply energy break bonus damage
	if (item.stats.eneDmg) {
		damage -= Math.min(0, defender.stats.energy - item.stats.eneDmg);
	}

	return damage;
}


function getUsableWeapons (
	battle: Battle,
	suppressList: ('range')[] = []
): [EssentialItemData, number][] {

	const { attacker } = getAttackerAndDefender(battle);
	const usable: [EssentialItemData, number][] = [];

	for (const data of attacker.weapons) {
		if (canPlayerUseItem(battle, data[1], suppressList).can) {
			usable.push(data);
		}
	}

	return usable;

}


function getPlayerAndOpponent (battle: Battle) {
	return (
		battle.playerID === battle.p1.id
		? { player: battle.p1, opponent: battle.p2 }
		: { player: battle.p2, opponent: battle.p1 }
	)
}



// Exports

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

export default BattleUtils;
