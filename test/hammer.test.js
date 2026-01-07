import assert from 'assert';
import { createGameRoomService } from '../src/server/services/gameRoomService.js';

(async function run() {
  const gameRoomService = createGameRoomService();

  function makeFakeWs() {
    const sent = [];
    const ws = {
      send: (msg) => sent.push(msg),
      readyState: 1
    };
    ws._sent = sent;
    return ws;
  }

  const ws1 = makeFakeWs(); // player1 (Pom)
  const ws2 = makeFakeWs(); // player2 (Pin)

  const roomId = gameRoomService.createRoom(ws1, ws2);
  assert(roomId, 'room should be created');

  // Simulate player2 popped the mole at hole 2 so the hammer can hit it
  gameRoomService.handleMolePop(ws2, 2);

  // Player1 attempts to hit hole 2
  gameRoomService.handleHammerHit(ws1, 2, 10, 20);

  // Both players should receive a hammerResult message with updated scores (server-authoritative)
  const p1msgs = ws1._sent.map(s => JSON.parse(s));
  const p2msgs = ws2._sent.map(s => JSON.parse(s));

  const hres1 = p1msgs.reverse().find(m => m.type === 'hammerResult');
  const hres2 = p2msgs.reverse().find(m => m.type === 'hammerResult');

  assert(hres1, 'player1 should get hammerResult');
  assert(hres2, 'player2 should get hammerResult');

  assert.strictEqual(hres1.hit, true, 'hammerResult should be a hit');
  assert.strictEqual(hres1.player1Score, 1, 'player1 score should be 1 after hit');
  assert.strictEqual(hres1.player2Score, 0, 'player2 score should be 0 after hit');

  // If player2 later sends a moleMiss within 400ms it should be ignored (debounce)
  gameRoomService.handleMoleMiss(ws2);
  // verify scores haven't changed
  const lastP1 = JSON.parse(ws1._sent[ws1._sent.length - 1]);
  assert.strictEqual(lastP1.player1Score, 1, 'player1 score should remain 1 after ignored moleMiss');

  // Now test a miss (player1 hits empty hole -> player2 should gain point)
  // Ensure mole is not active at some other hole
  gameRoomService.handleHammerHit(ws1, 4, 10, 20); // hit hole 4 while mole inactive
  const lastMsg = JSON.parse(ws1._sent[ws1._sent.length - 1]);
  assert.strictEqual(lastMsg.type, 'hammerResult', 'hammerResult should be sent even on miss');
  assert.strictEqual(lastMsg.hit, false, 'hammerResult should indicate miss');
  assert.strictEqual(lastMsg.player2Score, 1, 'player2 should receive a point on miss');

  console.log('hammer flow test passed');
})();