import BattlePlayerData, { BattleStartPlayerData } from './BattlePlayerData';


export interface BattleStartData {
  online: boolean;
  playerID: string;
  starterID: string;
  p1: BattleStartPlayerData;
  p2: BattleStartPlayerData;
}


export default class Battle {

  public logs: { playerID: string, message: string }[] = [];
  public readonly online: boolean;
  public turnOwnerID: string;
  public readonly playerID: string;
  public readonly p1: BattlePlayerData;
  public readonly p2: BattlePlayerData;
  public turns = 1;
  public complete: {
    winnerID: string;
    quit: boolean;
  } | null = null;


  constructor (data: BattleStartData) {

    this.online = data.online;
    this.turnOwnerID = data.starterID;
    this.playerID = data.playerID;
    this.p1 = new BattlePlayerData(data.p1);
    this.p2 = new BattlePlayerData(data.p2);

  }

}
