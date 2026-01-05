/**
 * Controlador de usuarios usando closures
 * Este controlador maneja las peticiones HTTP relacionadas con usuarios
 * y utiliza el userService para las operaciones de datos
 *
 * Patrón: Inyección de dependencias - recibe el servicio como parámetro
 */

/**
 *
 * @param userService
 */
export function createUserController(userService) {
  /**
   * POST /api/users - Crear nuevo usuario
   * @param req
   * @param res
   * @param next
   */
  async function create(req, res, next) {
    try {
      // 1. Extraer datos del body: email, name, avatar, level
      const { email, name, avatar, level } = req.body;

      // 2. Validar que los campos requeridos estén presentes (email, name)
      if (!email || !name) {
        return res.status(400).json({
          error: 'Los campos email y name son obligatorios'
        });
      }

      // 3. Llamar a userService.createUser()
      const newUser = userService.createUser({ email, name, avatar, level });

      // 4. Retornar 201 con el usuario creado
      res.status(201).json(newUser);
    } catch (error) {
      // 5. Si hay error (ej: email duplicado), retornar 400
      if (error.message === 'El email ya está registrado') {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  /**
   * POST /api/users/login - Login (crear usuario si no existe)
   * @param req
   * @param res
   * @param next
   */
  async function login(req, res, next) {
    try {
      const { email, name } = req.body;
      if (!email || !name) {
        return res.status(400).json({ error: 'email y name son requeridos' });
      }

      // Si ya existe el usuario, devolverlo
      const existing = userService.getUserByEmail(email);
      if (existing) {
        console.log(`[UserController] Login existente: ${email}`);
        return res.status(200).json(existing);
      }

      // Si no existe, crear uno nuevo
      const newUser = userService.createUser({ email, name });
      console.log(`[UserController] Nuevo usuario creado por login: ${email}`);
      return res.status(201).json(newUser);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/users - Obtener todos los usuarios
   * @param req
   * @param res
   * @param next
   */
  async function getAll(req, res, next) {
    try {
      const users = userService.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/leaderboards - Obtener las entradas del leaderboard
   * @param req
   * @param res
   * @param next
   */
  async function getLeaderboards(req, res, next) {
    try {
      const entries = userService.getLeaderboardEntries();
      // DEBUG: log number of entries returned
      console.log(`[UserController] getLeaderboards returning ${entries.length} entries`);
      // Opcional: permitir limitar la respuesta con ?limit=
      const limit = Number(req.query.limit) || 50;
      res.status(200).json(entries.slice(0, limit));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:id - Obtener un usuario por ID
   * @param req
   * @param res
   * @param next
   */
  async function getById(req, res, next) {
    try {
      // 1. Extraer el id de req.params
      const { id } = req.params;

      // 2. Llamar a userService.getUserById()
      const user = userService.getUserById(id);

      // 3. Si no existe, retornar 404
      if (!user) {
        return res.status(404).json({
          error: 'Usuario no encontrado'
        });
      }

      // 4. Si existe, retornar 200 con el usuario
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/users/:id - Actualizar un usuario
   * @param req
   * @param res
   * @param next
   */
  async function update(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Proteger campos que no se deben actualizar
      delete updates.id;
      delete updates.email;
      delete updates.createdAt;

      const updated = userService.updateUser(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      console.log(`[UserController] Usuario ${id} actualizado`);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/users/:id - Eliminar un usuario
   * @param req
   * @param res
   * @param next
   */
  async function remove(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = userService.deleteUser(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      console.log(`[UserController] Usuario ${id} eliminado`);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // Exponer la API pública del controlador
  return {
    create,
    login,
    getAll,
    getLeaderboards,
    getById,
    update,
    remove
  };
}
