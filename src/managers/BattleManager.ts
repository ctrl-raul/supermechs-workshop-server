import { User } from '../User';



export class BattleManager {

  public static connect(user: User): void {

    const socket = user.socket;

    socket.on('battle.event', (event: any) => {

      // Make sure the player is in a battle

      if (user.battle === null) {
        socket.emit('battle.event.error', { message: 'Not in battle' });
        return;
      }


      // Append server-sided values

      Object.assign(event, {
        droneDamageScale: Math.random(),
        damageScale: Math.random(),
        fromServer: true,
      })


      // Send event to players

      const opponent = user.battle.a === user ? user.battle.b : user.battle.a;

      opponent.socket.emit('battle.event.confirmation', event);
      socket.emit('battle.event.confirmation', event);

    });

    socket.on('battle.quit', () => {

      // Make sure the player is in a battle
  
      if (user.battle === null) {
        socket.emit('battle.error', { message: 'Not in battle' });
        return;
      }
  
  
      // Notify their opponent
  
      this.quitBattle(user);
  
    });

  }


  // Private methods

  private static quitBattle(user: User): void {

    if (user.battle === null) {
      return;
    }

    const oppo = user.battle.a === user ? user.battle.b : user.battle.a;

    oppo.battle = null;
    user.battle = null;

    oppo.socket.emit('battle.opponent.quit');

  }

}
