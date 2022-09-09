import { Battle, BattleAction, BattleMovesMap } from './BattlesManager';


export class ActionExecuter implements BattleMovesMap {

  public move(battle: Battle, action: BattleAction<'move'>): void {
    battle.attacker.position = action.position;
  }


  public toggleDrone(battle: Battle, _action: BattleAction<'toggleDrone'>): void {
    battle.attacker.droneActived = !battle.attacker.droneActived;
  }

}

