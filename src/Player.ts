import socketio from 'socket.io'
import { Battle } from './Battle'
import env from './utils/env'
import * as MatchMaker from './MatchMaker'



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

  // Props

  socket: socketio.Socket
  name: string = 'Unnamed Pilot'
  mechName = ''
  admin = false
  setup: number[] = []
  battle: Battle | null = null
  position = 0
  noMatch: string[] = []
  itemsHash: string = ''


  constructor (socket: socketio.Socket) {

    // @ts-ignore
    const rawName = socket.request._query.name

    this.socket = socket

    this.setName(rawName)

    this.log('Connected')

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

    this._log(`>>> "${event}"`, data)

    // if (callback === undefined) {

    //   this.socket.emit(event, data)

    // } else {
      if (callback === undefined) {
        console.log('undef callback for ', this.name)
      } else {
        console.log('has callback for ', this.name)
      }

      const callbackWrapper = (response: any) => {

        this._log(`<<< "${event}" [callback]`, response)

        if (callback !== undefined) {
          callback(response)
        }

      }

      this.socket.emit(event, data, callbackWrapper)

    // }

  }


  /** Socket on but intercepted for logging */
  on (event: string, listener: (data: any, callback: (response: any) => void) => void): void {

    const listenerWrapper: typeof listener = (data, callback) => {

      this._log(`<<< "${event}"`, data)

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
  setName (name: any): void {

    name = String(name).slice(0, 32)

    const adminPrefix = env('ADMIN_PREFIX', '')

    if (adminPrefix && name.startsWith(adminPrefix)) {
      this.name = name.replace(adminPrefix, '')
      this.admin = true
    }

  }


  /** Safely sets new data */
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


  /** TODO: Make this automatically quit battle n shit */
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


  emitServerError (disconnect: boolean, code: string, message: string): void {

    if (disconnect) {
      this.disconnect()
    }

    this.emit('server.error', { code, message })

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


  private _log (...args: any[]): void {
    console.log(`[${this.socket.id.slice(0, 5)}] ${this.name}`, ...args)
  }


  log (...args: any[]): void {
    this._log('::', ...args)
  }

  logGetting (event: string, ...args: any[]): void {
    this._log(`<<< "${event}"`, ...args)
  }

  logSending (event: string, ...args: any[]): void {
    this._log(`>>> "${event}"`, ...args)
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
