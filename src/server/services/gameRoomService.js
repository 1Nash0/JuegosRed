/**
 * Game Room service - manages active game rooms and game state
 */
import { debug } from '../utils/logger.js';

/**
 *
 * @param userService
 */
export function createGameRoomService(userService = null) {
  const rooms = new Map(); // roomId -> room data
  let nextRoomId = 1;

  /**
   * Create a new game room with two players
   * @param {WebSocket} player1Ws - Player 1's WebSocket
   * @param {WebSocket} player2Ws - Player 2's WebSocket
   * @returns {string} Room ID
   */
  function createRoom(player1Ws, player2Ws) {
    const roomId = `room_${nextRoomId++}`;

    const room = {
      id: roomId,
      player1: {
        ws: player1Ws,
        score: 0,
        info: player1Ws.player || null
      },
      player2: {
        ws: player2Ws,
        score: 0,
        info: player2Ws.player || null
      },
      active: true,
      ballActive: true // Track if ball is in play (prevents duplicate goals)
    };

    rooms.set(roomId, room);

    // Store room ID on WebSocket for quick lookup
    player1Ws.roomId = roomId;
    player2Ws.roomId = roomId;

    return roomId;
  }

  /**
   * Handle paddle movement from a player
   * @param {WebSocket} ws - Player's WebSocket
   * @param {number} y - Paddle Y position
   */
  function handlePaddleMove(ws, y) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.active) return;

    // Relay to the other player
    const opponent = room.player1.ws === ws ? room.player2.ws : room.player1.ws;

    if (opponent.readyState === 1) { // WebSocket.OPEN
      opponent.send(JSON.stringify({
        type: 'paddleUpdate',
        y
      }));
    }
  }

  /**
   * Handle goal event from a player
   * @param {WebSocket} ws - Player's WebSocket
   * @param {string} side - Which side scored ('left' or 'right')
   */
  function handleGoal(ws, side) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.active) return;

    // Prevent duplicate goal detection (both clients send goal event)
    // Only process goal if ball is active
    if (!room.ballActive) {
      return; // Ball not in play, ignore goal
    }
    room.ballActive = false; // Mark ball as inactive until relaunched

    // Update scores
    // When ball hits LEFT goal (x=0), player2 scores (player1 missed)
    // When ball hits RIGHT goal (x=800), player1 scores (player2 missed)
    if (side === 'left') {
      room.player2.score++;
    } else if (side === 'right') {
      room.player1.score++;
    }

    // Broadcast score update to both players
    const scoreUpdate = {
      type: 'scoreUpdate',
      player1Score: room.player1.score,
      player2Score: room.player2.score
    };

    room.player1.ws.send(JSON.stringify(scoreUpdate));
    room.player2.ws.send(JSON.stringify(scoreUpdate));

    // Check win condition (first to 2)
    if (room.player1.score >= 2 || room.player2.score >= 2) {
      const winner = room.player1.score >= 2 ? 'player1' : 'player2';

      const gameOverMsg = {
        type: 'gameOver',
        winner,
        player1Score: room.player1.score,
        player2Score: room.player2.score
      };

      room.player1.ws.send(JSON.stringify(gameOverMsg));
      room.player2.ws.send(JSON.stringify(gameOverMsg));

      // Persist match results to userService if available
      try {
        const p1 = room.player1;
        const p2 = room.player2;
        const p1Score = p1.score;
        const p2Score = p2.score;

        if (userService) {
          // Save for player 1 (create guest if needed)
          try {
            let p1Identifier = null;
            if (p1.info && (p1.info.id || p1.info.email)) {
              p1Identifier = p1.info.id || p1.info.email;
            } else {
              // Create a guest user so we can persist the score
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
              character: p1.info ? (p1.info.character || p1.info.bestCharacter || null) : null,
              timestamp: new Date().toISOString()
            });
          } catch (err) {
            console.error('[GameRoomService] Error persisting p1 score:', err);
          }

          // Save for player 2 (create guest if needed)
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
              character: p2.info ? (p2.info.character || p2.info.bestCharacter || null) : null,
              timestamp: new Date().toISOString()
            });
          } catch (err) {
            console.error('[GameRoomService] Error persisting p2 score:', err);
          }
        }
      } catch (err) {
        console.error('Error saving match results:', err);
      }

      // Mark room as inactive
      room.active = false;
    } else {
      // Relaunch ball after 1 second delay
      setTimeout(() => {
        if (room.active) {
          // Generate new ball direction
          const angle = (Math.random() * 60 - 30) * (Math.PI / 180); // -30 to 30 degrees
          const speed = 300;
          const ballData = {
            x: 400,
            y: 300,
            vx: speed * Math.cos(angle),
            vy: speed * Math.sin(angle)
          };

          // Send ball relaunch to both players
          const relaunchMsg = {
            type: 'ballRelaunch',
            ball: ballData
          };

          room.player1.ws.send(JSON.stringify(relaunchMsg));
          room.player2.ws.send(JSON.stringify(relaunchMsg));

          // Mark ball as active again
          room.ballActive = true;
        }
      }, 1000);
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

    // Only notify the other player if the game is still active
    // If the game already ended (room.active = false), don't send disconnect message
    if (room.active) {
      const opponent = room.player1.ws === ws ? room.player2.ws : room.player1.ws;

      if (opponent && opponent.readyState === 1) { // WebSocket.OPEN
        opponent.send(JSON.stringify({
          type: 'playerDisconnected'
        }));
      }

      // Persist current scores to userService so partial matches are recorded
      try {
        const p1 = room.player1;
        const p2 = room.player2;
        const p1Score = p1.score;
        const p2Score = p2.score;

        if (userService) {
          // Save for player 1 (create guest if needed)
          try {
            let p1Identifier = null;
            if (p1.info && (p1.info.id || p1.info.email)) {
              p1Identifier = p1.info.id || p1.info.email;
            } else {
              const guestEmail = `guest_${room.id}_p1_${Date.now()}@local`;
              const guestName = p1.info && p1.info.name ? p1.info.name : 'Guest';
              const guest = userService.createUser({ email: guestEmail, name: guestName });
              console.log(`[GameRoomService] Created guest user for p1 (disconnect): ${guest.email} (id ${guest.id})`);
              p1Identifier = guest.id;
            }

            console.log(`[GameRoomService] Persisting score on disconnect for ${p1Identifier}: ${p1Score}`);
            userService.addScore(p1Identifier, {
              score: p1Score,
              opponent: p2.info ? (p2.info.name || p2.info.email) : 'unknown',
              character: p1.info ? (p1.info.character || p1.info.bestCharacter || null) : null,
              timestamp: new Date().toISOString()
            });
          } catch (err) {
            console.error('[GameRoomService] Error persisting p1 score on disconnect:', err);
          }

          // Save for player 2 (create guest if needed)
          try {
            let p2Identifier = null;
            if (p2.info && (p2.info.id || p2.info.email)) {
              p2Identifier = p2.info.id || p2.info.email;
            } else {
              const guestEmail = `guest_${room.id}_p2_${Date.now()}@local`;
              const guestName = p2.info && p2.info.name ? p2.info.name : 'Guest';
              const guest = userService.createUser({ email: guestEmail, name: guestName });
              console.log(`[GameRoomService] Created guest user for p2 (disconnect): ${guest.email} (id ${guest.id})`);
              p2Identifier = guest.id;
            }

            console.log(`[GameRoomService] Persisting score on disconnect for ${p2Identifier}: ${p2Score}`);
            userService.addScore(p2Identifier, {
              score: p2Score,
              opponent: p1.info ? (p1.info.name || p1.info.email) : 'unknown',
              character: p2.info ? (p2.info.character || p2.info.bestCharacter || null) : null,
              timestamp: new Date().toISOString()
            });
          } catch (err) {
            console.error('[GameRoomService] Error persisting p2 score on disconnect:', err);
          }
        }
      } catch (err) {
        console.error('Error saving match results on disconnect:', err);
      }
    }

    // Clean up room
    room.active = false;
    rooms.delete(roomId);
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
    handlePaddleMove,
    handleGoal,
    handleDisconnect,
    getActiveRoomCount
  };
}
