import BattlePlayerData from './BattlePlayerData';
import { arrayRandomItem } from '../utils/arrayRandom';
import Connection from './Connection';


export default class Battle
{
  logs: [string, string][] = [];
  turns = 1;
  turnOwnerIndex = 0;
  multiplayer = true;
  over = false;
  quit = false;
  players: [BattlePlayerData, BattlePlayerData];

  constructor (conn1: Connection, conn2: Connection) {

    const positions = arrayRandomItem([[4, 5], [3, 6], [2, 7]]);

    this.players = [
      new BattlePlayerData(conn1, positions[0], this),
      new BattlePlayerData(conn2, positions[1], this)
    ];

    this.turnOwnerIndex = 0;
  }
}
