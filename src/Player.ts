import socketio from 'socket.io'
import { Battle } from './Battle'



// Util

function isSaneNumber (value: number): boolean {

  if (typeof value !== 'number') {
    return false
  }

  if (isNaN(value)) {
    return false
  }

  if (value === Infinity || value === -Infinity) {
    return false
  }

  return true

}



// Class

export class Player {

  socket: socketio.Socket
  name: String
  setup: number[] = []
  battle: Battle | null = null
  position = 0


  constructor (socket: socketio.Socket) {
    this.socket = socket
    this.name = socket.id
  }


  setData (data: any): void {

    // Sanity checks
    if (!Array.isArray(data.setup) || !data.setup.every(isSaneNumber)) {
      throw new Error(`Invalid mech setup: ${data.setup}`)
    }

    // Update player data
    this.name = String(data.name).slice(0, 32)
    this.setup = data.setup

  }


  json (): any {
    return {
      id: this.socket.id,
      name: this.name,
      setup: this.setup,
      position: this.position
    }
  }

}
