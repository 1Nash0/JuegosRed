import assert from 'assert';
import { createUserService } from '../src/server/services/userService.js';
import { createGameRoomService } from '../src/server/services/gameRoomService.js';

(async function run() {
  const userService = createUserService();
  const gameRoomService = createGameRoomService(userService);

  const u1 = userService.createUser({ email: 'd1@example.com', name: 'D1' });
  const u2 = userService.createUser({ email: 'd2@example.com', name: 'D2' });

  const ws1 = { send: (m) => {}, player: u1 };
  const ws2 = { send: (m) => {}, player: u2 };

  const roomId = gameRoomService.createRoom(ws1, ws2);

  // Simulate some points
  gameRoomService.handleGoal(ws2, 'right'); // player1 scores

  // Now simulate disconnect of player2
  gameRoomService.handleDisconnect(ws2);

  // Small delay
  await new Promise(r => setTimeout(r, 50));

  const entries = userService.getLeaderboardEntries();
  console.log('Entries after disconnect:', entries);

  const d1 = entries.find(e => e.name === 'D1');
  const d2 = entries.find(e => e.name === 'D2');

  assert(d1, 'D1 should have an entry recorded');
  assert(d2, 'D2 should have an entry recorded');

  console.log('disconnect test passed');
})();