import { Battle } from './Battle'
import { Player } from './Player'



// Types

interface Validation {
  [SocketID: string]: {
    player: Player,
    accepted: boolean | null
  }
}



// Data

const pool: Player[] = []
const validations: Validation[] = []



// Methods

export function joinMatchMaker (player: Player): void {

  if (isMatchMaking(player)) {
    /* My brain tells me to throw an error, but my heart
     * says the client doesn't give a shit about it */
    // throw new Error('Already match-making')
    return
  }

  if (validations.findIndex(v => player.socket.id in v) !== -1) {
    // Already validating an opponent
    return
  }

  // If the player is in battle, we end it
  if (player.battle) {
    player.quitBattle()
  }

  pool.push(player)

  // console.log(`${player.socket.id}(${player.name}) has joined the match maker`, pool.map(player => player.name))

  tryToMatch(player)

}


export function quitMatchMaker (player: Player): void {

  const index = pool.indexOf(player)

  if (index !== -1) {

    pool.splice(index, 1)

  } else {

    // Not match-making, so we check if they're validating an opponent

    const validationIndex = validations.findIndex(v => player.socket.id in v)

    if (validationIndex === -1) {
      /* Also not validating an opponent. Tried to quit the match maker while
       * not in any match-making phase, clear signal of severe skill issues */
      // throw new Error('Not match-making')
      return
    }

    /* They're validating an opponent so we delete
     * the validation tracker to cancel the validation */
    validations.splice(validationIndex, 1)

  }

  // console.log(`${player.socket.id}(${player.name}) has quit the match maker`, pool.map(player => player.name))

}


export function isMatchMaking (player: Player): boolean {
  return pool.includes(player)
}


export function setValidation (player: Player, valid: boolean): void {

  const validationIndex = validations.findIndex(v => player.socket.id in v)

  /* Check if there is no ongoing validation for this player.
   * Happens if the client just sends this packet when it
   * shouldn't, if the opponent already rejected, or if any
   * of them quit the match maker */
  if (validationIndex === -1) {
    joinMatchMaker(player)
    return
  }

  const validation = validations[validationIndex]
  const opponentData = Object.values(validation).find(data => data.player !== player)!


  // Handle validation result

  if (valid) {

    // Check if opponent accepted
    if (opponentData.accepted === true) {

      // Delete validation tracker
      validations.splice(validationIndex, 1)

      // Start battle
      startBattle(player, opponentData.player)

    } else {

      /* Opponent didn't validate yet, so we
       * do this to them know we accepted */
      validation[player.socket.id].accepted = true

    }

  } else {

    /* Client doesn't say the setup and hash matches, the
     * opponent is probably using a different items pack */

    // Add opponent to the list of players we can't match with
    player.noMatch.push(opponentData.player.socket.id)

    // Delete the ongoing validation
    validations.splice(validationIndex, 1)

    // Go back to match maker
    joinMatchMaker(player)

    // If opponent had accepted put them back into the match maker
    if (opponentData.accepted === true) {
      joinMatchMaker(opponentData.player)
    }

  }

}



// Private functions

function tryToMatch (p1: Player): void {

  for (const p2 of pool) {

    if (p2 === p1) {
      continue
    }

    if (p1.noMatch.includes(p2.socket.id) || p2.noMatch.includes(p1.socket.id)) {
      continue
    }

    quitMatchMaker(p1)
    quitMatchMaker(p2)

    validateEachOther(p1, p2)

    break

  }

}


function validateEachOther (p1: Player, p2: Player): void {

  validations.push({
    [p1.socket.id]: {
      player: p1,
      accepted: null
    },
    [p2.socket.id]: {
      player: p2,
      accepted: null
    }
  })

  p1.emit('matchmaker.validation', { itemsHash: p2.itemsHash, setup: p2.mech.setup })
  p2.emit('matchmaker.validation', { itemsHash: p1.itemsHash, setup: p1.mech.setup })

}


function startBattle (p1: Player, p2: Player): void {

  const battle = new Battle(p1, p2)
  const battleJSON = battle.json()

  p1.emit('battle.start', battleJSON)
  p2.emit('battle.start', battleJSON)

}
