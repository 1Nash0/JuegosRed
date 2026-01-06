import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Servicios (factory functions)
import { createUserService } from './services/userService.js';
import { createMessageService } from './services/messageService.js';
import { createConnectionService } from './services/connectionService.js';
import { createGameRoomService } from './services/gameRoomService.js';
import { createMatchmakingService } from './services/matchmakingService.js';

// Controladores (factory functions)
import { createUserController } from './controllers/userController.js';
import { createMessageController } from './controllers/messageController.js';
import { createConnectionController } from './controllers/connectionController.js';

// Rutas (factory functions)
import { createUserRoutes } from './routes/users.js';
import { createMessageRoutes } from './routes/messages.js';
import { createConnectionRoutes } from './routes/connections.js';

// Para obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== CONFIGURACIÓN DE DEPENDENCIAS ====================
// Aquí se construye toda la cadena de dependencias de la aplicación
// Esto facilita el testing al permitir inyectar mocks en cualquier nivel

// 1. Crear servicios (capa de datos)
const userService = createUserService();
const messageService = createMessageService(userService);  // messageService depende de userService
const connectionService = createConnectionService();
const gameRoomService = createGameRoomService(userService);
const matchmakingService = createMatchmakingService(gameRoomService);

// 2. Crear controladores inyectando servicios (capa de lógica)
const userController = createUserController(userService);
const messageController = createMessageController(messageService);
const connectionController = createConnectionController(connectionService);

// 3. Crear routers inyectando controladores (capa de rutas)
const userRoutes = createUserRoutes(userController);
const messageRoutes = createMessageRoutes(messageController);
const connectionRoutes = createConnectionRoutes(connectionController);

// ==================== SERVIDOR ====================

const app = express();
const PORT = 3000;

// ==================== MIDDLEWARE ====================

// Parse JSON bodies
app.use(express.json());

// Log de peticiones (simple logger)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// CORS simple (permitir todas las peticiones)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Servir archivos estáticos del juego (dist/)
app.use(express.static(path.join(__dirname, '../../dist')));

// ==================== RUTAS ====================

app.use('/api/users', userRoutes);
// Alias para compatibilidad: /api/leaderboards -> /api/users/leaderboards
app.get('/api/leaderboards', userController.getLeaderboards);

// POST /api/leaderboards/seed - helper para crear entradas de ejemplo (solo dev)
app.post('/api/leaderboards/seed', (req, res, next) => {
  try {
    const sample = [
      { email: 'alice@example.com', name: 'Alice', score: 10, character: 'Pom' },
      { email: 'bob@example.com', name: 'Bob', score: 7, character: 'Pin' },
      { email: 'carol@example.com', name: 'Carol', score: 5, character: 'Pom' }
    ];

    for (const s of sample) {
      let u = userService.getUserByEmail(s.email);
      if (!u) {
        u = userService.createUser({ email: s.email, name: s.name });
      }
      // Mark this user as seed so it can be filtered out from leaderboards
      try { u._seed = true; } catch (err) { /* defensive */ }
      userService.addScore(u.id, { score: s.score, opponent: 'seed', character: s.character || null, timestamp: new Date().toISOString() });
    }

    const entries = userService.getLeaderboardEntries();
    res.status(201).json(entries);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:id/scores - agregar una entrada de puntuación a un usuario
app.post('/api/users/:id/scores', (req, res, next) => {
  try {
    const { id } = req.params;
    const { score, opponent, character } = req.body;
    const updated = userService.addScore(id, { score: Number(score), opponent: opponent || 'unknown', character: character || null, timestamp: new Date().toISOString() });
    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.status(201).json(updated);
  } catch (err) {
    next(err);
  }
});

app.use('/api/messages', messageRoutes);
app.use('/api/connected', connectionRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA Fallback - Servir index.html para todas las rutas que no sean API
// Esto debe ir DESPUÉS de las rutas de la API y ANTES del error handler
app.use((req, res, _next) => {
  // Si la petición es a /api/*, pasar al siguiente middleware (404 para APIs)
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint no encontrado' });
  }

  // Para cualquier otra ruta, servir el index.html del juego
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// ==================== ERROR HANDLER ====================

app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

// ==================== WEBSOCKET SERVER ====================

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Cliente WebSocket conectado');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'joinQueue': {
          // Attach player info if provided and pass to matchmaking
          const playerInfo = data.player || null;
          matchmakingService.joinQueue(ws, playerInfo);
          break;
        }

        case 'leaveQueue':
          matchmakingService.leaveQueue(ws);
          break;

        case 'moleMove':
          gameRoomService.handleMoleMove(ws, data.holeIndex);
          break;

        case 'moleMiss':
          gameRoomService.handleMoleMiss(ws);
          break;

        case 'hammerHitResult':
          gameRoomService.handleHammerHitResult(ws, data.hit, data.miss);
          break;

        case 'requestPowerupSpawn':
          gameRoomService.handlePowerupSpawnRequest(ws);
          break;

        case 'powerupPickup':
          gameRoomService.handlePowerupPickup(ws, data.playerId);
          break;

        case 'powerupUse':
          gameRoomService.handlePowerupUse(ws, data.playerId);
          break;

        default:
          console.log('Mensaje desconocido:', data.type);
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
    }
  });

  ws.on('close', () => {
    console.log('Cliente WebSocket desconectado');
    matchmakingService.leaveQueue(ws);
    gameRoomService.handleDisconnect(ws);
  });

  ws.on('error', (error) => {
    console.error('Error en WebSocket:', error);
  });
});

// ==================== INICIO DEL SERVIDOR ====================

server.listen(PORT, () => {
  console.log('========================================');
  console.log('  SERVIDOR DE CHAT PARA VIDEOJUEGO');
  console.log('========================================');
  console.log(`  Servidor corriendo en http://localhost:${PORT}`);
  console.log(`  WebSocket disponible en ws://localhost:${PORT}`);
  console.log(`  `);
  console.log(`  🎮 Juego: http://localhost:${PORT}`);
  console.log(`  `);
  console.log(`  API Endpoints disponibles:`);
  console.log(`   - GET    /health`);
  console.log(`   - POST   /api/connected`);
  console.log(`   - GET    /api/users`);
  console.log(`   - POST   /api/users`);
  console.log(`   - POST   /api/users/login`);
  console.log(`   - GET    /api/users/:id`);
  console.log(`   - PUT    /api/users/:id`);
  console.log(`   - DELETE /api/users/:id`);
  console.log(`   - GET    /api/messages`);
  console.log(`   - POST   /api/messages`);
  console.log('========================================\n');
});

// Manejo de errores globales y shutdown limpio
process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('[Process] SIGINT received. Shutting down...');
  connectionService.stopCleanup();
  server.close(() => process.exit(0));
});
