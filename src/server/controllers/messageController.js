/**
 * Controlador de mensajes usando closures
 *
 * TODO:
 * Implementar este controlador siguiendo el patrón usado en userController.js
 *
 * Requisitos:
 * - Usar closures para encapsular las funciones
 * - Recibir el servicio como parámetro (inyección de dependencias)
 * - Manejar errores apropiadamente
 * - Usar códigos de estado HTTP correctos
 * - Validar datos de entrada
 */

export function createMessageController(messageService) {
  /**
   * POST /api/messages - Enviar un nuevo mensaje
   * Body: {email, message}
   */
  async function create(req, res, next) {
    try {
      const { email, message } = req.body || {};
      if (!email || !message) {
        return res.status(400).json({ error: 'email y message son requeridos' });
      }

      try {
        const created = messageService.createMessage(email, message);
        return res.status(201).json(created);
      } catch (err) {
        if (err.message === 'Email no registrado') {
          return res.status(400).json({ error: err.message });
        }
        throw err;
      }
    } catch (error) {
      next(error);
    }
  }

  async function getMessages(req, res, next) {
    try {
      const { since, limit } = req.query;
      if (since) {
        const msgs = messageService.getMessagesSince(since);
        return res.status(200).json(msgs);
      }

      const l = Number(limit) || 50;
      const msgs = messageService.getRecentMessages(l);
      return res.status(200).json(msgs);
    } catch (error) {
      next(error);
    }
  }


  // Exponer la API pública del controlador
  return {
    create,
    getMessages
  };
}
