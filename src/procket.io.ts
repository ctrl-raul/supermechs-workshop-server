import socketio from 'socket.io';


type AnyDataFunction = (data?: any) => any;
type SocketCallbackFunction = (response: any, failed: boolean) => any;

type SocketListener = (
  resolve: AnyDataFunction,
  reject: AnyDataFunction,
  data: any
) => any;

interface SocketPacket {
  event: string;
  data: any;
}


class Procket
{
  socket;

  _listeners = {} as {
    [event: string]: SocketListener;
  };

  constructor (socket: socketio.Socket) {

    this.socket = socket;

    socket.on('$event', (packet: SocketPacket, callback: SocketCallbackFunction) => {

      console.log('Getting', packet);

      let fulfilled = false;

      const _callback: SocketCallbackFunction = (data, failed) => {
        if (fulfilled) {
          throw new Error(`Already fulfilled`);
        }
        fulfilled = true;
        callback(data, failed);
      };

      if (this._listeners.hasOwnProperty(packet.event)) {

        const listener = this._listeners[packet.event];
        listener(
          (data: any) => _callback(data, false),
          (data: any) => _callback(data, true),
          packet.data
        );

      } else {
        _callback({ message: `No such socket listener '${packet.event}'` }, true);
      }
    });
  }

  on (event: string, listener: SocketListener) {
    if (this._listeners.hasOwnProperty(event)) {
      throw new Error(`Already listening to event '${event}'`);
    }
    this._listeners[event] = listener;
  }

  off (event: string) {
    if (!this._listeners.hasOwnProperty(event)) {
      throw new Error(`Not listening to event '${event}'`);
    }
    delete this._listeners[event];
  }

  emit (event: string, data: any = null) {
    console.log('Sending', { event, data });
    return new Promise((resolve, reject) => {
      const packet = { event, data };
      this.socket.emit('$event', packet, (response: AnyDataFunction, failed: boolean) => {
        if (failed) {
          reject(response);
        } else {
          resolve(response);
        }
      });
    });
  }
}


export default Procket;