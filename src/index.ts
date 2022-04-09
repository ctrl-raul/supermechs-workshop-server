import socketio from 'socket.io'
import http from 'http'
import dotenv from 'dotenv'
import env from './utils/env'
import * as MatchMaker from './MatchMaker'
import { Player } from './Player'



// Set environment variables

dotenv.config()



// Socket configuration

const EXPECTED_CLIENT_VERSION = 'flabbergasted!!!'
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

  console.log(socket.id, 'has connected')

  // @ts-ignore
  const { clientVersion } = socket.request._query
  
  if (clientVersion !== EXPECTED_CLIENT_VERSION) {

    socket.emit('server.message', {
      code: 'OUTDATED_CLIENT',
      message: '', // Will be shown in case the client doesn't support the code
    })

    socket.disconnect()

    return

  }


  // Let other players know how many online players there are
  playersOnline++
  io.to('playersonline.listening')
    .emit('playersonline', { count: playersOnline })



  if (DEV) {

    const emit = socket.emit
    const on = socket.on

    socket.emit = function (...args) {
      console.log(`[${socket.id}:${player.name}] >>> ${args[0]}`, ...args.slice(1))
      // Latency simulation for testing purposes
      setTimeout(() => emit.apply(socket, args), 500)
      return true // Naturally socket.emit always returns true
    }

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


  const player = new Player(socket)



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

  })



  // Match maker events

  socket.on('matchmaker.join', (data, callback) => {

    if (typeof callback !== 'function') {
      socket.disconnect()
    }

    try {

      player.setData(data)

      MatchMaker.joinMatchMaker(player)

      callback({ error: null })

    } catch (err: any) {

      callback({ error: { message: err.message } })

    }

  })


  socket.on('matchmaker.quit', (_, callback) => {

    if (typeof callback !== 'function') {
      socket.disconnect()
    }

    try {

      MatchMaker.quitMatchMaker(player)

      callback({ error: null })

    } catch (err: any) {

      callback({ error: { message: err.message } })

    }

  })


  socket.on('matchmaker.validation', data => {
    console.log(`[${socket.id}] <<< matchmaker.validation ::`, data)
    MatchMaker.setValidation(player, Boolean(data.result))
  })



  // Battle events

  socket.on('battle.event', event => {

    console.log(`${socket.id}(${player.name}) <<< battle.event ::`, event)


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
