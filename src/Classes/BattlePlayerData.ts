import env from 'src/utils/env';
import Connection from './Connection';
import StatsM from '../managers/StatsManager';
import randomHSL from '../utils/randomHSL';
import Battle from './Battle';


export type ItemAndIndex = [Item, number];


export default class BattlePlayerData
{
  id: string;
  admin: boolean;

  weapons: ItemAndIndex[];
  specials: ItemAndIndex[];

  logColor: string;
  mech: Mech;
  items: (Item | null)[];
  position: number;
  uses: number[];
  usedInTurn: number[] = [];
  droneActive = false;
  battle: Battle;

  stats: {
    health: number,
    healthCap: number,
    energy: number,
    eneCap: number,
    eneReg: number,
    heat: number,
    heaCap: number,
    heaCol: number,
    phyRes: number,
    expRes: number,
    eleRes: number
  };

  constructor (conn: Connection, position: number, battle: Battle) {

    this.id = conn.procket.socket.id;
    this.admin = conn.ip === env('ADMIN_ADDRESS', '');
    this.battle = battle;

    const mech: Mech = {
      name: conn.name,
      setup: conn.setup
    };

    const statsMap = StatsM.getStats(mech.setup);

    const {
      health = 1, eneCap = 1, eneReg = 1, heaCap = 1,
      heaCol = 1, phyRes = 0, expRes = 0, eleRes = 0,
    } = statsMap;

    const itemsAndIndexes = mech.setup.map((item, i) => item ? [item, i] : null) as ItemAndIndex[];

    this.weapons = itemsAndIndexes.slice(2, 8).filter(x => x !== null);
    this.specials = itemsAndIndexes.slice(8, 12).filter(x => x !== null);

    this.logColor = randomHSL();
    this.mech = mech;
    this.position = position;
    this.items = mech.setup;
    this.uses = this.items.map(item => item && item.stats.uses ? item.stats.uses : Infinity);

    this.stats = {
      healthCap: health,
      health: health,
      eneCap: eneCap,
      energy: eneCap,
      eneReg: eneReg,
      heaCap: heaCap,
      heat: 0,
      heaCol: heaCol,
      phyRes: phyRes,
      expRes: expRes,
      eleRes: eleRes
    };
  }
}