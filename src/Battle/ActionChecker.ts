import { Battle, BattleAction, BattleMovesMap } from './BattlesManager';


export class ActionChecker implements BattleMovesMap {

  private static POSITION_MIN: number = 0;
  private static POSITION_MAX: number = 9;


  public move(battle: Battle, action: BattleAction<'move'>): void {

    if (battle.attacker.slots.legs === null) {
      throw new Error('Tried to move without legs');
    }

    if (battle.attacker.slots.legs.stats.walk === 0
     && battle.attacker.slots.legs.stats.jump === 0) {
      throw new Error('Tried to move without walking walking or jumping legs');
    }
    
    if (action.position < ActionChecker.POSITION_MIN
     || action.position > ActionChecker.POSITION_MAX) {
      throw new Error(`Attempted to move to position outside of the arena: ${action.position}`);
    }

    if (action.position === battle.attacker.position
     || action.position === battle.defender.position) {
      throw new Error(`Attempted to move to an occupied position: ${action.position}`);
    }

    /** TODO: Also check if the position is actually reachable by attacker,
     * and that include making sure rollers can't jump over the opponent. */

  }


  public toggleDrone(battle: Battle, _action: BattleAction<'toggleDrone'>): void {
    if (battle.attacker.slots.drone === null) {
      throw new Error(`Attempted to toggle drone but no drone equipped`);
    }
  }

}
