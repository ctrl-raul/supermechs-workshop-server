import socketio from 'socket.io'
import http from 'http'
import dotenv from 'dotenv'
import env from './utils/env'
import * as MatchMaker from './MatchMaker'
import { Player } from './Player'



// Set environment variables

dotenv.config()



// Socket configuration

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

server.listen(PORT, () => console.log('Listening at', PORT))



// Socket listeners

io.on('connection', socket => {

  console.log(socket.id, 'has connected')


  // Latency simulation for testing purposes
  if (DEV) {
    setEmitDelay(socket)
  }


  const player = new Player(socket)



  // Connection events

  socket.on('disconnect', () => {

    console.log(`${socket.id}(${player.name}) has disconnected`)

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

  })



  // Match maker events

  socket.on('matchmaker.join', data => {

    try {

      player.setData(data)

      // Add player to match maker
      MatchMaker.joinMatchMaker(player)

      // Notify player
      socket.emit('matchmaker.join.success')

    } catch (err: any) {

      socket.emit('matchmaker.join.error', { message: err.message })

    }

  })


  socket.on('matchmaker.quit', () => {

    try {

      // Remove from match maker
      MatchMaker.quitMatchMaker(player)

      // Notify player
      socket.emit('matchmaker.quit.success')

    } catch (err: any) {

      socket.emit('matchmaker.quit.error', { message: err.message })

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

})



// Utils

function setEmitDelay (socket: socketio.Socket): void {
  
  const emit = socket.emit

  socket.emit = function (...args) {

    setTimeout(() => emit.apply(socket, args), 500)

    // Naturally socket.emit always returns true
    return true

  }

}
