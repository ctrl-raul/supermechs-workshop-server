"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pool = {};
const LOGS = true;
function join(player) {
    pool[player.id] = player;
    log(player.getFullName(), 'joined');
}
function quit(player) {
    if (player.id in pool) {
        delete pool[player.id];
    }
    log(player.getFullName(), 'quit');
}
function log(...args) {
    if (LOGS) {
        console.log(`[MatchMaker] ${args.map(String).join(' ')}`);
    }
}
const MatchMakerAttachable = {
    join,
    quit,
};
exports.default = MatchMakerAttachable;
