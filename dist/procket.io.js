"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Procket {
    constructor(socket) {
        this._listeners = {};
        this.socket = socket;
        socket.on('$event', (packet, callback) => {
            console.log('Getting', packet);
            let fulfilled = false;
            const _callback = (data, failed) => {
                if (fulfilled) {
                    throw new Error(`Already fulfilled`);
                }
                fulfilled = true;
                callback(data, failed);
            };
            if (this._listeners.hasOwnProperty(packet.event)) {
                const listener = this._listeners[packet.event];
                listener((data) => _callback(data, false), (data) => _callback(data, true), packet.data);
            }
            else {
                _callback({ message: `No such socket listener '${packet.event}'` }, true);
            }
        });
    }
    on(event, listener) {
        if (this._listeners.hasOwnProperty(event)) {
            throw new Error(`Already listening to event '${event}'`);
        }
        this._listeners[event] = listener;
    }
    off(event) {
        if (!this._listeners.hasOwnProperty(event)) {
            throw new Error(`Not listening to event '${event}'`);
        }
        delete this._listeners[event];
    }
    emit(event, data = null) {
        console.log('Sending', { event, data });
        return new Promise((resolve, reject) => {
            const packet = { event, data };
            this.socket.emit('$event', packet, (response, failed) => {
                if (failed) {
                    reject(response);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
}
exports.default = Procket;
//# sourceMappingURL=procket.io.js.map