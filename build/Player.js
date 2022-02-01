"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Player {
    constructor(psocket) {
        this.name = 'NO_NAME';
        this.setup = [];
        this.setupHash = '';
        this.itemsPackKey = '';
        this.doNotMatch = [];
        this.opponentValidationPromise = null;
        this.battleData = null;
        this.psocket = psocket;
        this.id = psocket.socket.id;
    }
    getFullName() {
        return this.psocket.socket.id + '(' + this.name + ')';
    }
    emit(event, data, responseTimeout) {
        return this.psocket.emit(event, data, responseTimeout);
    }
}
exports.default = Player;
