import { Battle } from '../Battle';
import { User } from '../User';
import { SocketManager } from './SocketManager';
import { UserProfileManager } from './UserProfileManeger';



// Types

interface Validation {
  [SocketID: string]: {
    user: User,
    accepted: boolean | null
  }
}


interface LobbyUserData {
  id: string
  name: string
  isMatchMaking: boolean
  admin: boolean
}



// Class

export class LobbyManager {

  // Config

  public static ROOM_LOBBY: string = 'room_lobby';



  // State

  private static usersMatchMaking: User[] = [];
  private static validations: Validation[] = [];



  // Methods

  public static connect (user: User): void {

    const socket = user.socket;


    socket.on('disconnecting', () => {

      // Notify other users that this socket left the lobby
      if (socket.rooms.has(LobbyManager.ROOM_LOBBY)) {
        SocketManager.io.to(LobbyManager.ROOM_LOBBY).emit('lobby.userExit', { 
          id: socket.id
        })
      }

    });


    socket.on('lobby.join', (data: any) => {

      try {
        UserProfileManager.updateProfile(user, data);
      } catch(err: any) {
        socket.emit('lobby.joinError', { message: err.message });
        return;
      }

      if (socket.rooms.has(LobbyManager.ROOM_LOBBY)) {
        socket.emit('lobby.joinError', { message: 'Already in lobby' });
        return;
      }

      // Notify other users that this socket joined the lobby
      SocketManager.io.to(LobbyManager.ROOM_LOBBY).emit('lobby.userJoin', { 
        user: LobbyManager.getLobbyUserData(user),
      });

      // Add to lobby
      socket.join(LobbyManager.ROOM_LOBBY);

      // Send list of users in lobby
      const usersInLobby = SocketManager.getUsersInRoom(LobbyManager.ROOM_LOBBY);

      socket.emit('lobby.joinSuccess', {
        users: usersInLobby.map(LobbyManager.getLobbyUserData)
      });
  
    });
  

    socket.on('lobby.exit', () => {

      if (socket.rooms.has(LobbyManager.ROOM_LOBBY)) {

        socket.leave(LobbyManager.ROOM_LOBBY);
  
        SocketManager.io.to(LobbyManager.ROOM_LOBBY)
          .emit('lobby.userExit', {  id: socket.id });

      } else {

        socket.emit('lobby.joinError', { message: 'Not in lobby' });

      }
  
    });


    socket.on('lobby.joinMatchMaker', (): void => {

      if (LobbyManager.usersMatchMaking.includes(user)) {
        socket.emit('lobby.joinMatchMakerError', {
          message: 'Already in match maker'
        });
        return;
      }

      if (!UserProfileManager.userHasValidProfile(user)) {
        console.log(user);
        socket.emit('lobby.joinMatchMakerError', {
          message: 'Invalid profile'
        });
        return;
      }
      
      LobbyManager.joinMatchMaker(user);

      socket.emit('lobby.joinMatchMakerSuccess');

      SocketManager.io.to(LobbyManager.ROOM_LOBBY)
        .emit('lobby.userJoinMatchMaker', { id: socket.id });

    });


    socket.on('lobby.exitMatchMaker', () => {

      if (LobbyManager.usersMatchMaking.includes(user)) {

        LobbyManager.exitMatchMaker(user);

        socket.emit('lobby.exitMatchMakerSuccess');

        SocketManager.io.to(LobbyManager.ROOM_LOBBY)
          .emit('lobby.userExitMatchMaker', { id: socket.id });

      } else {

        socket.emit('lobby.exitMatchMakerError', {
          message: 'Not in match maker'
        });

      }

    });


    socket.on('lobby.verifyOpponent', (data: any) => {
      LobbyManager.setValidation(user, !!data.valid);
    });

  }



  // Private methods

  private static joinMatchMaker (user: User): void {
  
    // Check if is already validating an opponent to battle
    if (LobbyManager.validations.some(validation => user.socket.id in validation)) {
      return;
    }
  
    // Check if the user is already battling
    if (user.battle) {
      // TODO: QUIT BATTLE
    }
  
    LobbyManager.usersMatchMaking.push(user);
    LobbyManager.matchMake(user);

  }


