import assert from 'assert';
import { createUserService } from '../src/server/services/userService.js';

(function run() {
  const userService = createUserService();

  const u1 = userService.createUser({ email: 'a@example.com', name: 'Alice' });
  const u2 = userService.createUser({ email: 'b@example.com', name: 'Bob' });

  // Add scores
  userService.addScore(u1.id, { score: 5, opponent: 'Bob', character: 'Pom', timestamp: '2026-01-01T10:00:00.000Z' });
  userService.addScore(u1.id, { score: 8, opponent: 'Bob', character: 'Pom', timestamp: '2026-01-02T11:00:00.000Z' });
  userService.addScore(u2.id, { score: 7, opponent: 'Alice', character: 'Pin', timestamp: '2026-01-02T12:00:00.000Z' });

  const entries = userService.getLeaderboardEntries();

  // Top entry should be Alice 8 with character Pom
  assert.strictEqual(entries[0].name, 'Alice');
  assert.strictEqual(entries[0].score, 8);
  assert.strictEqual(entries[0].character, 'Pom');

  // Second entry should be Bob 7 with character Pin
  assert.strictEqual(entries[1].name, 'Bob');
  assert.strictEqual(entries[1].score, 7);
  assert.strictEqual(entries[1].character, 'Pin');

  // Third entry Alice 5
  assert.strictEqual(entries[2].name, 'Alice');
  assert.strictEqual(entries[2].score, 5);
  assert.strictEqual(entries[2].character, 'Pom');
  console.log('userService tests passed');
})();