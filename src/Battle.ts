import { User } from './User'



// Types

interface BattleUserJSON {
  id: string
  name: string
  mech: {
    name: string
    setup: number[]
  }
  position: number
  isAdmin: boolean
}


interface BattleJSON {
  starterID: string
  a: BattleUserJSON
  b: BattleUserJSON
}




export class Battle {

  private static getRandomStartPositions (): [number, number] {
    const presets: [number, number][] = [[4, 5], [3, 6], [2, 7]]
    return presets[Math.floor(Math.random() * presets.length)]
  }



  // State

  public a: User
  public b: User
  public positions: Record<string, number>
  public starterID: string



  // Constructor

  constructor (a: User, b: User) {

    const randomPositions = Battle.getRandomStartPositions()

    this.a = a
    this.b = b

    this.positions = {
      [a.socket.id]: randomPositions[0],
      [b.socket.id]: randomPositions[1],
    }

    this.starterID = Math.random() > 0.5 ? a.socket.id : b.socket.id


    a.battle = this
    b.battle = this

  }



  // Methods

  public getJSON (): BattleJSON {

    return {
      starterID: this.starterID,
      a: {
        id: this.a.socket.id,
        name: this.a.name,
        mech: {
          name: this.a.mech.name,
          setup: this.a.mech.setup,
        },
        position: this.positions[this.a.socket.id],
        isAdmin: this.a.isAdmin,
      },
      b: {
        id: this.b.socket.id,
        name: this.b.name,
        mech: {
          name: this.b.mech.name,
          setup: this.b.mech.setup,
        },
        position: this.positions[this.b.socket.id],
        isAdmin: this.b.isAdmin,
      },
    }

  }

}
