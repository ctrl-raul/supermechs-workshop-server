import { ActionChecker } from './ActionChecker';
import { ActionExecuter } from './ActionExecuter';


export type SlotID = 'torso' | 'legs' | 'sideWeapon1' | 'sideWeapon2'
  | 'sideWeapon3' | 'sideWeapon4' | 'topWeapon1' | 'topWeapon2' | 'drone'
  | 'chargeEngine' | 'teleporter' | 'grapplingHook' | 'module1' | 'module2'
  | 'module3' | 'module4' | 'module5' | 'module6' | 'module7' | 'module8';


interface BattlePartyConfig {
  id: string;
  name: string;
}


export interface BattleItem {
  stats: Partial<{
    weight: number;
    health: number;
    eneCap: number;
    eneReg: number;
    heaCap: number;
    heaCol: number;
    phyRes: number;
    expRes: number;
    eleRes: number;
    bulletsCap: number;
    rocketsCap: number;
    phyResDmg: number;
    expResDmg: number;
    heaDmg: number;
    heaCapDmg: number;
    heaColDmg: number;
    eleResDmg: number;
    eneDmg: number;
    eneCapDmg: number;
    eneRegDmg: number;
    walk: number;
    jump: number;
    push: number;
    pull: number;
    recoil: number;
    advance: number;
    retreat: number;
    uses: number;
    backfire: number;
    heaCost: number;
    eneCost: number;
    bulletsCost: number;
    rocketsCost: number;
    phyDmg: [number, number];
    expDmg: [number, number];
    eleDmg: [number, number];
    range: [number, number];
  }>;
}


interface BattleParty {
  id: string;
  name: string;
  weaponSlotsUsedThisTurn: SlotID[];
  position: number;
  droneActived: boolean;
  slots: {
    torso: BattleItem | null;
    legs: BattleItem | null;
    sideWeapon1: BattleItem | null;
    sideWeapon2: BattleItem | null;
    sideWeapon3: BattleItem | null;
    sideWeapon4: BattleItem | null;
    topWeapon1: BattleItem | null;
    topWeapon2: BattleItem | null;
    drone: BattleItem | null;
    chargeEngine: BattleItem | null;
    teleporter: BattleItem | null;
    grapplingHook: BattleItem | null;
    module1: BattleItem | null;
    module2: BattleItem | null;
    module3: BattleItem | null;
    module4: BattleItem | null;
    module5: BattleItem | null;
    module6: BattleItem | null;
    module7: BattleItem | null;
    module8: BattleItem | null;
  };
  stats: {
    healthCap: number;
    health: number;
    eneCap: number;
    eneReg: number;
    energy: number;
    heaCap: number;
    heaCol: number;
    heat: number;
    phyRes: number;
    expRes: number;
    eleRes: number;
  };
}


export interface Battle {

  attacker: BattleParty;
  defender: BattleParty;

  actionPoints: number;
  turnStartedTimestamp: number;

  winnerID: string;
  quit: boolean;

}

interface BattleActionTypes {

  move: {
    id: 'move';
    partyID: string;
    position: number;
  };

  toggleDrone: {
    id: 'toggleDrone';
    partyID: string;
  };

}


export type BattleAction <ID extends keyof BattleActionTypes = keyof BattleActionTypes>
  = BattleActionTypes[ID];


export type BattleMovesMap = {
  [ID in keyof BattleActionTypes]: (battle: Battle, action: BattleAction<ID>) => unknown;
}



export class BattlesManager {

  private static ACTION_POINTS_PER_TURN: number = 2;
  private static ACTION_POINTS_IN_FIRST_TURN: number = 1;
  private static actionChecker = new ActionChecker();
  private static actionExecuter = new ActionExecuter();



  private static createBattleParty(config: BattlePartyConfig, position: number): BattleParty {
    return {
      id: config.id,
      name: config.name,
      weaponSlotsUsedThisTurn: [],
      position,
      droneActived: false,
      slots: {
        torso: null,
        legs: null,
        sideWeapon1: null,
        sideWeapon2: null,
        sideWeapon3: null,
        sideWeapon4: null,
        topWeapon1: null,
        topWeapon2: null,
        drone: null,
        chargeEngine: null,
        teleporter: null,
        grapplingHook: null,
        module1: null,
        module2: null,
        module3: null,
        module4: null,
        module5: null,
        module6: null,
        module7: null,
        module8: null,
      },
      stats: {
        healthCap: 1,
        health: 1,
        heat: 1,
        heaCap: 1,
        heaCol: 1,
        energy: 1,
        eneCap: 1,
        eneReg: 1,
        phyRes: 1,
        expRes: 1,
        eleRes: 1
      },
    };
  }


  public static createBattle(partyA: BattlePartyConfig, partyB: BattlePartyConfig): Battle {

    const positions = this.getRandomStartingPositions();

    return {

      attacker: this.createBattleParty(partyA, positions[0]),
      defender: this.createBattleParty(partyB, positions[1]),

      actionPoints: this.ACTION_POINTS_IN_FIRST_TURN,
      turnStartedTimestamp: Date.now(),

      winnerID: '',
      quit: false,

    };

  }


  private static swapRoles(battle: Battle): void {
    const newDefender = battle.attacker;
    battle.attacker = battle.defender;
    battle.defender = newDefender;
  }


  public static processAction(battle: Battle, action: BattleAction): void {

    if (action.partyID !== battle.attacker.id) {
      throw new Error(`Current attacker's ID is '${battle.attacker.id}' but got '${action.partyID}'`);
    }


    // TODO: Typecheck action before even checking if it's valid

    this.actionChecker[action.id](battle, action as never);
    this.actionExecuter[action.id](battle, action as never);
    this.onActionProcessed(battle);

  }


  private static onActionProcessed(battle: Battle): void {

    battle.actionPoints--;

    if (battle.actionPoints === 0) {
      // TODO: this.fireDrone(battle); or something
      this.startTurn(battle);
    }

  }


  private static startTurn(battle: Battle): void {

    this.swapRoles(battle);

    battle.defender.weaponSlotsUsedThisTurn = [];
    battle.defender.stats.energy = Math.min(
      battle.defender.stats.eneCap,
      battle.defender.stats.energy + battle.defender.stats.eneReg
    );

    battle.actionPoints = this.ACTION_POINTS_PER_TURN;
    battle.turnStartedTimestamp = Date.now();

    const cooldownsNeeded = this.getCooldownsNeeded(battle.attacker);

    if (cooldownsNeeded > 0) {

      const cooldowns = Math.min(cooldownsNeeded, this.ACTION_POINTS_PER_TURN);

      battle.attacker.stats.heat -= battle.attacker.stats.heaCol * cooldowns;
      battle.actionPoints -= cooldowns;

      if (battle.actionPoints === 0) {
        this.startTurn(battle);
      }

    }

  }



  // Utils

  private static getRandomStartingPositions(): [number, number] {

    const presets: [number, number][] = [
      [4, 5],
      [3, 6],
      [2, 7],
    ];

    return presets[Math.floor(Math.random() * presets.length)];

  }


  private static getCooldownsNeeded(party: BattleParty): number {
    const overheat = Math.max(0, party.stats.heat - party.stats.heaCap);
    return Math.ceil(overheat / party.stats.heaCol);
  }


}
