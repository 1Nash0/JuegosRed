/**
 * Servicio de gestión de usuarios usando closures
 * Este servicio mantiene el estado de los usuarios en memoria
 * y proporciona métodos para realizar operaciones CRUD
 */

import { debug } from '../utils/logger.js';

export function createUserService() {
  // Estado privado: almacén de usuarios
  let users = [];
  let nextId = 1;

  /**
   * Crea un nuevo usuario
   * @param {Object} userData - {email, name, avatar, level}
   * @returns {Object} Usuario creado
   */
  function createUser(userData) {
    // 1. Validar que el email no exista ya
    const existingUser = users.find(u => u.email === userData.email);
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // 2. Crear objeto usuario con id único y createdAt
    const newUser = {
      id: String(nextId),
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar || '',
      level: userData.level || 1,
      // Player-specific fields required by GDD phase 3
      color: userData.color || 'blue',
      maxScore: typeof userData.maxScore === 'number' ? userData.maxScore : 0,
      bestTime: userData.bestTime || null,
      bestCharacter: userData.bestCharacter || 'Pom',
      // Keep history of scores for leaderboard
      scores: [],
      createdAt: new Date().toISOString()
    };

    // 3. Agregar a la lista de usuarios
    users.push(newUser);

    // 4. Incrementar nextId
    nextId++;

    // 5. Retornar el usuario creado
    return newUser;
  }

  /**
   * Añade una entrada de puntuación para un usuario identificado por id o email
   * @param {string} idOrEmail - ID o email del usuario
   * @param {Object} entry - { score: number, opponent: string, timestamp: string }
   * @returns {Object|null} Usuario actualizado o null si no existe
   */
  function addScore(idOrEmail, entry) {
    const user = users.find(u => u.id === idOrEmail || u.email === idOrEmail);
    if (!user) return null;

    // Añadir entrada (copiar para seguridad)
    const scoreEntry = {
      score: Number(entry.score) || 0,
      opponent: entry.opponent || 'unknown',
      character: entry.character || null,
      timestamp: entry.timestamp || new Date().toISOString()
    };

    user.scores.push(scoreEntry);

    // DEBUG: loguear la adición de la puntuación
    try {
      debug(`[UserService] addScore -> user:${user.id || user.email} score:${scoreEntry.score} opponent:${scoreEntry.opponent}`);
    } catch (e) {
      // ignore logging errors
    }

    // Actualizar maxScore si corresponde
    if (scoreEntry.score > (user.maxScore || 0)) {
      user.maxScore = scoreEntry.score;
    }

    return { ...user };
  }

  /**
   * Obtiene todas las entradas de leaderboard (aplanando los scores de todos los usuarios)
   * @returns {Array} Array de entradas { userId, name, avatar, score, opponent, timestamp }
   */
  function getLeaderboardEntries() {
    const entries = [];
    for (const u of users) {
      for (const s of u.scores) {
        entries.push({
          userId: u.id,
          name: u.name,
          avatar: u.avatar,
          score: s.score,
          opponent: s.opponent,
          character: s.character || null,
          timestamp: s.timestamp
        });
      }
    }

    // Ordenar por score descendente y luego por fecha descendente
    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return entries;
  }

  /**
   * Obtiene todos los usuarios
   * @returns {Array} Array de usuarios
   */
  function getAllUsers() {
    // Retornar una copia del array de usuarios para evitar mutaciones externas
    return users.map(u => ({ ...u }));
  }

  /**
   * Busca un usuario por ID
   * @param {string} id - ID del usuario
   * @returns {Object|null} Usuario encontrado o null
   */
  function getUserById(id) {
    const user = users.find(u => u.id === id);
    return user || null;
  }

  /**
   * Busca un usuario por email
   * @param {string} email - Email del usuario
   * @returns {Object|null} Usuario encontrado o null
   */
  function getUserByEmail(email) {
    const user = users.find(u => u.email === email);
    return user || null;
  }

  /**
   * Actualiza un usuario
   * @param {string} id - ID del usuario
   * @param {Object} updates - Campos a actualizar
   * @returns {Object|null} Usuario actualizado o null si no existe
   */
  function updateUser(id, updates) {
    const user = users.find(u => u.id === id);
    if (!user) return null;

    // Campos permitidos para actualizar
    const allowed = ['name', 'color', 'maxScore'];

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        user[key] = updates[key];
      }
    }

    return { ...user };
  }

  /**
   * Elimina un usuario
   * @param {string} id - ID del usuario
   * @returns {boolean} true si se eliminó, false si no existía
   */
  function deleteUser(id) {
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return false;

    users.splice(idx, 1);
    return true;
  }

  // Exponer la API pública del servicio
  return {
    createUser,
    getAllUsers,
    getUserById,
    getUserByEmail,
    updateUser,
    deleteUser,
    // Nuevo API
    addScore,
    getLeaderboardEntries
  };
}
