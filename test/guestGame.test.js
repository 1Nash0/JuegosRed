import assert from 'assert';
import { createUserService } from '../src/server/services/userService.js';
import { createGameRoomService } from '../src/server/services/gameRoomService.js';

(async function run() {
  const userService = createUserService();
  const gameRoomService = createGameRoomService(userService);

  // Create fake ws with no player info
  const ws1 = { send: (_m) => {}, /* no player */ };
  const ws2 = { send: (_m) => {}, /* no player */ };

  const _roomId = gameRoomService.createRoom(ws1, ws2);

  // Simulate two goals for player1
  gameRoomService.handleGoal(ws2, 'right');
  await new Promise(r => setTimeout(r, 1100));
  gameRoomService.handleGoal(ws2, 'right');
  await new Promise(r => setTimeout(r, 50));

  const entries = userService.getLeaderboardEntries();
  console.log('Guest entries:', entries);

  assert(entries.length >= 2, 'Should have at least two score entries (for both players)');
  console.log('guestGame test passed');
})();