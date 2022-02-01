import Battle from './battle/Battle';
import { EssentialItemData } from './battle/BattleManager';
import PromiseSocket from './promise-socket.io';



export default class Player {

  public readonly psocket: PromiseSocket;
  public readonly id: string;

  public name: string = 'NO_NAME';
  public setup: (EssentialItemData | null)[] = [];
  public setupHash: string = '';
  public itemsPackKey: string = '';
  public doNotMatch: Player[] = [];
  public opponentValidationPromise: Promise<void>  | null = null;
  public battleData = null as null | {
    opponent: Player;
    battle: Battle;
  };



  constructor (psocket: PromiseSocket) {
    this.psocket = psocket;
    this.id = psocket.socket.id;
  }



  public getFullName (): string {
    return this.psocket.socket.id + '(' + this.name + ')';
  }


  public emit (event: string, data?: any, responseTimeout?: number) {
    return this.psocket.emit(event, data, responseTimeout);
  }

}
