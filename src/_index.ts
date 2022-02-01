import socketio from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';
import env from './utils/env';
import sha256 from 'simple-js-sha2-256';
import Player from './Player';
import BattleUtils from './battle/BattleUtils';
import Battle from './battle/Battle';
import BattleManager from './battle/BattleManager';
import PromiseSocket from './promise-socket.io';


dotenv.config();



// Socket configuration

const PORT = Number(env('PORT', '5001'));
const server = http.createServer();
const io = new socketio.Server(server, {
  cors: {
    origin: env('DEV', '0') === '1' ? 'http://localhost:5000' : 'https://workshop-unlimited.vercel.app/',
    methods: ["GET", "POST"],
  }
});



// Data

const matchMakerPool: Player[] = [];



// Socket listeners

io.on('connection', _socket => {

  console.log(_socket.id, 'has connected');

  const psocket = new PromiseSocket(_socket);
  const player = new Player(psocket);


  _socket.on('disconnect', () => {
    leaveBattle(player);
    removeFromMatchMaker(player);
  });



  psocket.on('match_maker.join', (resolve, _reject, data) => {

    console.log(player.id, '-> match_maker.join');

    if (!isInMatchMaker(player)) {

      // For now we're assuming the client won't send invalid data
      player.name = data.name;
      player.setup = data.setup;
      player.setupHash = sha256(JSON.stringify(data.setup));

      addToMatchMaker(player);
      updateMatchMaker();

    }

    resolve();

  });

  psocket.on('match_maker.quit', async (resolve, reject) => {

    console.log(player.id, '-> match_maker.quit');

    // This handles the case of the player leaving while matchmaking
    if (player.opponentValidationPromise) {
      try {
        await player.opponentValidationPromise;
        reject({ message: 'Battle started' });
        return;
      } catch (err) {}
    }

    resolve();
    removeFromMatchMaker(player);

  });


  psocket.on('battle.quit', resolve => {
    resolve();
    leaveBattle(player);
  });

  psocket.on('battle.event', (resolve, reject, data) => {

    if (player.battleData) {
      player.emit('battle.event', data).catch();
      player.battleData.opponent.emit('battle.event', data).catch();
      resolve();
    } else {
      reject({ message: 'Not in battle' });
    }

  });

});



// Serve

server.listen(PORT, () => {
  console.log('Listening on port', PORT);
});



// Functions

function updateMatchMaker (): void {

  console.log('matchMakerCount:', matchMakerPool.length);
  console.time('updateMatchMaker');

  for (const [p1, p2] of pairs(matchMakerPool)) {
    
    if (p1.opponentValidationPromise) continue;
    if (p2.opponentValidationPromise) continue;
    if (p1.doNotMatch.includes(p2)) continue;

    p1.opponentValidationPromise = validateOpponent(p1, p2);
    p2.opponentValidationPromise = validateOpponent(p2, p1);

    const promise = Promise.all([
      p1.opponentValidationPromise,
      p2.opponentValidationPromise,
    ]);

    promise.then(() => {
      removeFromMatchMaker(p1);
      removeFromMatchMaker(p2);
      startBattle(p1, p2);
    }).catch(err => {
      console.log('Could not match:', err.message);
    }).finally(() => {
      p1.opponentValidationPromise = null;
      p2.opponentValidationPromise = null;
    });

  }

  console.timeEnd('updateMatchMaker');

}


function startBattle (p1: Player, p2: Player): void {

  const [pos1, pos2] = BattleUtils.getRandomStartPositions();
  const starterID = Math.random() > 0.5 ? p1.id : p2.id;

  const p1Data = {
    id: p1.id,
    name: p1.name,
    setup: p1.setup,
    position: pos1,
  };

  const p2Data = {
    id: p2.id,
    name: p2.name,
    setup: p2.setup,
    position: pos2,
  };



  const battle = new Battle({
    online: true,
    playerID: p1.id, // Just for the sake, but server is impartial on who's the player 1
    starterID,
    p1: p1Data,
    p2: p2Data,
  });


  p1.battleData = {
    opponent: p2,
    battle,
  };

  p2.battleData = {
    opponent: p1,
    battle,
  };


  p1.emit('battle.start', {
    online: true,
    playerID: p1.id,
    starterID,
    p1: p1Data,
    p2: p2Data,
  }).catch(err => {
    console.log('p1 can\'t battle:', err.message);
    leaveBattle(p1);
  });

  p2.emit('battle.start', {
    online: true,
    playerID: p2.id,
    starterID,
    p1: p1Data,
    p2: p2Data,
  }).catch(err => {
    console.log('p2 can\'t battle:', err.message);
    leaveBattle(p2);
  });
  
};


function leaveBattle (player: Player): void {
  
  if (!player.battleData) {
    return;
  }

  if (!player.battleData.battle.complete) {

    BattleManager.setBattleComplete(
      player.battleData.battle,
      player.battleData.opponent.id,
      true,
    );

    leaveBattle(player.battleData.opponent);

    player.battleData.opponent.emit('battle.opponent_quit').catch();

  }

  player.battleData = null;

}


function addToMatchMaker (player: Player): void {
  if (!matchMakerPool.includes(player)) {
    matchMakerPool.push(player);
  }
}


function isInMatchMaker (player: Player): boolean {
  return matchMakerPool.includes(player);
}


function removeFromMatchMaker (player: Player): void {

  const index = matchMakerPool.indexOf(player);

  if (index >= 0) {
    matchMakerPool.splice(index, 1);
  }

}


function validateOpponent (player: Player, opponent: Player): Promise<void> {
  return player.psocket.emit('match_maker.is_valid_setup', {
    setup: opponent.setup,
    setupHash: opponent.setupHash,
  }, 5000);
}


function* pairs <T> (array: T[]) {
  for (let i = 0; i < array.length; ++i) {
    for(var j = i + 1; j < array.length; ++j) {
     yield [array[i], array[j]];
    }
  }
}
