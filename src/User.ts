import socketio from 'socket.io'
import { Battle } from './Battle'



// Class

export class User {

  // State

  public socket: socketio.Socket
  public isAdmin: boolean = false
  public battle: Battle | null = null
  public dontMatch: User[] = []



  // Profile

  public name: string = ''
  public mech = {
    name: '',
    setup: [] as number[],
    hash: '',
  }



  // Constructor

  constructor (socket: socketio.Socket) {
    this.socket = socket
  }

}
