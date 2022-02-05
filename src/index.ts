import socketio from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';
import env from './utils/env';
import { getRandomStartPositions } from './battle/BattleUtils';



// Set environment variables

dotenv.config();



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

server.listen(PORT, () => {
  console.log('Listening at', PORT)
});



// Game logic

class Player {

  socket: socketio.Socket
  name: String
  setup: number[] = []
  battle: Battle | null = null

  constructor (socket: socketio.Socket) {
    this.socket = socket
    this.name = socket.id
  }

  json (): any {
    return {
      id: this.socket.id,
      name: this.name,
      setup: this.setup
    }
  }

}

const matchMaker: Player[] = []



// Socket listeners

io.on('connection', socket => {

  // Latency simulation for testing purposes
  if (DEV) {
    console.log('[index.ts] Socket emits are being delayed for testing purposes!')
    const emit = socket.emit
    socket.emit = function (...args) {
      setTimeout(() => emit.apply(socket, args), 500)
      // Naturally, socket.emit always returns true. (Don't ask)
      return true
    }
  }

  
  console.log(socket.id, 'has connected')

  const player = new Player(socket)


  socket.on('matchmaker.join', data => {

    try {

      if (matchMaker.includes(player)) {
        throw new Error('Already in matchmaker')
      }

      if (!Array.isArray(data.setup)) {
        throw new Error('Invalid mech setup (Error A)')
      }

      if (!data.setup.every((id: any) => typeof id === 'number' && !isNaN(id))) {
        throw new Error('Invalid mech setup (Error B)')
      }

      player.name = String(data.name).slice(0, 32)
      player.setup = data.setup

      matchMaker.push(player)

      console.log(player.name, 'has joined the matchMaker')

      socket.emit('matchmaker.join.success')

      tryToMatch(player)

    } catch (err: any) {

      socket.emit('matchmaker.join.error', {
        message: err.message
      })

    }

  })


  socket.on('matchmaker.quit', () => {

    try {

      removeFromMatchMaker(player)

      console.log(player.name, 'has quit the matchMaker')

      socket.emit('matchmaker.quit.success')

    } catch (err: any) {

      socket.emit('matchmaker.quit.error', {
        message: err.message
      })

    }

  })


  socket.on('disconnect', () => {
    
    if (matchMaker.includes(player)) {
      removeFromMatchMaker(player)
    }

    if (player.battle) {
      const opponent = player.battle.p1 === player ? player.battle.p2 : player.battle.p1
      opponent.socket.emit('battle.opponent.quit')
    }

  })


  socket.on('battle.event', event => {

    console.log('[battle.event] event:', event)

    if (player.battle === null) {
      player.socket.emit('battle.event.error', { message: 'Not in battle' })
      return
    }

    if (player.battle) {

      const opponent = player.battle.p1 === player ? player.battle.p2 : player.battle.p1

      Object.assign(event, { droneDamageScale: Math.random() })

      opponent.socket.emit('battle.event.confirmation', event)
      player.socket.emit('battle.event.confirmation', event)

    }
  })


  socket.on('battle.quit', () => {
    if (player.battle) {
      const opponent = player.battle.p1 === player ? player.battle.p2 : player.battle.p1
      opponent.socket.emit('battle.opponent.quit')
    }
  })

})



// functions

class Battle {

  p1: Player
  p2: Player

  constructor (p1: Player, p2: Player) {
    this.p1 = p1
    this.p2 = p2
  }

  json (): Object {

    const p1 = this.p1.json()
    const p2 = this.p2.json()

    const randomPositions = getRandomStartPositions()

    Object.assign(p1, { position: randomPositions[0] })
    Object.assign(p2, { position: randomPositions[1] })

    return {
      starterID: Math.random() > 0.5 ? p1.id : p2.id,
      p1,
      p2,
    }

  }

}


function removeFromMatchMaker (player: Player): void {

  const index = matchMaker.indexOf(player)

  if (index < 0) {
    throw new Error('Not in matchmaker')
  }

  matchMaker.splice(index, 1)

}


function tryToMatch (player: Player): void {

  for (const opponent of matchMaker) {

    if (opponent === player) {
      continue
    }

    startBattle(player, opponent)

  }

}


function startBattle (p1: Player, p2: Player): void {

  removeFromMatchMaker(p1)
  removeFromMatchMaker(p2)

  const battle = new Battle(p1, p2)

  p1.battle = battle
  p2.battle = battle

  const battleJSON = battle.json()
  console.log(battleJSON)

  p1.socket.emit('battle.start', battleJSON)
  p2.socket.emit('battle.start', battleJSON)

}
