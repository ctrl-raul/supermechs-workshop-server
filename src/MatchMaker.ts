import { Battle } from './Battle'
import { Player } from './Player'



// Data

const pool: Player[] = []



// Methods

export function joinMatchMaker (player: Player): void {

  if (isMatchMaking(player)) {
    throw new Error('Already match-making')
  }

  pool.push(player)

  console.log(`${player.socket.id}(${player.name}) has joined the match maker`)

  tryToMatch(player)

}


export function quitMatchMaker (player: Player): void {

  const index = pool.indexOf(player)

  if (index === -1) {
    throw new Error('Not match-making')
  }

  pool.splice(index, 1)

  console.log(`${player.socket.id}(${player.name}) has quit the match maker`)

}


export function isMatchMaking (player: Player): boolean {
  return pool.includes(player)
}



// Private functions

function tryToMatch (player: Player): void {

  for (const opponent of pool) {

    if (opponent === player) {
      continue
    }

    // validateEachOther(player, opponent)

    startBattle(player, opponent)

  }

}


function startBattle (p1: Player, p2: Player): void {

  quitMatchMaker(p1)
  quitMatchMaker(p2)

  const battle = new Battle(p1, p2)
  const battleJSON = battle.json()

  p1.socket.emit('battle.start', battleJSON)
  p2.socket.emit('battle.start', battleJSON)

}
