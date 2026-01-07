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
      moleWasHit: false, // <- nuevo: track si el mole fue golpeado durante esta aparición
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

    // Update mole position (note: not the same as pop)
    room.moleHoleIndex = holeIndex;

    // Broadcast mole move to both players so both views stay in sync
    const msg = JSON.stringify({ type: 'moleMove', holeIndex });
    if (room.player1 && room.player1.ws && room.player1.ws.readyState === 1) {
      try { room.player1.ws.send(msg); } catch (e) { /* ignore send errors */ }
    }
    if (room.player2 && room.player2.ws && room.player2.ws.readyState === 1) {
      try { room.player2.ws.send(msg); } catch (e) { /* ignore send errors */ }
    }
  }

  /**
   * Handle mole popup (player2 informs the server that the mole popped at holeIndex)
   * This allows the server to be authoritative about whether a hammer hit should count as a hit.
   */
  function handleMolePop(ws, holeIndex) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.active) return;

    if (room.player2.ws !== ws) return;

    room.moleHoleIndex = holeIndex;
    room.moleActive = true;

    console.log(`[GameRoomService] molePop room=${roomId} holeIndex=${holeIndex}`);

    // Clear previous timer if any
    if (room._moleActiveTimer) {
      clearTimeout(room._moleActiveTimer);
      room._moleActiveTimer = null;
    }

    // Ensure we clear moleActive after the expected popup duration (+ margin)
    room._moleActiveTimer = setTimeout(() => {
      room.moleActive = false;
      room._moleActiveTimer = null;
      console.log(`[GameRoomService] moleActive timeout cleared for room=${roomId}`);
    }, 1200);
  }

  function handleMoleHide(ws, holeIndex, wasHit) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.active) return;
    if (room.player2.ws !== ws) return;

    // Evitar doble conteo si hubo un golpe (autoritativo) muy recientemente
    const now = Date.now();
    if (room.lastHitAt && (now - room.lastHitAt) < 500) {
      console.log(`[GameRoomService] moleHide ignored due recent hammer for room=${roomId}`);
      // limpiar estado y timers
      room.moleActive = false;
      room.moleWasHit = false;
      if (room._moleActiveTimer) {
        clearTimeout(room._moleActiveTimer);
        room._moleActiveTimer = null;
      }
      return;
    }

    const wasHitFlag = !!wasHit;
    console.log(`[GameRoomService] moleHide room=${roomId} holeIndex=${holeIndex} wasHit=${wasHitFlag} pinBlocked=${room.pinBlocked}`);

    // Siempre sumar 1 punto a Pin cuando el topo se esconde (salvo el caso de debounce anterior)
    room.player2.score += 1;
    // registrar tiempo de resolución para evitar dobles conteos posteriores
    room.lastHitAt = Date.now();

    // Broadcast score update
    const scoreUpdate = {
      type: 'scoreUpdate',
      player1Score: room.player1.score,
      player2Score: room.player2.score
    };

    try { room.player1.ws.send(JSON.stringify(scoreUpdate)); } catch (e) { /* ignore */ }
    try { room.player2.ws.send(JSON.stringify(scoreUpdate)); } catch (e) { /* ignore */ }

    // Reset estado del topo
    room.moleActive = false;
    room.moleWasHit = false;
    if (room._moleActiveTimer) {
      clearTimeout(room._moleActiveTimer);
      room._moleActiveTimer = null;
    }
  }

  /**
   * Relay hammer position from player1 to player2
   * @param {WebSocket} ws
   * @param {number} x
   * @param {number} y
   * @param {number} angle
   */
  function handleHammerMove(ws, x, y, angle) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.active) return;

    // Only player1 (Pom) sends hammer moves
    if (room.player1.ws !== ws) return;

    // Forward to player2 so they can animate the hammer
    if (room.player2 && room.player2.ws && room.player2.ws.readyState === 1) {
      room.player2.ws.send(JSON.stringify({
        type: 'hammerMove',
        x,
        y,
        angle
      }));
    }
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

    // Avoid double-counting if a recent hammer action already resolved this pop
    const now = Date.now();
    if (room.lastHitAt && (now - room.lastHitAt) < 500) {
      // ignore as it was already processed by a recent hammerHit
      console.log(`[GameRoomService] moleMiss ignored due recent hammer for room=${roomId}`);
      return;
    }

    console.log(`[GameRoomService] moleMiss room=${roomId} pinBlocked=${room.pinBlocked}`);

    if (!room.pinBlocked) {
      room.player2.score += 1;

      // Broadcast score update
      const scoreUpdate = {
        type: 'scoreUpdate',
        player1Score: room.player1.score,
        player2Score: room.player2.score
      };

      console.log(`[GameRoomService] broadcast scoreUpdate room=${roomId} p1=${room.player1.score} p2=${room.player2.score}`);
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
  function handlePowerupPickup(ws, playerId, holeIndex = undefined) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.active || !room.powerup) return;

    // Validate player
    const player = playerId === 1 ? room.player1 : room.player2;
    if (player.ws !== ws) return;

    // If holeIndex provided, ensure it matches current powerup
    if (typeof holeIndex === 'number' && holeIndex !== room.powerupHoleIndex) return;

    // Termómetro solo puede ser recogido por P2
    if (room.powerup === POWERUP_THERMOMETER && playerId !== 2) return;

    // Check limits
    if (player.powerupsUsed >= 3) return;
    if (player.powerupsStored.length >= 3) return;

    // Add powerup
    player.powerupsStored.push(room.powerup);

    // Clear powerup on the room
    room.powerup = null;
    room.powerupHoleIndex = -1;

    // Send to both players
    const pickupMsg = {
      type: 'powerupPickup',
      playerId
    };

    try { room.player1.ws.send(JSON.stringify(pickupMsg)); } catch (e) { /* ignore */ }
    try { room.player2.ws.send(JSON.stringify(pickupMsg)); } catch (e) { /* ignore */ }

    // Si lo recoge P2, usarlo inmediatamente (topo usa al instante)
    if (playerId === 2) {
      try {
        // use the powerup we just stored (handlePowerupUse will pop it)
        handlePowerupUse(player.ws, 2);
      } catch (err) {
        console.error('[GameRoomService] Error auto-using powerup for P2:', err);
      }
    }
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

    console.log(`[GameRoomService] updateScore room=${room.id} playerId=${playerId} points=${points} p1=${room.player1.score} p2=${room.player2.score}`);

    // Send score update
    const scoreUpdate = {
      type: 'scoreUpdate',
      player1Score: room.player1.score,
      player2Score: room.player2.score
    };

    try { room.player1.ws.send(JSON.stringify(scoreUpdate)); } catch (e) { console.warn('updateScore send to p1 failed', e); }
    try { room.player2.ws.send(JSON.stringify(scoreUpdate)); } catch (e) { console.warn('updateScore send to p2 failed', e); }
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
      const opponent = room.player1.ws === ws ? room.player2 : room.player1;

      // Notify opponent and gracefully end their game
      if (opponent && opponent.ws && opponent.ws.readyState === 1) {
        try {
          opponent.ws.send(JSON.stringify({ type: 'playerDisconnected' }));
          // Also send gameOver so client can show end state if desired
          opponent.ws.send(JSON.stringify({ type: 'gameOver', winner: (room.player1.ws === ws) ? 'player2' : 'player1', player1Score: room.player1.score, player2Score: room.player2.score }));
        } catch (e) {
          // ignore
        }
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

    console.log(`[GameRoomService] handleHammerHitResult room=${roomId} hit=${hit} miss=${miss}`);

    // Ignore if an authoritative hammer event was processed very recently to avoid double-counting
    const now = Date.now();
    if (room.lastHitAt && (now - room.lastHitAt) < 500) {
      console.log(`[GameRoomService] handleHammerHitResult ignored due recent hammer for room=${roomId}`);
      return;
    }

    if (hit) {
      room.player1.score += 1;
      room.moleWasHit = true; // <- marcar que el topo fue golpeado
    } else if (miss) {
      // Only award point to Pin (player2) if not blocked
      if (!room.pinBlocked) {
        room.player2.score += 1;
      } else {
        console.log(`[GameRoomService] miss received but Pin is blocked for room=${roomId} -> no point awarded`);
      }
      room.moleWasHit = false;
    }

    // record time to avoid immediate double-counting with a subsequent moleMiss event
    room.lastHitAt = Date.now();

    // Ensure mole state is cleared (so moleMiss doesn't double-count)
    room.moleActive = false;
    if (room._moleActiveTimer) {
      clearTimeout(room._moleActiveTimer);
      room._moleActiveTimer = null;
    }

    // Broadcast hammer result + updated scores so both clients can show feedback
    const hammerResult = {
      type: 'hammerResult',
      hit: !!hit,
      miss: !!miss,
      holeIndex: room.moleHoleIndex,
      player1Score: room.player1.score,
      player2Score: room.player2.score
    };

    const msg = JSON.stringify(hammerResult);
    if (room.player1 && room.player1.ws && room.player1.ws.readyState === 1) {
      try { room.player1.ws.send(msg); } catch (e) { /* ignore */ }
    }
    if (room.player2 && room.player2.ws && room.player2.ws.readyState === 1) {
      try { room.player2.ws.send(msg); } catch (e) { /* ignore */ }
    }
  }

  /**
   * Relay hammer hit attempt from player1 to player2 so player2 computes hit/miss
   * @param {WebSocket} ws
   * @param {number} x
   * @param {number} y
   */
  function handleHammerHit(ws, holeIndex, x, y) {
    // Defensive checks
    if (!ws || typeof ws !== 'object') return;
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.active) return;

    // Only player1 (Pom) sends hammer hit attempts
    if (room.player1.ws !== ws) return;

    // Normalize params: holeIndex should be an integer 0..5
    let idx = -1;
    if (typeof holeIndex === 'number' && Number.isFinite(holeIndex)) {
      idx = Math.floor(holeIndex);
      if (idx < 0 || idx > 5) idx = -1;
    }

    const px = (typeof x === 'number' && Number.isFinite(x)) ? x : 0;
    const py = (typeof y === 'number' && Number.isFinite(y)) ? y : 0;

    debug(`[GameRoomService] handleHammerHit room=${roomId} idx=${idx} moleIndex=${room.moleHoleIndex} moleActive=${room.moleActive} pinBlocked=${room.pinBlocked}`);
    debug(`[GameRoomService] scores before -> p1=${room.player1.score} p2=${room.player2.score}`);
    console.log(`[GameRoomService] handleHammerHit room=${roomId} idx=${idx} moleIndex=${room.moleHoleIndex} moleActive=${room.moleActive} pinBlocked=${room.pinBlocked}`);
    console.log(`[GameRoomService] scores before -> p1=${room.player1.score} p2=${room.player2.score}`);

    // Server-authoritative hit detection: consider it a hit when holeIndex matches current mole hole and pin not blocked.
    let hit = false;
    let miss = false;
    if (!room.pinBlocked && idx >= 0 && idx === room.moleHoleIndex && room.moleActive) {
      hit = true;
      room.player1.score += 1;
      room.moleWasHit = true; // <- marcar que el topo fue golpeado
      debug('[GameRoomService] hammer detected as HIT');
    } else {
      // a miss by the hammer gives a point to the mole (unless blocked)
      miss = true;
      room.moleWasHit = false;
      if (!room.pinBlocked) {
        room.player2.score += 1;
        debug('[GameRoomService] hammer detected as MISS -> point to Pin');
      } else {
        debug('[GameRoomService] hammer detected as MISS but Pin is blocked (no point awarded)');
      }
    }

    debug(`[GameRoomService] scores after -> p1=${room.player1.score} p2=${room.player2.score}`);

    // record time to avoid immediate double-counting with a subsequent moleMiss event
    room.lastHitAt = Date.now();

    // If hit or miss resolved a visible mole, clear active flag so subsequent moleMiss won't double-count
    room.moleActive = false;
    if (room._moleActiveTimer) {
      clearTimeout(room._moleActiveTimer);
      room._moleActiveTimer = null;
    }

    // Broadcast hammerResult to both players (contains holeIndex for visual placement)
    const hammerResult = {
      type: 'hammerResult',
      hit: !!hit,
      miss: !!miss,
      holeIndex: idx,
      player1Score: room.player1.score,
      player2Score: room.player2.score
    };

    const msg = JSON.stringify(hammerResult);
    if (room.player1 && room.player1.ws && room.player1.ws.readyState === 1) {
      try { room.player1.ws.send(msg); } catch (e) { /* ignore */ }
    }
    if (room.player2 && room.player2.ws && room.player2.ws.readyState === 1) {
      try { room.player2.ws.send(msg); } catch (e) { /* ignore */ }
    }

    // Also forward the raw hammer attempt to player2 for immediate animation of the opponent's hammer (non-authoritative)
    try {
      if (room.player2 && room.player2.ws && room.player2.ws.readyState === 1) {
        room.player2.ws.send(JSON.stringify({ type: 'hammerMove', x: px, y: py, holeIndex: idx }));
      }
    } catch (err) { /* ignore */ }
  }

  /**
   * Relay pause request to opponent
   * @param {WebSocket} ws
   */
  function handlePause(ws) {
    const roomId = ws.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const opponent = room.player1.ws === ws ? room.player2.ws : room.player1.ws;
    if (opponent && opponent.readyState === 1) {
      opponent.send(JSON.stringify({ type: 'pause' }));
    }
  }

  /**
   * Relay resume request to opponent
   * @param {WebSocket} ws
   */
  function handleResume(ws) {
    const roomId = ws.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const opponent = room.player1.ws === ws ? room.player2.ws : room.player1.ws;
    if (opponent && opponent.readyState === 1) {
      opponent.send(JSON.stringify({ type: 'resume' }));
    }
  }

  /**
   * Get number of active rooms
   * @returns {number} Number of active rooms
   */
  function getActiveRoomCount() {
    return Array.from(rooms.values()).filter(room => room.active).length;
  }

  // Debug helpers (exposed for tests)
  function debugSetPowerup(roomId, powerupType, holeIndex) {
    const room = rooms.get(roomId);
    if (!room) return false;
    room.powerup = powerupType;
    room.powerupHoleIndex = holeIndex;
    const spawnMsg = { type: 'powerupSpawn', holeIndex, powerupType };
    try { room.player1.ws.send(JSON.stringify(spawnMsg)); } catch (e) {}
    try { room.player2.ws.send(JSON.stringify(spawnMsg)); } catch (e) {}
    return true;
  }

  function debugGetRoom(roomId) {
    return rooms.get(roomId) || null;
  }

  return {
    createRoom,
    handleMoleMove,
    handleHammerMove,
    handleHammerHit,
    handleHammerHitResult,
    handleMoleMiss,
    handlePowerupSpawnRequest,
    handlePowerupPickup,
    handlePowerupUse,
    handleMolePop,
    handleMoleHide,
    handleDisconnect,
    handlePause,
    handleResume,
    getActiveRoomCount,
    // debug helpers
    debugSetPowerup,
    debugGetRoom
  };
}
