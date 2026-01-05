import assert from 'assert';
import { createUserService } from '../src/server/services/userService.js';
import { createGameRoomService } from '../src/server/services/gameRoomService.js';

(async function run() {
  const userService = createUserService();
  const gameRoomService = createGameRoomService(userService);

  // Crear dos usuarios
  const u1 = userService.createUser({ email: 'p1@example.com', name: 'Player1' });
  const u2 = userService.createUser({ email: 'p2@example.com', name: 'Player2' });

  // Crear websockets falsos (solo con send y roomId)
  function makeFakeWs(user) {
    return {
      send: (msg) => { /* no-op */ },
      player: user
    };
  }

  const ws1 = makeFakeWs(u1);
  const ws2 = makeFakeWs(u2);

  // Crear sala
  const roomId = gameRoomService.createRoom(ws1, ws2);

  // Simular dos goles para player1 para forzar gameOver
  // Use 'right' so player1 scores. Wait 1100ms between goals to allow relaunch.
  gameRoomService.handleGoal(ws2, 'right'); // player1 scores
  await new Promise(r => setTimeout(r, 1100));
  gameRoomService.handleGoal(ws2, 'right'); // player1 scores again -> should trigger gameOver

  // Give small delay to allow persistence to complete
  await new Promise(r => setTimeout(r, 50));

  const entries = userService.getLeaderboardEntries();

  // Buscar entradas de player1 and player2
  const p1Entries = entries.filter(e => e.name === 'Player1');
  const p2Entries = entries.filter(e => e.name === 'Player2');

  console.log('Entries after simulated game:', entries);

  assert(p1Entries.length >= 1, 'Player1 should have an entry');
  assert(p1Entries[0].score === 2, 'Player1 score should be 2');

  assert(p2Entries.length >= 1, 'Player2 should have an entry');
  assert(p2Entries[0].score === 0, 'Player2 score should be 0');

  console.log('gameRoom integration test passed');
})();