import { env } from '../utils/env'
import { User } from '../User'
import * as Ty from 'typeye'



// Type checkers

const TyBattleItem = Ty.Nullable(Ty.Rec({
  name: Ty.Str,
  stats: Ty.Rec({
    weight: Ty.Optional(Ty.Num),
    health: Ty.Optional(Ty.Num),
    eneCap: Ty.Optional(Ty.Num),
    eneReg: Ty.Optional(Ty.Num),
    heaCap: Ty.Optional(Ty.Num),
    heaCol: Ty.Optional(Ty.Num),
    phyRes: Ty.Optional(Ty.Num),
    expRes: Ty.Optional(Ty.Num),
    eleRes: Ty.Optional(Ty.Num),
    bulletsCap: Ty.Optional(Ty.Num),
    rocketsCap: Ty.Optional(Ty.Num),
    phyResDmg: Ty.Optional(Ty.Num),
    expResDmg: Ty.Optional(Ty.Num),
    heaDmg: Ty.Optional(Ty.Num),
    heaCapDmg: Ty.Optional(Ty.Num),
    heaColDmg: Ty.Optional(Ty.Num),
    eleResDmg: Ty.Optional(Ty.Num),
    eneDmg: Ty.Optional(Ty.Num),
    eneCapDmg: Ty.Optional(Ty.Num),
    eneRegDmg: Ty.Optional(Ty.Num),
    walk: Ty.Optional(Ty.Num),
    jump: Ty.Optional(Ty.Num),
    push: Ty.Optional(Ty.Num),
    pull: Ty.Optional(Ty.Num),
    recoil: Ty.Optional(Ty.Num),
    advance: Ty.Optional(Ty.Num),
    retreat: Ty.Optional(Ty.Num),
    uses: Ty.Optional(Ty.Num),
    backfire: Ty.Optional(Ty.Num),
    heaCost: Ty.Optional(Ty.Num),
    eneCost: Ty.Optional(Ty.Num),
    bulletsCost: Ty.Optional(Ty.Num),
    rocketsCost: Ty.Optional(Ty.Num),
    phyDmg: Ty.Optional(Ty.Tup(Ty.Num, Ty.Num)),
    expDmg: Ty.Optional(Ty.Tup(Ty.Num, Ty.Num)),
    eleDmg: Ty.Optional(Ty.Tup(Ty.Num, Ty.Num)),
    range: Ty.Optional(Ty.Tup(Ty.Num, Ty.Num)),
  })
}));

const ProfileUpdateData = Ty.Rec({
  name: Ty.Optional(Ty.Str),
  mech: Ty.Optional(Ty.Rec({
    name: Ty.Str,
    slots: Ty.Rec({
      torso: TyBattleItem,
      legs: TyBattleItem,
      sideWeapon1: TyBattleItem,
      sideWeapon2: TyBattleItem,
      sideWeapon3: TyBattleItem,
      sideWeapon4: TyBattleItem,
      topWeapon1: TyBattleItem,
      topWeapon2: TyBattleItem,
      drone: TyBattleItem,
      chargeEngine: TyBattleItem,
      teleporter: TyBattleItem,
      grapplingHook: TyBattleItem,
      module1: TyBattleItem,
      module2: TyBattleItem,
      module3: TyBattleItem,
      module4: TyBattleItem,
      module5: TyBattleItem,
      module6: TyBattleItem,
      module7: TyBattleItem,
      module8: TyBattleItem,
    }),
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
      user.mech.slots = validData.mech.slots;
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
