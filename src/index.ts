import socketio from 'socket.io'
import http from 'http'
import dotenv from 'dotenv'
import express from 'express'
import basicAuth from 'express-basic-auth'
import env from './utils/env'
import * as MatchMaker from './MatchMaker'
import { Player } from './Player'



// Set environment variables

dotenv.config()



// Socket configuration

const EXPECTED_CLIENT_VERSION = '1'
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

app.use(
  basicAuth({
    challenge: true,
    users: {
      'raul': ''
    },
  })
)

app.use(express.static('public'))



// Socket listeners

io.on('connection', socket => {

  // @ts-ignore
  if (socket.request._query.clientVersion !== EXPECTED_CLIENT_VERSION) {

    socket.emit('server.error', {
      code: 'OUTDATED_CLIENT',
      message: '',
    })

    socket.disconnect()

    return

  }


  const player = new Player(socket)

  console.log(`[${socket.id}:${player.name}]`, 'has connected')



  // Let other players know how many online players there are
  playersOnline++
  io.to('playersonline.listening')
    .emit('playersonline', { count: playersOnline })



  if (DEV) {

    const emit = socket.emit
    const on = socket.on
    const logEvents = env('LOG_EVENTS', '0') === '1'

    socket.emit = function (...args) {

      if (logEvents) {
        console.log(`[${socket.id}:${player.name}] >>> ${args[0]}`, ...args.slice(1))
      }

      // Latency simulation for testing purposes
      setTimeout(() => emit.apply(socket, args), 500)

      // Naturally socket.emit always returns true
      return true 

    }

    if (logEvents) {

      socket.on = function (...args) {

        const listener = args[1]
        
        // @ts-ignore
        args[1] = function (...listenerArgs) {
          console.log(`[${socket.id}:${player.name}] <<< ${args[0]}`, ...listenerArgs)
          return listener(...listenerArgs)
        }
  
        return on.apply(socket, args)
      }

    }

  }



  // Connection events

  socket.on('disconnect', () => {

    // Make sure to remove the player from the match maker
    if (MatchMaker.isMatchMaking(player)) {
      MatchMaker.quitMatchMaker(player)
    }

    // Make sure to kick the player from battle
    if (player.battle) {
      const opponent = player.battle.p1 === player ? player.battle.p2 : player.battle.p1
      opponent.socket.emit('battle.opponent.quit')
      opponent.battle = null
      player.battle = null
    }

    // Let other players know how many online players there are
    playersOnline--
    io.to('playersonline.listening')
      .emit('playersonline', { count: playersOnline })

    console.log(`[${socket.id}:${player.name}]`, 'has disconnected')

  })



  // Match maker events

  socket.on('matchmaker.join', (data, callback) => {

    try {

      player.setData(data)

      // Add player to match maker
      MatchMaker.joinMatchMaker(player)

      // Notify player
      callback({ error: null })

    } catch (err: any) {

      callback({ error: { message: err.message } })

    }

  })


  socket.on('matchmaker.quit', (_, callback) => {

    try {

      // Remove from match maker
      MatchMaker.quitMatchMaker(player)

      // Notify player
      callback({ error: null })

    } catch (err: any) {

      callback({ error: { message: err.message } })

    }

  })


  socket.on('matchmaker.validation', data => {
    MatchMaker.setValidation(player, Boolean(data.result))
  })



  // Battle events

  socket.on('battle.event', event => {

    // Make sure the player is in a battle

    if (player.battle === null) {
      player.socket.emit('battle.event.error', { message: 'Not in battle' })
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

    opponent.socket.emit('battle.event.confirmation', event)
    player.socket.emit('battle.event.confirmation', event)

  })


  socket.on('battle.quit', () => {

    // Make sure the player is in a battle

    if (player.battle === null) {
      player.socket.emit('battle.event.error', { message: 'Not in battle' })
      return
    }


    // Notify their opponent

    const opponent = player.battle.p1 === player ? player.battle.p2 : player.battle.p1

    opponent.socket.emit('battle.opponent.quit')

  })



  // Statistics

  socket.on('playersonline.listen', () => {
    socket.join('playersonline.listening')
    socket.emit('playersonline', { count: playersOnline })
  })


  socket.on('playersonline.ignore', () => {
    socket.leave('playersonline.listening')
  })

})
