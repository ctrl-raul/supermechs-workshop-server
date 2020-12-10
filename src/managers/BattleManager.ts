// TODO: Not call Effects.movements in Effects.fire


import Battle from '../classes/Battle';


export interface BattleActionArguments {
  double?: boolean;
  position?: number;
  itemIndex?: number;
  damage?: number;
}

type ActionType = 
    'cooldown'
  | 'drone_toggle'
  | 'charge'
  | 'teleport'
  | 'hook'
  | 'fire'
  | 'stomp'
  | 'walk';


class Actions
{
  // None of these methods should be "manually" called


  static cooldown (battle: Battle, args: BattleActionArguments): void {

    const { double } = args;

    if (typeof double === 'undefined') {
      throw new TypeError(`'double' argument missing to execute action 'cooldown'`);
    }

    const { attacker } = BattleManager.getPlayers(battle);
    const cooldown = Math.min(attacker.stats.heaCol * (double ? 2 : 1), attacker.stats.heat);

    attacker.stats.heat -= cooldown;

    BattleManager.log(attacker.battle, 0, `%attacker% cooled down by ${cooldown}`);
    
    if (double) {
      Effects.energy_regeneration(attacker.battle);
      BattleManager.switchTurnOwner(attacker.battle);
    } else {
      BattleManager.passTurn(attacker.battle);
    }
  }

  static drone_toggle (battle: Battle): void {
    
    const { attacker } = BattleManager.getPlayers(battle);
    const droneIndex = 8;
    const drone = attacker.items[droneIndex] as Item;

    attacker.droneActive = !attacker.droneActive;
    
    // Refill uses
    if (attacker.droneActive && drone.stats.uses) {
      attacker.uses[droneIndex] = drone.stats.uses;
    }

    BattleManager.log(attacker.battle, 0, `%attacker% ${attacker.droneActive ? 'enabled' : 'disabled'} drone`);
    BattleManager.passTurn(attacker.battle);
  }

  static charge (battle: Battle, args: BattleActionArguments): void {
  
    const { attacker, defender } = BattleManager.getPlayers(battle);
    const chargeIndex = 9;
    const charge = attacker.items[chargeIndex] as Item;
    const dir = attacker.position < defender.position ? 1 : -1;
    const dmgDealt = Effects.damages(battle, chargeIndex, args.damage);

    attacker.position = defender.position - dir;
    defender.position = Math.max(0, Math.min(9, defender.position + dir));

    BattleManager.log(attacker.battle, 0, `%attacker% charged using ${charge.name} (${dmgDealt} damage)`);
    Effects.item_usage(attacker.battle, chargeIndex);
    BattleManager.passTurn(attacker.battle);
  }

  static teleport (battle: Battle, args: BattleActionArguments): void {

    const { position } = args;

    if (typeof position === 'undefined') {
      throw new TypeError(`'position' argument missing to execute action 'teleport'`);
    }

    const { attacker, defender } = BattleManager.getPlayers(battle);
    const teleporterIndex = 10;
    const teleporter = attacker.items[teleporterIndex] as Item;
    const dir = position < defender.position ? 1 : -1;
    const initial = attacker.position;
    
    // Only deals damage if teleported to opponent's side
    const dmgDealt = (
      attacker.position + dir === defender.position
      ? Effects.damages(attacker.battle, teleporterIndex, args.damage)
      : 0
    );

    attacker.position = position;

    BattleManager.log(attacker.battle, 0, `%attacker% teleported from ${initial} to ${attacker.position} using ${teleporter.name} (${dmgDealt} damage)`);
    Effects.item_usage(attacker.battle, teleporterIndex);
    BattleManager.passTurn(attacker.battle);
  }

  static hook (battle: Battle, args: BattleActionArguments): void {

    const { attacker, defender } = BattleManager.getPlayers(battle);
    const hookIndex = 11;
    const hook = attacker.items[hookIndex] as Item;
    const dir = attacker.position < defender.position ? 1 : -1;
    const dmgDealt = Effects.damages(attacker.battle, hookIndex, args.damage);

    defender.position = attacker.position + dir;

    BattleManager.log(attacker.battle, 0, `%attacker% grappled using ${hook.name} (${dmgDealt} damage)`);
    Effects.item_usage(attacker.battle, hookIndex);
    BattleManager.passTurn(attacker.battle);
  }

  static fire (battle: Battle, args: BattleActionArguments): void {

    const { itemIndex } = args;

    if (typeof itemIndex === 'undefined') {
      throw new TypeError(`'itemIndex' argument missing to execute action 'fire'`);
    }

    const { attacker } = BattleManager.getPlayers(battle);
    const item = attacker.items[itemIndex] as Item;
    const dmgDealt = Effects.damages(attacker.battle, itemIndex, args.damage);

    BattleManager.log(attacker.battle, 0, `%attacker% used ${item.name} (${dmgDealt} damage)`);
    Effects.item_usage(attacker.battle, itemIndex);
    BattleManager.passTurn(attacker.battle);
  }

