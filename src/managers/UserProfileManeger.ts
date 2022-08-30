import { env } from '../utils/env'
import { User } from '../User'
import { SocketManager } from './SocketManager'
import * as Ty from 'typeye'



// Type checkers

const ProfileUpdateData = Ty.Rec({
  name: Ty.Optional(Ty.Str),
  mech: Ty.Optional(Ty.Rec({
    name: Ty.Str,
    setup: Ty.Arr(Ty.Num),
    hash: Ty.Str,
  })),
});



// Class

export class UserProfileManager {

  // Config

  public static MAX_NAME_LENGTH: number = parseInt(env('MAX_NAME_LENGTH', '32'));



  // Methods

  public static connect (user: User): void {

    const socket = user.socket

    user.name = this.parseName(socket.request.headers['x-player-name']);

    socket.on('profile.update', (data: any) => {
      try {
        this.updateProfile(user, data);
        socket.emit('profile.updateSuccess');
      } catch (err: any) {
        socket.emit('profile.updateError', { message: err.message });
      }
    });

  }



  // Methods

  public static updateProfile(user: User, data: any): void {

    const validData = ProfileUpdateData.assert(data);

    if (validData.name) {
      user.name = this.parseName(validData.name);
    }

    if (validData.mech) {
      user.mech.name = this.parseName(validData.mech.name);
      user.mech.setup = validData.mech.setup;
      user.mech.hash = validData.mech.hash;
    }

  }


  public static userHasValidProfile(user: User): boolean {

    if (!user.name) {
      return false;
    }

    if (!user.mech.hash) {
      return false;
    }

    return true;

  }



  // Utils

  private static parseName (raw: any): string {

    if (typeof raw !== 'string' || raw.length === 0) {
      return 'Unnamed Pilot'
    }

    return raw.slice(0, 32)

  }

}
