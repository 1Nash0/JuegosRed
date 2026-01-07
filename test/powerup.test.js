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

  const ws1 = makeFakeWs();
  const ws2 = makeFakeWs();

  const roomId = gameRoomService.createRoom(ws1, ws2);
  assert(roomId, 'room should be created');

  // Force spawn a thermometer at hole 3
  const ok = gameRoomService.debugSetPowerup(roomId, 'thermometer', 3);
  assert.ok(ok, 'debugSetPowerup should succeed');

  // Both clients should have received a powerupSpawn
  const spawn1 = ws1._sent.map(s => JSON.parse(s)).reverse().find(m => m.type === 'powerupSpawn');
  const spawn2 = ws2._sent.map(s => JSON.parse(s)).reverse().find(m => m.type === 'powerupSpawn');
  assert(spawn1 && spawn2, 'both clients should receive powerupSpawn');
  assert.strictEqual(spawn1.powerupType, 'thermometer');
  assert.strictEqual(spawn2.powerupType, 'thermometer');

  // Simulate P2 popping at hole 3 and requesting pickup (client would send this message)
  gameRoomService.handleMolePop(ws2, 3);
  gameRoomService.handlePowerupPickup(ws2, 2, 3);

  // Both players should receive a powerupPickup notification
  const pickupMsg = ws1._sent.map(s => JSON.parse(s)).reverse().find(m => m.type === 'powerupPickup');
  assert(pickupMsg, 'powerupPickup should be broadcast');

  // Server should auto-use P2's powerup -> expect powerupUse broadcast
  const useMsg = ws1._sent.map(s => JSON.parse(s)).reverse().find(m => m.type === 'powerupUse');
  assert(useMsg, 'powerupUse should be broadcast automatically for P2');
  assert.strictEqual(useMsg.powerupType, 'thermometer');

  // And room state should reflect thermometer active / pin blocked (effect applied)
  const room = gameRoomService.debugGetRoom(roomId);
  assert(room.thermometerActive === true || room.pinBlocked === true, 'thermometer effect should be active after auto-use');

  console.log('powerup test passed');
})();