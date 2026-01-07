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
  console.log('roomId', roomId);

  const ok = gameRoomService.debugSetPowerup(roomId, 'thermometer', 3);
  console.log('debugSetPowerup ok?', ok);

  console.log('ws1 messages:', ws1._sent.map(s => JSON.parse(s)));
  console.log('ws2 messages:', ws2._sent.map(s => JSON.parse(s)));

  // Simulate P2 popping at hole and picking up
  gameRoomService.handleMolePop(ws2, 3);
  gameRoomService.handlePowerupPickup(ws2, 2, 3);

  console.log('after pickup ws1 messages:', ws1._sent.map(s => JSON.parse(s)));
  console.log('after pickup ws2 messages:', ws2._sent.map(s => JSON.parse(s)));

})();