// I plan to get rid of this file completely


type MechSetup = (Item | null)[];


interface ItemImg {
	readonly width: number;
	readonly height: number;
	readonly url: string;
}


interface ItemStats {
  weight?: number;
  health?: number;
  eneCap?: number;
  eneReg?: number;
  heaCap?: number;
  heaCol?: number;

  phyRes?: number;
  expRes?: number;
  eleRes?: number;

  phyDmg?: [number, number];
  phyResDmg?: number;

  expDmg?: [number, number];
  expResDmg?: number;
  heaDmg?: number;
  heaCapDmg?: number;
  heaColDmg?: number;

  eleDmg?: [number, number];
  eleResDmg?: number;
  eneDmg?: number;
  eneCapDmg?: number;
  eneRegDmg?: number;

  walk?: number;
  jump?: number;

  range?: [number, number];

  push?: number;
  pull?: number;
  recoil?: number;
  advance?: number;
  retreat?: number;

  uses?: number;
  backfire?: number;
  heaCost?: number;
  eneCost?: number;
}


interface RawItem {
  name: string;
  id: number;
  image: string;
  width?: number;
  height?: number;
  type: string;
  element: string;
  transform_range: string;
  attachment: any;
  stats: ItemStats;
  tags?: string[];
}

interface Item {
  name: string;
  id: number;
  image: ItemImg;
  type: string;
  element: string;
  kind: string;
  transform_range: string;
  attachment: any;
  stats: ItemStats;
  error: Error;
  __typeof: string;
  tags: string[];
}

interface Mech {
  name: string;
  setup: MechSetup;
}
