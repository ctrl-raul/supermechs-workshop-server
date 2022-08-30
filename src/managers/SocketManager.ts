import * as http from 'http'
import * as socketio from 'socket.io'
import { UserProfileManager } from './UserProfileManeger'
import { LobbyManager } from './LobbyManager'
import { BattleManager } from './BattleManager'
import { User } from '../User'
import { env } from '../utils/env'



// Config

export class SocketManager {

  // Error codes

  public static ERR_BAD_DATA: string = 'BAD_DATA'
  public static ERR_OUTDATED_CLIENT: string = 'OUTDATED_CLIENT'



  // Config

  public static EXPECTED_CLIENT_VERSION: string = env('EXPECTED_CLIENT_VERSION')
  public static DEVELOPMENT: boolean = env('DEVELOPMENT', '0') === '1'



  // State

  public static io: socketio.Server
  public static users: Record<string, User> = {}



  // Methods

  public static init (server: http.Server): void {

    if (this.io) {
      throw new Error('Already initialized')
    }


    this.io = new socketio.Server(server, {
      cors: {
        origin: '*',
        // origin: [
        //   'http://localhost:5000',
        //   'https://supermechs-workshop.vercel.app/',
        // ],
        // credentials: true,
      }
    })


    this.io.on('connection', socket => {

      const clientVersion = socket.request.headers['x-client-version']

      // Check if client it's up to date
      if (clientVersion !== this.EXPECTED_CLIENT_VERSION) {

        this.disconnect(socket, this.ERR_OUTDATED_CLIENT, '')

      } else {

        const user = new User(socket);
        const emit = socket.emit;
        const on = socket.on;

        this.users[socket.id] = user;

        socket.emit = function (...args) {
          setTimeout(() => {
            SocketManager.logForUser(user, '=>',args[0]);
            emit.apply(socket, args);
          }, 500);
          return true;
        };

        socket.on = function (ev, listener) {
          const proxy = (...listenerArgs: any[]) => {
            SocketManager.logForUser(user, '<=', ev);
            listener(...listenerArgs);
          };
          return on.apply(socket, [ev, proxy]);
        };

        socket.on('disconnecting', () => {
          delete this.users[socket.id];
          this.logForUser(user, ':: Disconnected');
        });

        UserProfileManager.connect(user);
        LobbyManager.connect(user);
        BattleManager.connect(user);

        this.logForUser(user, ':: Connected');

      }

    })

  }



  // Methods

  public static getUsersInRoom (room: string): User[] {

    const socketIDs = this.io.sockets.adapter.rooms.get(room)
    const users: User[] = []

    if (socketIDs) {
      socketIDs.forEach(id => {
        users.push(this.users[id]);
      });
    }

    return users

  }


  public static disconnect (socket: socketio.Socket, code: string, message: string): void {
    socket.emit('server.message', { code, message })
    console.log(`Disconnected '${socket.id}' (${code}) ->`, message)
  }


  public static logForUser(user: User, ...args: any[]): void {
    console.log(`[ ${user.socket.id.slice(0, 4)} "${user.name}" ]`, ...args);
  }

}
