/**
 * Rutas para la gestión de usuarios
 * Define los endpoints HTTP y los conecta con el controlador
 *
 * Patrón: Inyección de dependencias - recibe el controlador como parámetro
 */

import express from 'express';

/**
 *
 * @param userController
 */
export function createUserRoutes(userController) {
  const router = express.Router();

  // POST /api/users - Crear nuevo usuario
  router.post('/', userController.create);

  // POST /api/users/login - Login (crea usuario si no existe)
  router.post('/login', userController.login);

  // GET /api/users - Obtener todos los usuarios
  router.get('/', userController.getAll);

  // GET /api/leaderboards - Obtener entradas del leaderboard (scores históricos)
  router.get('/leaderboards', userController.getLeaderboards);

  // GET /api/users/:id - Obtener un usuario por ID
  router.get('/:id', userController.getById);

  // PUT /api/users/:id - Actualizar un usuario
  router.put('/:id', userController.update);

  // DELETE /api/users/:id - Eliminar un usuario
  router.delete('/:id', userController.remove);

  return router;
}