  private static exitMatchMaker (user: User): void {

    const index = LobbyManager.usersMatchMaking.indexOf(user)
  
    if (index !== -1) {
  
      LobbyManager.usersMatchMaking.splice(index, 1)
  
    } else {
  
      // Not match-making, so we check if they're validating an opponent
  
      const validationIndex = LobbyManager.validations.findIndex(validation => {
        return user.socket.id in validation
      })
  
      if (validationIndex === -1) {
        /* Also not validating an opponent. Tried to quit the match maker while
         * not in any match-making phase, clear signal of severe skill issues */
        // throw new Error('Not match-making')
        return
      }
  
      /* They're validating an opponent so we delete
       * the validation tracker to cancel the validation */
      LobbyManager.validations.splice(validationIndex, 1)
  
    }
  
  }


  private static matchMake (user: User): void {

    for (const opponent of LobbyManager.usersMatchMaking) {
  
      // Can't fight yourself :P
      if (opponent === user) {
        continue
      }

      if (user.dontMatch.includes(opponent) || opponent.dontMatch.includes(user)) {
        continue
      }

      LobbyManager.exitMatchMaker(user)
      LobbyManager.exitMatchMaker(opponent)
      LobbyManager.usersValidateEachOther(user, opponent)
  
      break
  
    }
  
  }


  private static usersValidateEachOther (a: User, b: User): void {

    LobbyManager.validations.push({
      [a.socket.id]: {
        user: a,
        accepted: null
      },
      [b.socket.id]: {
        user: b,
        accepted: null
      }
    })
  
    a.socket.emit('lobby.verifyOpponent', {
      hash: b.mech.hash,
      setup: b.mech.setup,
    })
    
    b.socket.emit('lobby.verifyOpponent', {
      hash: a.mech.hash,
      setup: a.mech.setup,
    })

  }


  private static setValidation (user: User, valid: boolean): void {

    console.log(user.name, valid);

    const validationIndex = LobbyManager.validations.findIndex(validation => {
      return user.socket.id in validation
    })
  
    /* Check if there is no ongoing validation for this user.
     * Happens if the client just sends this packet when it
     * shouldn't, if the opponent already rejected, or if any
     * of them quit the match maker */
    if (validationIndex === -1) {
      LobbyManager.joinMatchMaker(user)
      return
    }
  
    const validation = LobbyManager.validations[validationIndex]
    const opponentData = Object.values(validation).find(data => data.user !== user)!
  
  
    // Handle validation result
  
    if (valid) {
  
      // Check if opponent accepted
      if (opponentData.accepted === true) {
  
        // Delete validation tracker
        LobbyManager.validations.splice(validationIndex, 1)
  
        // Start battle
        LobbyManager.startBattle(user, opponentData.user)
  
      } else {
  
        /* Opponent didn't validate yet, so we
         * do this to them know we accepted */
        validation[user.socket.id].accepted = true
  
      }
  
    } else {
  
      /* Client doesn't say the setup and hash matches, the
       * opponent is probably using a different items pack */
  
      // Add opponent to the list of users we can't match with
      user.dontMatch.push(opponentData.user)
  
      // Delete the ongoing validation
      LobbyManager.validations.splice(validationIndex, 1)
  
      // Go back to match maker
      LobbyManager.joinMatchMaker(user)
  
      // If opponent had already accepted, put them back into the match maker
      if (opponentData.accepted === true) {
        LobbyManager.joinMatchMaker(opponentData.user)
      }
  
    }
  
  }


  private static startBattle (a: User, b: User): void {

    const battle = new Battle(a, b);
    const battleJSON = battle.getJSON();

    a.socket.emit('lobby.startBattle', battleJSON);
    b.socket.emit('lobby.startBattle', battleJSON);
  
  }
  


  // Utils

  private static getLobbyUserData (user: User): LobbyUserData {
    return {
      name: user.name,
      id: user.socket.id,
      isMatchMaking: LobbyManager.usersMatchMaking.includes(user),
      admin: user.isAdmin,
    }
  }

}