  static stomp (battle: Battle, args: BattleActionArguments): void {

    const { attacker } = BattleManager.getPlayers(battle);
    const legsIndex = 1;
    const legs = attacker.items[legsIndex] as Item;
    const dmgDealt = Effects.damages(attacker.battle, legsIndex, args.damage);

    BattleManager.log(attacker.battle, 0, `%attacker% stomped with ${legs.name} (${dmgDealt} damage)`);
    Effects.item_usage(attacker.battle, legsIndex);
    BattleManager.passTurn(attacker.battle);
  }

  static walk (battle: Battle, args: BattleActionArguments): void {

    const { position } = args;

    if (typeof position === 'undefined') {
      throw new TypeError(`'position' argument missing to execute action 'walk'`);
    }

    const { attacker } = BattleManager.getPlayers(battle);
    const initial = attacker.position;
    
    attacker.position = position;
    BattleManager.log(attacker.battle, 0, `%attacker% moved from position ${initial} to ${position}`);
    BattleManager.passTurn(attacker.battle);
  }
}


class Effects
{
  // None of these methods should be "manually" called


  static energy_regeneration (battle: Battle): number {

    // Returns the amount of energy regenerated

    const { attacker } = BattleManager.getPlayers(battle);
    const initial = attacker.stats.energy;

    if (attacker.stats.eneCap < (attacker.stats.energy + attacker.stats.eneReg)) {
      attacker.stats.energy = attacker.stats.eneCap;
    } else {
      attacker.stats.energy += attacker.stats.eneReg;
    }

    BattleManager.log(battle, 1, `regenerated ${attacker.stats.energy - initial} energy`);

    return attacker.stats.energy - initial;
  }

  static damages (battle: Battle, itemIndex: number, damage: number = -1): number {

    // Returns the total damage dealt

    const { attacker, defender } = BattleManager.getPlayers(battle);
    const item = attacker.items[itemIndex] as Item;

    const statElement = item.element.substring(0, 3).toLowerCase();
    
    const resStatKey = statElement + 'Res' as 'phyRes' | 'expRes' | 'eleRes';
    const resStatDmgKey = resStatKey + 'Dmg' as 'phyResDmg' | 'expResDmg' | 'eleResDmg';

    if (damage === -1) {
      damage = BattleManager.getDamage(battle, itemIndex);
    }


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


    Effects.movements(attacker.battle, itemIndex);


    return damage;
  }

  static movements (battle: Battle, itemIndex: number): void {

    const { attacker, defender } = BattleManager.getPlayers(battle);
    const item = attacker.items[itemIndex] as Item;
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
  }

  static item_usage (battle: Battle, itemIndex: number): number {

    // Returns the amount of uses left

    const { attacker } = BattleManager.getPlayers(battle);
    const item = attacker.items[itemIndex] as Item;

    attacker.uses[itemIndex]--;
    attacker.usedInTurn.push(itemIndex);

    // Drone out of uses
    if (attacker.uses[itemIndex] < 1) {
      if (item.type === 'DRONE') {
        attacker.droneActive = false;
      }
      BattleManager.log(attacker.battle, 2, `%attacker% ran out of ${item.name} uses`);
    }

    return attacker.uses[itemIndex];
  }

  static drone_fire (battle: Battle): void {

    const { attacker } = BattleManager.getPlayers(battle);
    const droneIndex = 8;
    const drone = attacker.items[droneIndex] as Item;

    const { can, reason } = BattleManager.canPlayerUse(attacker.battle, droneIndex);

    if (!can) {
      BattleManager.log(battle, 2, `%attacker% can't use drone (${reason})`);
      return;
    }

    if (attacker.uses[droneIndex] < 1) {
      // @ts-ignore
      attacker.uses[droneIndex] = drone.stats.uses;
      attacker.droneActive = false;
    }

    const dmgDealt = Effects.damages(attacker.battle, droneIndex);

    BattleManager.log(battle, 1, `%attacker% used ${drone.name} (${dmgDealt} damage)`);
    Effects.item_usage(attacker.battle, droneIndex);
  }
}


class BattleManager
{
  static resolveAction (battle: Battle, action: ActionType, _args: BattleActionArguments = {}) {

    const actionToItemIndex = {
      stomp: 1,
      charge: 9,
      teleport: 10,
      hook: 11
    };

    if (action in actionToItemIndex) {
      // @ts-ignore
      _args.itemIndex = actionToItemIndex[action];
    }

    const damage = _args.itemIndex ? this.getDamage(battle, _args.itemIndex) : 0;
    const args = { ..._args, damage };

    this.executeAction(battle, action, args);
  }

