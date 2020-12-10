import * as rt from 'runtypes';
import Battle from './Battle';
import Procket from '../procket.io';
import BattleM from '../managers/BattleManager';


const pool: Connection[] = [];


export default class Connection
{
  procket: Procket;

  name: string;
  setup: any[];
  items_pack_hash: string;
  opponent: Connection | null = null;
  battle: Battle | null = null;

  inArenaPool = false;
  inMatchingPhase = false;

  ip: string;


  constructor (procket: Procket) {
    this.procket = procket;
    this.ip = procket.socket.handshake.headers['x-forwarded-for'];
    this.setListeners(procket);
  }

  setListeners (procket: Procket) {

    procket.on('arena_pool_join', (resolve, reject, data) => {

      if (this.inArenaPool) {
        reject({ error: true, message: `Already in pool` });
        return;
      }
      if (this.battle) {
        reject({ error: true, message: `In battle` });
        return;
      }
      if (this.inMatchingPhase) {
        reject({ error: true, message: `In matching phase` });
        return;
      }


      const data_runtype = rt.Record({
        name: rt.String,
        setup: rt.Array(rt.Unknown),
        items_pack_hash: rt.String
      });
    
  
      try {
        const _data = data_runtype.check(data);
  
        this.name = _data.name;
        this.setup = _data.setup;
        this.items_pack_hash = _data.items_pack_hash;
        this.inArenaPool = true;
  
        pool.push(this);
        
        resolve();

        this.tickMatchMaking();

      } catch (error) {
        reject({ error: true, message: error.message });
      }

      console.log('Pool:', pool.map(c => c.name).join(' '));
    });

    procket.on('arena_pool_quit', (resolve, reject) => {

      if (!this.inArenaPool) {
        this.inArenaPool = false;
        reject({ error: true, message: `Not in arena pool` });
        return;
      }
      if (this.battle) {
        reject({ error: true, message: `In battle` });
        return;
      }
      if (this.inMatchingPhase) {
        reject({ error: true, message: `In matching phase` });
        return;
      }

      this.arenaPoolQuit() ? (
        resolve()
      ) : (
        reject({ error: true, code: 500, message: '' })
      );

      console.log('Pool:', pool.map(c => c.name).join(' '));
    });

    procket.on('battle_action', async (resolve, reject, data) => {

      if (this.inArenaPool) {
        return reject({ message: `In arena pool` });
      }
      if (!this.battle || !this.opponent) {
        this.battle = null;
        this.opponent = null;
        return reject({ message: `Not in battle` });
      }
      if (this.inMatchingPhase) {
        return reject({ message: `In matching phase` });
      }
      if (this.procket.socket.id !== this.battle.players[this.battle.turnOwnerIndex].id) {
        return reject({ message: `Not your turn` });
      }

      const data_runtype = rt.Record({
        action: rt.Union(
          rt.Literal('cooldown'),
          rt.Literal('drone_toggle'),
          rt.Literal('charge'),
          rt.Literal('teleport'),
          rt.Literal('hook'),
          rt.Literal('fire'),
          rt.Literal('stomp'),
          rt.Literal('walk')
        ),
        args: rt.Record({
          double: rt.Boolean.Or(rt.Undefined),
          position: rt.Number.Or(rt.Undefined),
          itemIndex: rt.Number.Or(rt.Undefined)
        })
      });

      try {
        const _data = data_runtype.check(data);

        BattleM.resolveAction(this.battle, _data.action, _data.args);

        const { battle } = this;
        const turnOwnerID = this.battle.players[this.battle.turnOwnerIndex].id;

        // @ts-ignore
        delete battle.players[0].battle;
        // @ts-ignore
        delete battle.players[1].battle;
        const safeBattleData = JSON.parse(JSON.stringify(battle));
        battle.players[0].battle = battle;
        battle.players[1].battle = battle;

        Promise.all([
          this.emit('battle_update', { battle: safeBattleData, turnOwnerID }),
          this.opponent.emit('battle_update', { battle: safeBattleData, turnOwnerID })
        ]).then(() => resolve());

        if (battle.over) {
          this.finishBattle(false);
        }

      } catch (error) {
        reject({ error: true, message: error.message });
        throw error;
      }

    });

    procket.on('battle_quit', (resolve, _reject) => {

      // Lets never prevent people from quitting, right?
      resolve();

      this.finishBattle(true);

    });

    procket.socket.on('disconnect', () => {
      this.arenaPoolQuit();
      if (this.battle) {
        this.finishBattle(true);
      }
    });
  }

  emit (event: string, data?: any) {
    return this.procket.emit(event, data);
  }

  arenaPoolQuit (): boolean {
    if (pool.includes(this)) {
      pool.splice(pool.indexOf(this), 1);
      this.inArenaPool = false;
      return true;
    }
    return false;
  }

  tickMatchMaking () {
    for (const conn of pool) {
      if (conn !== this && !conn.inMatchingPhase) {
        if (conn.items_pack_hash === this.items_pack_hash) {

          this.inMatchingPhase = true;
          conn.inMatchingPhase = true;

          this.arena_pool_validate_opponent(conn)
            .then(() => {
              this.startBattle(conn);
            })
            .catch(error => {
              console.log('Match failed', [this.name, conn.name]);
              console.log(error);
            })
            .finally(() => {
              this.inMatchingPhase = false;
              conn.inMatchingPhase = false;
            });
        }
      }
    }
  }

  startBattle (conn: Connection) {

    this.arenaPoolQuit();
    conn.arenaPoolQuit();

    const battle = new Battle(this, conn);
    const turnOwnerID = battle.players[battle.turnOwnerIndex].id;

    this.battle = battle;
    conn.battle = battle;
    this.opponent = conn;
    conn.opponent = this;

    // @ts-ignore
    delete battle.players[0].battle;
    // @ts-ignore
    delete battle.players[1].battle;
    const safeBattleData = JSON.parse(JSON.stringify(battle));
    battle.players[0].battle = battle;
    battle.players[1].battle = battle;

    const promise = Promise.all([
      this.procket.emit('battle_start', { battle: safeBattleData, turnOwnerID }),
      conn.procket.emit('battle_start', { battle: safeBattleData, turnOwnerID })
    ]);

    promise.then(console.log).catch(console.error);
  }

  finishBattle (quit: boolean) {

    if (this.opponent) {

      if (quit) {
        this.opponent.emit('battle_opponent_quit')
          .catch(console.error);
      }

      this.opponent.name = '';
      this.opponent.setup = [];
      this.opponent.items_pack_hash = '';
      this.opponent.opponent = null;
      this.opponent.battle = null;
    }

    this.name = '';
    this.setup = [];
    this.items_pack_hash = '';
    this.opponent = null;
    this.battle = null;
  }


  // Events to emit

  arena_pool_validate_opponent (conn: Connection) {
    return Promise.all([
      this.emit('arena_pool_validate_opponent', { setup: conn.setup }),
      conn.emit('arena_pool_validate_opponent', { setup: this.setup })
    ]);
  }

}
