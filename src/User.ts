import socketio from 'socket.io';
import { Battle } from './Battle';
import { BattleItem, SlotID } from './Battle/BattlesManager';



// Class

export class User {

  // State

  public socket: socketio.Socket;
  public isAdmin: boolean = false;
  public battle: Battle | null = null;
  public dontMatch: User[] = [];



  // Profile

  public name: string = ''
  public mech: {
    name: string;
    slots: Record<SlotID, BattleItem | null>;
    hash: string;
  } = {
    name: '',
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
    hash: '',
  }



  // Constructor

  constructor (socket: socketio.Socket) {
    this.socket = socket
  }

}