  static executeAction (battle: Battle, action: ActionType, args: BattleActionArguments = {}): void {
    // Use BattleManager.resolveAction
    // console.log('executeAction', action, args);
    Actions[action](battle, args);
  }

  // Utils

  static canSetupBattle (setup: MechSetup) {

    // .filter(Boolean) to remove any falsy value from the array
    const modules = setup.slice(12, 20).filter(Boolean) as Item[];
    const resistances: string[] = [];
    const weight = (setup.filter(Boolean) as Item[])
      .reduce((a, b) => a + (b.stats.weight || 0), 0);

    const cant = (reason: string) => ({
      can: false,
      reason
    });
    
    // Missing torso
    if (!setup[0]) {
      return cant(`Missing torso`);
    }

    // No jumping legs with weapons that require jump?
    if (setup[1]) {

      if (!setup[1].stats.jump) {

        // .filter(Boolean) to remove any falsy value from the array
        const weapons = setup.slice(2, 8).filter(Boolean) as Item[];

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
  
  static log (battle: Battle, type: number, ...msg: any) {
    const typeSufixes = ['action', 'effect', 'info', 'ERROR'];
    const { attacker } = this.getPlayers(battle);
    const message = `[${ typeSufixes[type] }] ${ msg.join(' ').replace(/%attacker%/g, attacker.mech.name) }`;
    attacker.battle.logs.push([message, attacker.logColor]);
    // console.log('%c' + message, 'color:' + attacker.logColor);
  }


  // Battle utils

  static passTurn (battle: Battle): void {

    const { attacker, defender } = this.getPlayers(battle);

    // Battle finished?
    if (attacker.stats.health < 1 || defender.stats.health < 1) {

      attacker.battle.over = true;

    } else if (!--battle.turns) {
  
      if (attacker.droneActive) {
        Effects.drone_fire(attacker.battle);
      }

      attacker.usedInTurn = [];
  
      Effects.energy_regeneration(attacker.battle);
      this.switchTurnOwner(attacker.battle);
    };
  }

  static switchTurnOwner (battle: Battle): void {

    battle.turns = 2;
    battle.turnOwnerIndex = Number(!battle.turnOwnerIndex);

    const { attacker } = this.getPlayers(battle);

    if (attacker.stats.heat > attacker.stats.heaCap) {
      Actions.cooldown(attacker.battle, {
        double: attacker.stats.heaCol < attacker.stats.heat - attacker.stats.heaCap
      });
    }
  }

  static getPlayers (battle: Battle) {
    return {
      attacker: battle.players[battle.turnOwnerIndex],
      defender: battle.players[Number(!battle.turnOwnerIndex)]
    };
  }

  static getAccessiblePositions (battle: Battle, itemIndex: number): boolean[] {

    const { attacker, defender } = this.getPlayers(battle);

    const item = attacker.items[itemIndex] as Item;
    const movingDist = Math.max((item.stats.walk || 0), (item.stats.jump || 0));

    let positions = Array(10).fill(true);

    if (movingDist) {
      positions = positions.map((_, i) =>
        !(i > attacker.position + movingDist || i < attacker.position - movingDist)
      );
    }

    // If the item can't jump, remove positions beyond the opponent
    if (item.type !== 'TELEPORTER' && !item.stats.jump) {
      const dist = Math.abs(attacker.position - defender.position);
      const dir = attacker.position < defender.position ? 1 : -1;
      positions = positions.map((accessible, i) => accessible && i * dir < attacker.position * dir + dist);
    }
    
    positions[attacker.position] = false;
    positions[defender.position] = false;

    return positions;
  }

  static getDamage (battle: Battle, itemIndex: number): number {

    const typesWithDamage = [
      'LEGS', 'SIDE_WEAPON', 'TOP_WEAPON', 'DRONE',
      'CHARGE_ENGINE', 'TELEPORTER', 'GRAPPLING_HOOK'
    ];

    const { attacker, defender } = BattleManager.getPlayers(battle);
    const item = attacker.items[itemIndex] as Item;

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

  static canPlayerUse (battle: Battle, itemIndex: number) {

    const { attacker, defender } = this.getPlayers(battle);

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

    if (item.stats.range) {
      const range = this.getRelativeWeaponRange(battle, itemIndex);
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

  static getRelativeWeaponRange (battle: Battle, itemIndex: number): boolean[] {

    const { attacker, defender } = this.getPlayers(battle);
    const item = attacker.items[itemIndex] as Item;
    const dir = attacker.position < defender.position ? 1 : -1;
    const range = Array(10).fill(true);
  
    if (typeof item.stats.range === 'undefined') {
      return range;
    }

    return range.map((_, i) =>
      // @ts-ignore
      i * dir >= attacker.position * dir + item.stats.range[0] &&
      // @ts-ignore
      i * dir <= attacker.position * dir + item.stats.range[1]
    );
  }
}


export default BattleManager;


// What hath I wrought
