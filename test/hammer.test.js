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

  // Now test that when mole hides (not hit), Pin receives a point
  // get previous p2 score (from latest scoreUpdate if present)
  let lastScoreUpdate = ws2._sent.map(s => JSON.parse(s)).reverse().find(m => m.type === 'scoreUpdate');
  const prevP2 = lastScoreUpdate ? lastScoreUpdate.player2Score : 0;

  // Simulate a mole popup and hide without being hit
  gameRoomService.handleMolePop(ws2, 5);
  gameRoomService.handleMoleHide(ws2, 5, false);

  // Expect a scoreUpdate increasing player2 score by 1
  const newScoreUpdate = ws2._sent.map(s => JSON.parse(s)).reverse().find(m => m.type === 'scoreUpdate');
  assert.strictEqual(newScoreUpdate.player2Score, prevP2 + 1, 'player2 should gain a point when mole hides unhit');

  console.log('mole hide scoring test passed');

  // --- NEW: powerup pickup/use flow (P2) ---
  // Force spawn a thermometer at hole 3
  const ok = gameRoomService.debugSetPowerup(roomId, 'thermometer', 3);
  assert(ok, 'debugSetPowerup should succeed');

  // Both clients should have received a powerupSpawn
  const spawnP2 = ws2._sent.map(s => JSON.parse(s)).reverse().find(m => m.type === 'powerupSpawn');
  assert(spawnP2, 'player2 should receive powerupSpawn');
  assert.strictEqual(spawnP2.holeIndex, 3, 'powerup should be at hole 3');

  // Simulate P2 popping at hole 3 and requesting pickup (client would send this)
  gameRoomService.handleMolePop(ws2, 3);
  gameRoomService.handlePowerupPickup(ws2, 2, 3);

  // Both players should receive a powerupPickup notification
  const pickupMsg = ws1._sent.map(s => JSON.parse(s)).reverse().find(m => m.type === 'powerupPickup');
  assert(pickupMsg, 'powerupPickup should be broadcast');

  // Server should auto-use P2's powerup -> expect powerupUse broadcast without calling handlePowerupUse manually
  const useMsg = ws1._sent.map(s => JSON.parse(s)).reverse().find(m => m.type === 'powerupUse');
  assert(useMsg, 'powerupUse should be broadcast automatically for P2');

  // And room state should reflect thermometer active / pin blocked (effect applied)
  const room = gameRoomService.debugGetRoom(roomId);
  assert(room.thermometerActive === true || room.pinBlocked === true, 'thermometer effect should be active after auto-use');

  console.log('powerup flow test passed');
})();