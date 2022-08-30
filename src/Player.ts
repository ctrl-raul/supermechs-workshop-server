import socketio from 'socket.io'
import { env } from './utils/env'
import * as MatchMaker from './MatchMaker'
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
  name: string = 'Unnamed Pilot'
  mech = {
    name: '',
    setup: [] as number[]
  }
  admin = false
  battle: Battle | null = null
  position = 0
  noMatch: string[] = []
  itemsHash: string = ''


  constructor (socket: socketio.Socket) {

    this.socket = socket

    if (socket.request.headers['x-player-name']) {
      this.setName(String(socket.request.headers['x-player-name']))
    }

    this._log(':: Connected')
    
  }


  // Methods

  /** Applies a permanent delay to every emit calls to simulate latency */
  delayEmits (ms: number): void {

    const emit = this.emit

    this.emit = (...args) => {

      // Latency simulation for testing purposes
      setTimeout(() => emit.apply(this, args), ms)

      // Naturally socket.emit always returns true
      return true 

    }

  }


  /** Socket emit but intercepted for logging */
  emit (event: string, data?: any, callback?: (response: any) => void): void {

    this._log(`-> "${event}"`, data)

    if (callback === undefined) {

      this.socket.emit(event, data)

    } else {

      const callbackWrapper = (response: any) => {

        this._log(`<- "${event}" [callback]`, response)

        callback(response)

      }

      this.socket.emit(event, data, callbackWrapper)

    }

  }


  /** Socket on but intercepted for logging */
  on (event: string, listener: (data: any, callback: (response: any) => void) => void): void {

    const listenerWrapper: typeof listener = (data, callback) => {

      this._log(`<- "${event}"`, data || '')

      listener(data, response => {
        if (typeof callback === 'function') {
          callback(response)
        } else {
          this.emitServerError(true, 'MISSING_CALLBACK', event)
        }
      })

    }

    this.socket.on(event, listenerWrapper)

  }


  /** Safely sets a new name */
  setName (name: string): void {

    this.name = name.slice(0, 32)

    const adminPrefix = env('ADMIN_PREFIX', '')

    if (adminPrefix && this.name.startsWith(adminPrefix)) {
      this.name = this.name.replace(adminPrefix, '')
      this.admin = true
    }

  }


  /** Safely sets new data */
  setData (data: any): void {

    // Sanity checks

    // Entirely invalid data
    if (!data || typeof data !== 'object') {
      throw new Error()
    }

    // Invalid mech
    if (!data.mech || typeof data.mech !== 'object') {
      throw new Error()
    }

    // Invalid name
    if (typeof data.name !== 'string') {
      throw new Error()
    }

    // Invalid mech name
    if (typeof data.mech.name !== 'string') {
      throw new Error()
    }

    // Invalid mech setup
    if (!Array.isArray(data.mech.setup) || !data.mech.setup.every(isSaneNumber)) {
      // Invalid mech setup
      throw new Error()
    }

    // Invalid itemsHash
    if (typeof data.itemsHash !== 'string') {
      throw new Error()
    }


    // Changed mech, so we reset this
    this.noMatch.length = 0

    // Update player data
    this.name = data.name.slice(0, 32)
    this.mech = data.mech
    this.itemsHash = data.itemsHash

    const adminPrefix = env('ADMIN_PREFIX', '')

    if (adminPrefix && this.name.startsWith(adminPrefix)) {
      this.name = this.name.replace(adminPrefix, '')
      this.admin = true
    }

  }


  /** The message is shown if the client doesn't recodgnize the code */
  emitServerError (disconnect: boolean, code: string, message: string): void {

    if (disconnect) {
      this.disconnect()
    }

    this.emit('server.message', { code, message })

  }


  quitBattle (): void {

    if (this.battle === null) {
      return
    }

    const oppo = this.battle.p1 === this ? this.battle.p2 : this.battle.p1

    oppo.battle = null
    this.battle = null

    oppo.emit('battle.opponent.quit')

  }


  json (): any {
    return {
      id: this.socket.id,
      name: this.name,
      mech: this.mech,
      position: this.position,
      admin: this.admin
    }
  }


  disconnect (): void {

    // Make sure to remove the player from the match maker
    if (MatchMaker.isMatchMaking(this)) {
      MatchMaker.quitMatchMaker(this)
    }

    // Make sure to kick the player from battle
    this.quitBattle()

    // A goodbye to console
    this._log(':: Disconnected')

  }


  public _log (...args: any[]): void {
    console.log(`[${this.socket.id.slice(0, 5)}] ${this.name}`, ...args)
  }

}
