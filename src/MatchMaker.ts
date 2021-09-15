import Player from "./Player";



// Data

const pool: Record<string, Player> = {};
const LOGS = true;



// Functions

function join (player: Player): void {
	pool[player.id] = player;
	log(player.getFullName(), 'joined');
}


function quit (player: Player): void {
	if (player.id in pool) {
		delete pool[player.id];
	}
	log(player.getFullName(), 'quit');
}


function log (...args: any[]): void {
	if (LOGS) {
		console.log(`[MatchMaker] ${args.map(String).join(' ')}`);
	}
}



// Exports

const MatchMakerAttachable = {
	join,
	quit,
};

export default MatchMakerAttachable;
