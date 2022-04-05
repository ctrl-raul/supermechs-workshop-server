import socketio from 'socket.io'
import { Battle } from './Battle'
import env from './utils/env'



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
  name: string
  mechName = ''
  admin = false
  setup: number[] = []
  battle: Battle | null = null
  position = 0
  noMatch: string[] = []
  itemsHash: string = ''


  constructor (socket: socketio.Socket) {
    this.socket = socket
    // @ts-ignore
    this.name = socket.request._query.name
  }


  setData (data: any): void {

    // Sanity checks
    if (!Array.isArray(data.setup) || !data.setup.every(isSaneNumber)) {
      throw new Error(`Invalid mech setup: ${data.setup}`)
    }

    this.noMatch.length = 0

    // Update player data
    this.setName(data.name)
    this.mechName = String(data.mechName).slice(0, 32)
    this.setup = data.setup
    this.itemsHash = String(data.itemsHash)

  }


  setName (name: string): void {

    name = String(name).slice(0, 32)

    const adminPrefix = env('ADMIN_PREFIX', '')

    if (adminPrefix && name.startsWith(adminPrefix)) {
      this.name = name.replace(adminPrefix, '')
      this.admin = true
    }

  }


  json (): any {
    return {
      id: this.socket.id,
      name: this.name,
      mechName: this.mechName,
      setup: this.setup,
      position: this.position,
      admin: this.admin
    }
  }

}
