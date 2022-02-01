"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eventName = '$promise';
class PromiseSocket {
    constructor(socket) {
        this.listeners = {};
        this.socket = socket;
        socket.on(eventName, (packet, callback) => {
            let fulfilled = false;
            const callbackProxy = (data, failed) => {
                if (fulfilled) {
                    throw new Error(`Already fulfilled`);
                }
                fulfilled = true;
                callback(data, failed);
            };
            if (this.listeners.hasOwnProperty(packet.event)) {
                const listener = this.listeners[packet.event];
                const resolve = (data) => callbackProxy(data, true);
                const reject = (data) => callbackProxy(data, false);
                listener(resolve, reject, packet.data);
            }
            else {
                callbackProxy({
                    message: `Not listening to '${packet.event}' events`
                }, false);
            }
        });
    }
    on(event, listener) {
        if (this.listeners.hasOwnProperty(event)) {
            throw new Error(`Already listening to '${event}' event`);
        }
        this.listeners[event] = listener;
    }
    off(event) {
        if (!this.listeners.hasOwnProperty(event)) {
            throw new Error(`Not listening to '${event}' event`);
        }
        delete this.listeners[event];
    }
    emit(event, data, responseTimeout = 20000) {
        return new Promise((resolve, reject) => {
            const packet = { event, data };
            const timeout = setTimeout(() => reject({ message: 'Response time exceeded' }), responseTimeout);
            this.socket.emit(eventName, packet, (response, success) => {
                clearTimeout(timeout);
                if (success) {
                    resolve(response);
                }
                else {
                    reject(response);
                }
            });
        });
    }
}
exports.default = PromiseSocket;
