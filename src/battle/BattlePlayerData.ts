import { EssentialItemData } from './BattleManager';
import rawStatsData from '../data/stats';


export interface BattleStartPlayerData {
  id: string;
  name: string;
  setup: (EssentialItemData | null)[];
  position: number;
}


export default class BattlePlayerData {

  public readonly name: string;
  public readonly id: string;

  public readonly weapons: [EssentialItemData, number][];
  public readonly specials: [EssentialItemData, number][];

  public readonly items: (EssentialItemData | null)[];
  public position: number;
  public uses: number[];
  public usedInTurn: number[] = [];
  public droneActive = false;

  public stats: {
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

  constructor (data: BattleStartPlayerData) {

    const statsMap = getStats(data.setup);

    const {
      health = 1, eneCap = 1, eneReg = 1, heaCap = 1,
      heaCol = 1, phyRes = 0, expRes = 0, eleRes = 0,
    } = statsMap;

    const itemsAndIndexes = data.setup.map((item, i) => item ? [item, i] as const : null);

    this.name = data.name;
    this.id = data.id;

    // @ts-ignore
    this.weapons = itemsAndIndexes.slice(2, 8).filter(x => x !== null);
    // @ts-ignore
    this.specials = itemsAndIndexes.slice(8, 12).filter(x => x !== null);

    this.position = data.position;
    this.items = data.setup;
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



function getStats (source: (EssentialItemData | null)[]) {

  const stats: EssentialItemData['stats'] = getMechSummary(source);
    
  const buffFunctions = {
    add: (x: number, amount: number) => x + amount,
    mul: (x: number, amount: number) => x * amount
  };

  const keys = Object.keys(stats) as (keyof EssentialItemData['stats'])[];

  for (const key of keys) {

    const value = stats[key];

    if (!value || key === 'health') {
      continue;
    }

    const statTemplate = rawStatsData.find(data => data.key === key);

    if (!statTemplate) {
      console.error(`Unknown stat '${key}'`);
      continue;
    }

    if (statTemplate.buff) {

      const { buff } = statTemplate;
      const buffFunction = buffFunctions[buff.mode];

      if (Array.isArray(value)) {
        // @ts-ignore
        stats[key] = value.map(x => Math.round(
          buffFunction(x, buff.amount)
        ));
      } else {
        // @ts-ignore
        stats[key] = Math.round(
          buffFunction(value, buff.amount)
        );
      }
    }
  }

  return stats;
}


function getMechSummary (items: (EssentialItemData | null)[]) {

  const mechStatsKeys: (keyof EssentialItemData['stats'])[] = [
    'weight', 'health', 'eneCap',
    'eneReg', 'heaCap', 'heaCol',
    'phyRes', 'expRes', 'eleRes'
  ];

  const sum: Partial<EssentialItemData['stats']> = {};

  for (const item of items) {

    if (item === null) {
      continue;
    }

    for (const key of mechStatsKeys) {

      const value = (item.stats[key] || 0) as number;
      const current = sum[key] as number;

      // @ts-ignore
      sum[key] = typeof current === 'undefined' ? value : current + value;

    }

  }


  // Do health penalty due to overweight
  if (sum.weight) {

    const maxWeight = 1000;
    const healthPenaltyForWeight = 15;

    if (sum.weight > maxWeight) {
      const penalty = (sum.weight - maxWeight) * healthPenaltyForWeight;
      sum.health = (sum.health || 0) - penalty;
    }
  }


  return sum;
}
