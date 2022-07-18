import socketio, { Socket } from 'socket.io'
import http from 'http'
import dotenv from 'dotenv'
import env from './utils/env'
import * as MatchMaker from './MatchMaker'
import { Player } from './Player'



// Set environment variables

dotenv.config()



// Socket configuration

const EXPECTED_CLIENT_VERSION = '2' // This should probably be an env var
const DEV = env('DEV', '0') === '1'
const PORT = Number(env('PORT', '3000')) // 3000 is the allowed by repl.it
const ROOM_LOBBY = 'room_lobby'

const server = http.createServer()
const io = new socketio.Server(server, {
  cors: {
    origin: '*',
    // origin: ['http://localhost:5000', 'https://supermechs-workshop.vercel.app/'],
    // credentials: true,
  }
})


const players: Record<string, Player> = {}

server.listen(PORT, () => console.log('Listening at', PORT))



// Socket listeners

io.on('connection', socket => {

  // TODO: Get rid of query parameters support in the next update (Also in the Player class)

  // @ts-ignore
  const clientVersion = socket.request.headers['x-client-version'] || socket.request._query.clientVersion
  const player = new Player(socket as socketio.Socket)

  players[socket.id] = player


  // Make sure the client it's up to date, otherwise disconnect it
  if (clientVersion !== EXPECTED_CLIENT_VERSION) {
    player.emitServerError(true, 'OUTDATED_CLIENT', '')
    return
  }



  // When in dev, apply delay to emits to simulate latency
  if (DEV) {
    player.delayEmits(500)
  }



  // Connection events

  player.on('disconnecting', () => {

    delete players[socket.id]

    if (socket.rooms.has(ROOM_LOBBY)) {
      // Notify other players that this socket left the lobby
      io.to(ROOM_LOBBY).emit('lobby.players.exited', { 
        id: socket.id
      })
    }

  })



  // Match maker events

  player.on('matchmaker.join', (data, callback) => {

    if (typeof callback !== 'function') {
      player.disconnect()
    }

    try {

      player.setData(data)

      MatchMaker.joinMatchMaker(player)

      io.to(ROOM_LOBBY).emit('lobby.players.matchmaker', { 
        id: socket.id,
        isInMatchMaker: true
      })

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

      io.to(ROOM_LOBBY).emit('lobby.players.matchmaker', { 
        id: socket.id,
        isInMatchMaker: false
      })

      callback({ error: null })

    } catch (err: any) {

      callback({ error: { message: err.message } })

    }

  })


  player.on('matchmaker.validation', data => {
    MatchMaker.setValidation(player, Boolean(data.result))
  })


  // Lobby events

  player.on('lobby.join', async () => {

    // Notify other players that this socket joined the lobby
    io.to(ROOM_LOBBY).emit('lobby.players.joined', { 
      player: {
        name: player.name,
        id: socket.id,
        isInMatchMaker: MatchMaker.isMatchMaking(player),
        admin: player.admin,
      }
    })

    socket.join(ROOM_LOBBY)
    socket.emit('lobby.players', {
      players: getPlayersInRoom(ROOM_LOBBY).map(_player => ({
        name: _player.name,
        id: _player.socket.id,
        isInMatchMaker: MatchMaker.isMatchMaking(_player),
        admin: _player.admin,
      }))
    })

  })

  player.on('lobby.exit', () => {

    socket.join(ROOM_LOBBY)

    // Notify other players that this socket left the lobby
    io.to(ROOM_LOBBY).emit('lobby.players.exited', { 
      id: socket.id
    })

  })



  // Profile events

  player.on('profile.update', (data: any) => {

    try {

      player.setData(data)

    } catch (err: any) {

      player._log('BAD DATA:', data)
      player.disconnect()

      return

    }

    if (socket.rooms.has(ROOM_LOBBY)) {
      io.to(ROOM_LOBBY).emit('profile.update', { 
        id: socket.id,
        name: player.name
      })
    }

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

})



// Utils

function getPlayersInRoom(room: string): Player[] {

  const socketsIDs = io.sockets.adapter.rooms.get(room)

  if (!socketsIDs) {
    return []
  }

  return Array.from(socketsIDs.keys()).map(id => players[id])

}
