import socketio from 'socket.io';


type ResponseFn = (data?: any) => unknown;

type Callback = (response: any, success: boolean) => unknown;

type Listener = (
  resolve: ResponseFn,
  reject: ResponseFn,
  data: any
) => any;

interface Packet {
  event: string;
  data: any;
}


const eventName = '$promise';


class PromiseSocket {

  public socket: socketio.Socket;
  private listeners: Record<string, Listener> = {};


  constructor (socket: socketio.Socket) {

    this.socket = socket;

    socket.on(eventName, (packet: Packet, callback: Callback) => {

      // console.log(`Data In "${packet.event}" <-`, packet.data);

      let fulfilled = false;

      // We proxyfy the callback just so we can
      // tell if it is already fulfilled, to prevent
      // from resolving and rejecting the same promise
      const callbackProxy: Callback = (data, failed) => {

        if (fulfilled) {
          throw new Error(`Already fulfilled`);
        }

        fulfilled = true;
        callback(data, failed);

      };


      if (this.listeners.hasOwnProperty(packet.event)) {

        const listener = this.listeners[packet.event];
        const resolve = (data: any) => callbackProxy(data, true);
        const reject = (data: any) => callbackProxy(data, false);

        listener(resolve, reject, packet.data);

      } else {

        callbackProxy({
          message: `Not listening to '${packet.event}' events`
        }, false);

      }
    });
  }


  public on (event: string, listener: Listener): void {
    if (this.listeners.hasOwnProperty(event)) {
      // Yeah, with promises it doesn't work that well.
      throw new Error(`Already listening to '${event}' event`);
    }
    this.listeners[event] = listener;
  }


  public off (event: string): void {

    if (!this.listeners.hasOwnProperty(event)) {
      throw new Error(`Not listening to '${event}' event`);
    }

    delete this.listeners[event];

  }


  public emit (event: string, data: any, responseTimeout = 20000): Promise<any> {

    // console.log(`Data Out "${event}" ->`, data);

    return new Promise((resolve, reject) => {

      const packet: Packet = { event, data };

      const timeout = setTimeout(
        () => reject({ message: 'Response time exceeded' }),
        responseTimeout,
      );

      this.socket.emit(eventName, packet, (response: ResponseFn, success: boolean) => {

        clearTimeout(timeout);

        if (success) {
          resolve(response);
        } else {
          reject(response);
        }

      });

    });

  }

}


export default PromiseSocket;
