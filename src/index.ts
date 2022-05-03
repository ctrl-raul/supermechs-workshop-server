import socketio from 'socket.io'
import http from 'http'
import dotenv from 'dotenv'
import env from './utils/env'
import * as MatchMaker from './MatchMaker'
import { Player } from './Player'



// Set environment variables

dotenv.config()



// Socket configuration

const EXPECTED_CLIENT_VERSION = 'gobsmacked!!!' // This should probably be an env var
const DEV = env('DEV', '0') === '1'
const PORT = Number(env('PORT', '3000')) // 3000 is the allowed by repl.it
const server = http.createServer()
const io = new socketio.Server(server, {
  cors: {
    origin: '*',
    // origin: ['http://localhost:5000', 'https://supermechs-workshop.vercel.app/'],
    // credentials: true,
  }
})

let playersOnline = 0

server.listen(PORT, () => console.log('Listening at', PORT))



// Socket listeners

io.on('connection', socket => {

  // TODO: Get rid of query parameters support in the next update (Also in the Player class)

  // @ts-ignore
  const clientVersion = socket.request.headers['x-client-version'] || socket.request._query.clientVersion
  const player = new Player(socket as socketio.Socket)


  // Make sure the client it's up to date, otherwise disconnect it
  if (clientVersion !== EXPECTED_CLIENT_VERSION) {
    player.emitServerError(true, 'OUTDATED_CLIENT', '')
    return
  }



  // Let other players know how many online players there are
  playersOnline++
  io.to('playersonline.listening')
    .emit('playersonline', { count: playersOnline })



  // When in dev, apply delay to emits to simulate latency
  if (DEV) {
    player.delayEmits(500)
  }



  // Connection events

  player.on('disconnect', () => {

    // Let other players know how many online players there are
    playersOnline--
    io.to('playersonline.listening')
      .emit('playersonline', { count: playersOnline })

  })



  // Match maker events

  player.on('matchmaker.join', (data, callback) => {

    if (typeof callback !== 'function') {
      player.disconnect()
    }

    try {

      player.setData(data)

      MatchMaker.joinMatchMaker(player)

      callback({ error: null })

    } catch (err: any) {

      callback({ error: { message: err.message } })

    }

  })


  player.on('matchmaker.quit', (_, callback) => {

    if (typeof callback !== 'function') {
      player.disconnect()
    }

    try {

      MatchMaker.quitMatchMaker(player)

      callback({ error: null })

    } catch (err: any) {

      callback({ error: { message: err.message } })

    }

  })


  player.on('matchmaker.validation', data => {
    MatchMaker.setValidation(player, Boolean(data.result))
  })



  // Battle events

  player.on('battle.event', event => {

    // Make sure the player is in a battle

    if (player.battle === null) {
      player.emit('battle.event.error', { message: 'Not in battle' })
      return
    }


    // Add server's contribution to the event

    Object.assign(event, {
      droneDamageScale: Math.random(),
      damageScale: Math.random(),
      fromServer: true,
    })


    // Send event to players

    const opponent = player.battle.p1 === player ? player.battle.p2 : player.battle.p1

    opponent.emit('battle.event.confirmation', event)
    player.emit('battle.event.confirmation', event)

  })


  player.on('battle.quit', () => {

    // Make sure the player is in a battle

    if (player.battle === null) {
      player.emit('battle.event.error', { message: 'Not in battle' })
      return
    }


    // Notify their opponent

    player.quitBattle()

  })



  // Statistics

  player.on('playersonline.listen', () => {
    socket.join('playersonline.listening')
    player.emit('playersonline', { count: playersOnline })
  })


  player.on('playersonline.ignore', () => {
    socket.leave('playersonline.listening')
  })

})
