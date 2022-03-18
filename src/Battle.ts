import { Player } from './Player'



export class Battle {

  static getRandomStartPositions (): [number, number] {
    const presets: [number, number][] = [[4, 5], [3, 6], [2, 7]]
    return presets[Math.floor(Math.random() * presets.length)]
  }



  p1: Player
  p2: Player
  starterID: string



  constructor (p1: Player, p2: Player) {

    // Init self

    this.p1 = p1
    this.p2 = p2

    this.starterID = Math.random() > 0.5 ? p1.socket.id : p2.socket.id


    // Init players

    const randomPositions = Battle.getRandomStartPositions()

    p1.battle = this
    p1.position =  randomPositions[0]

    p2.battle = this
    p2.position =  randomPositions[1]

  }



  json (): Object {

    const p1 = this.p1.json()
    const p2 = this.p2.json()

    return { starterID: this.starterID, p1, p2 }

  }

}
