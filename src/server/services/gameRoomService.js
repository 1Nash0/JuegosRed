/**
 * Game Room service - manages active game rooms and game state for Whack-a-Mole
 */
import { debug } from '../utils/logger.js';

const POWERUP_CLOCK = 'clock';
const POWERUP_THERMOMETER = 'thermometer';

/**
 *
 * @param userService
 */
export function createGameRoomService(userService = null) {
  const rooms = new Map(); // roomId -> room data
  let nextRoomId = 1;

  /**
   * Create a new game room with two players
   * @param {WebSocket} player1Ws - Player 1's WebSocket (Pom - hammer)
   * @param {WebSocket} player2Ws - Player 2's WebSocket (Pin - mole)
   * @returns {string} Room ID
   */
  function createRoom(player1Ws, player2Ws) {
    const roomId = `room_${nextRoomId++}`;

    const room = {
      id: roomId,
      player1: {
        ws: player1Ws,
        score: 0,
        info: player1Ws.player || null,
        powerupsStored: [],
        powerupsUsed: 0
      },
      player2: {
        ws: player2Ws,
        score: 0,
        info: player2Ws.player || null,
        powerupsStored: [],
        powerupsUsed: 0
      },
      active: true,
      timeLeft: 60,
      moleActive: false,
      moleHoleIndex: 0,
      powerup: null,
      powerupHoleIndex: -1,
      thermometerActive: false,
      pinBlocked: false,
      gameTimer: null
    };

    rooms.set(roomId, room);

    // Store room ID on WebSocket for quick lookup
    player1Ws.roomId = roomId;
    player2Ws.roomId = roomId;

    // Start game timer
    startGameTimer(room);

    return roomId;
  }

  /**
   * Start the game timer for a room
   * @param {Object} room - The game room
   */
  function startGameTimer(room) {
    room.gameTimer = setInterval(() => {
      if (!room.active) return;

      room.timeLeft--;

      // Send time update to both players
      const timeUpdate = {
        type: 'timeUpdate',
        timeLeft: room.timeLeft
      };

      room.player1.ws.send(JSON.stringify(timeUpdate));
      room.player2.ws.send(JSON.stringify(timeUpdate));

      if (room.timeLeft <= 0) {
        endGame(room);
      }
    }, 1000);
  }

  /**
   * Handle mole movement from player 2
   * @param {WebSocket} ws - Player's WebSocket
   * @param {number} holeIndex - Hole index to move to (0-5)
   */
  function handleMoleMove(ws, holeIndex) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.active) return;

    // Only player 2 can move the mole
    if (room.player2.ws !== ws) return;

    // Update mole position
    room.moleHoleIndex = holeIndex;

    // Relay to player 1
    room.player1.ws.send(JSON.stringify({
      type: 'moleMove',
      holeIndex
    }));
  }

  /**
   * Handle mole miss from player 2
   * @param {WebSocket} ws - Player's WebSocket
   */
  function handleMoleMiss(ws) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.active) return;

    // Only player 2 can send mole miss
    if (room.player2.ws !== ws) return;

    if (!room.pinBlocked) {
      room.player2.score += 1;

      // Broadcast score update
      const scoreUpdate = {
        type: 'scoreUpdate',
        player1Score: room.player1.score,
        player2Score: room.player2.score
      };

      room.player1.ws.send(JSON.stringify(scoreUpdate));
      room.player2.ws.send(JSON.stringify(scoreUpdate));
    }
  }

  /**
   * Handle powerup spawn request
   * @param {WebSocket} ws - Player's WebSocket
   */
  function handlePowerupSpawnRequest(ws) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.active) return;

    if (room.powerup) return; // Already have a powerup

    // Choose random hole and type
    const holeIndex = Math.floor(Math.random() * 6);
    const powerupTypes = [POWERUP_CLOCK, POWERUP_THERMOMETER];
    const powerupType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];

    room.powerup = powerupType;
    room.powerupHoleIndex = holeIndex;

    // Send to both players
    const spawnMsg = {
      type: 'powerupSpawn',
      holeIndex,
      powerupType
    };

    room.player1.ws.send(JSON.stringify(spawnMsg));
    room.player2.ws.send(JSON.stringify(spawnMsg));
  }

  /**
   * Handle powerup pickup
   * @param {WebSocket} ws - Player's WebSocket
   * @param {number} playerId - Player ID (1 or 2)
   */
  function handlePowerupPickup(ws, playerId) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.active || !room.powerup) return;

    // Validate player
    const player = playerId === 1 ? room.player1 : room.player2;
    if (player.ws !== ws) return;

    // Termómetro solo puede ser recogido por P2
    if (room.powerup === POWERUP_THERMOMETER && playerId !== 2) return;

    // Check limits
    if (player.powerupsUsed >= 3) return;
    if (player.powerupsStored.length >= 3) return;

    // Add powerup
    player.powerupsStored.push(room.powerup);

    // Clear powerup
    room.powerup = null;
    room.powerupHoleIndex = -1;

    // Send to both players
    const pickupMsg = {
      type: 'powerupPickup',
      playerId
    };

    room.player1.ws.send(JSON.stringify(pickupMsg));
    room.player2.ws.send(JSON.stringify(pickupMsg));
  }

  /**
   * Handle powerup use
   * @param {WebSocket} ws - Player's WebSocket
   * @param {number} playerId - Player ID (1 or 2)
   */
  function handlePowerupUse(ws, playerId) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.active) return;

    // Validate player
    const player = playerId === 1 ? room.player1 : room.player2;
    if (player.ws !== ws) return;

    if (player.powerupsStored.length <= 0) return;

    const powerupType = player.powerupsStored.pop();
    player.powerupsUsed++;

    // Apply effect
    if (powerupType === POWERUP_CLOCK) {
      room.timeLeft += 20;
    } else if (powerupType === POWERUP_THERMOMETER) {
      room.thermometerActive = true;
      room.pinBlocked = true;

      // Timer for thermometer effect
      setTimeout(() => {
        room.thermometerActive = false;
        room.pinBlocked = false;
      }, 4000);
    }

    // Send to both players
    const useMsg = {
      type: 'powerupUse',
      playerId
    };

    room.player1.ws.send(JSON.stringify(useMsg));
    room.player2.ws.send(JSON.stringify(useMsg));
  }

  /**
   * Update score
   * @param {Object} room - The game room
   * @param {number} playerId - Player ID (1 or 2)
   * @param {number} points - Points to add
   */
  function updateScore(room, playerId, points) {
    const player = playerId === 1 ? room.player1 : room.player2;
    player.score += points;

    // Send score update
    const scoreUpdate = {
      type: 'scoreUpdate',
      player1Score: room.player1.score,
      player2Score: room.player2.score
    };

    room.player1.ws.send(JSON.stringify(scoreUpdate));
    room.player2.ws.send(JSON.stringify(scoreUpdate));
  }

  /**
   * End the game
   * @param {Object} room - The game room
   */
  function endGame(room) {
    if (room.gameTimer) {
      clearInterval(room.gameTimer);
      room.gameTimer = null;
    }

    room.active = false;

    const p1Score = room.player1.score;
    const p2Score = room.player2.score;

    let winner;
    if (p1Score > p2Score) {
      winner = 'player1';
    } else if (p2Score > p1Score) {
      winner = 'player2';
    } else {
      winner = 'tie';
    }

    const gameOverMsg = {
      type: 'gameOver',
      winner,
      player1Score: p1Score,
      player2Score: p2Score
    };

    room.player1.ws.send(JSON.stringify(gameOverMsg));
    room.player2.ws.send(JSON.stringify(gameOverMsg));

    // Persist match results
    persistResults(room);
  }

  /**
   * Persist match results to userService
   * @param {Object} room - The game room
   */
  function persistResults(room) {
    const p1 = room.player1;
    const p2 = room.player2;
    const p1Score = p1.score;
    const p2Score = p2.score;

    if (userService) {
      // Save for player 1
      try {
        let p1Identifier = null;
        if (p1.info && (p1.info.id || p1.info.email)) {
          p1Identifier = p1.info.id || p1.info.email;
        } else {
          const guestEmail = `guest_${room.id}_p1_${Date.now()}@local`;
          const guestName = p1.info && p1.info.name ? p1.info.name : 'Guest';
          const guest = userService.createUser({ email: guestEmail, name: guestName });
          debug(`[GameRoomService] Created guest user for p1: ${guest.email} (id ${guest.id})`);
          p1Identifier = guest.id;
        }

        console.log(`[GameRoomService] Persisting score for ${p1.info && p1.info.name ? p1.info.name : p1Identifier}: ${p1Score}`);
        userService.addScore(p1Identifier, {
          score: p1Score,
          opponent: p2.info ? (p2.info.name || p2.info.email) : 'unknown',
          character: 'Pom',
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error('[GameRoomService] Error persisting p1 score:', err);
      }

      // Save for player 2
      try {
        let p2Identifier = null;
        if (p2.info && (p2.info.id || p2.info.email)) {
          p2Identifier = p2.info.id || p2.info.email;
        } else {
          const guestEmail = `guest_${room.id}_p2_${Date.now()}@local`;
          const guestName = p2.info && p2.info.name ? p2.info.name : 'Guest';
          const guest = userService.createUser({ email: guestEmail, name: guestName });
          console.log(`[GameRoomService] Created guest user for p2: ${guest.email} (id ${guest.id})`);
          p2Identifier = guest.id;
        }

        console.log(`[GameRoomService] Persisting score for ${p2.info && p2.info.name ? p2.info.name : p2Identifier}: ${p2Score}`);
        userService.addScore(p2Identifier, {
          score: p2Score,
          opponent: p1.info ? (p1.info.name || p1.info.email) : 'unknown',
          character: 'Pin',
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error('[GameRoomService] Error persisting p2 score:', err);
      }
    }
  }

  /**
   * Handle player disconnection
   * @param {WebSocket} ws - Disconnected player's WebSocket
   */
  function handleDisconnect(ws) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    if (room.active) {
      const opponent = room.player1.ws === ws ? room.player2.ws : room.player1.ws;

      if (opponent && opponent.readyState === 1) {
        opponent.send(JSON.stringify({
          type: 'playerDisconnected'
        }));
      }

      // Persist current scores
      persistResults(room);
    }

    if (room.gameTimer) {
      clearInterval(room.gameTimer);
    }

    room.active = false;
    rooms.delete(roomId);
  }

  /**
   * Handle hammer hit result from player 2
   * @param {WebSocket} ws - Player's WebSocket
   * @param {boolean} hit - Whether it was a hit
   * @param {boolean} miss - Whether it was a miss
   */
  function handleHammerHitResult(ws, hit, miss) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.active) return;

    // Only player 2 can send hit results
    if (room.player2.ws !== ws) return;

    if (hit) {
      room.player1.score += 1;
    } else if (miss) {
      room.player2.score += 1;
    }

    // Broadcast score update
    const scoreUpdate = {
      type: 'scoreUpdate',
      player1Score: room.player1.score,
      player2Score: room.player2.score
    };

    room.player1.ws.send(JSON.stringify(scoreUpdate));
    room.player2.ws.send(JSON.stringify(scoreUpdate));
  }

  /**
   * Get number of active rooms
   * @returns {number} Number of active rooms
   */
  function getActiveRoomCount() {
    return Array.from(rooms.values()).filter(room => room.active).length;
  }

  return {
    createRoom,
    handleMoleMove,
    handleHammerHitResult,
    handleMoleMiss,
    handlePowerupSpawnRequest,
    handlePowerupPickup,
    handlePowerupUse,
    handleDisconnect,
    getActiveRoomCount
  };
}
