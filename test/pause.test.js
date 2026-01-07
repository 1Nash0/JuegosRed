import assert from 'assert';
import { createGameRoomService } from '../src/server/services/gameRoomService.js';

(function run() {
  const gameRoomService = createGameRoomService();

  function makeFakeWs() {
    const sent = [];
    const ws = { send: (msg) => sent.push(msg), readyState: 1 };
    ws._sent = sent;
    return ws;
  }

  const ws1 = makeFakeWs();
  const ws2 = makeFakeWs();

  const roomId = gameRoomService.createRoom(ws1, ws2);
  assert(roomId, 'room created');

  // Pause from player1 should be forwarded to player2
  gameRoomService.handlePause(ws1);
  const msg = JSON.parse(ws2._sent.find(s => s));
  assert.strictEqual(msg.type, 'pause', 'pause message should be forwarded');

  // Resume from player1 should be forwarded to player2
  gameRoomService.handleResume(ws1);
  const msg2 = JSON.parse(ws2._sent.reverse().find(s => s));
  assert.strictEqual(msg2.type, 'resume', 'resume message should be forwarded');

  console.log('pause/resume forward test passed');
})();