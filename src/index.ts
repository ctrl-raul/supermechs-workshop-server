import socketio from 'socket.io'
import http from 'http'
import dotenv from 'dotenv'
import express from 'express'
import env from './utils/env'
import * as MatchMaker from './MatchMaker'
import { Player } from './Player'



// Set environment variables

dotenv.config()



// Socket configuration

const EXPECTED_CLIENT_VERSION = '2'
const DEV = env('DEV', '0') === '1'
const PORT = Number(env('PORT', '3000')) // 3000 is the port allowed by repl.it
const app = express()
const server = http.createServer(app)
const io = new socketio.Server(server, {
  cors: {
    origin: '*',
  }
})

let playersOnline = 0

server.listen(PORT, () => console.log('Listening at', PORT))



// Ensure this is before any other middleware or routes

// app.use(
//   basicAuth({
//     challenge: true,
//     users: {
//       'raul': ''
//     },
//   })
// )

app.use(express.static('public'))



// Socket listeners

io.on('connection', socket => {

  // @ts-ignore
  const clientVersion = socket.request._query.clientVersion
  const player = new Player(socket)


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

  socket.on('disconnect', () => {

    player.disconnect()

    // Let other players know how many online players there are
    playersOnline--
    io.to('playersonline.listening')
      .emit('playersonline', { count: playersOnline })

  })



  // Match maker events

  player.on('matchmaker.join', (data, callback) => {

    try {

      player.setData(data)

      MatchMaker.joinMatchMaker(player)

      callback({ error: null })

    } catch (err: any) {

      callback({ error: { message: err.message } })

    }

  })


  player.on('matchmaker.quit', (_, callback) => {

    try {

      MatchMaker.quitMatchMaker(player)

      callback({ error: null })

    } catch (err: any) {

      callback({ error: { message: err.message } })

    }

  })


  player.on('foo', () => {})


  // Battle events

  player.on('battle.event', event => {

    // player.logGetting('battle.event', event)

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


  socket.on('battle.quit', () => {
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
