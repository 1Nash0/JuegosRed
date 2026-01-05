/**
 * Servicio de gestión de mensajes usando closures
 *
 * TODO:
 * Implementar este servicio siguiendo el patrón usado en userService.js
 *
 * Requisitos:
 * - Usar closures para mantener estado privado
 * - Mantener un array de mensajes en memoria
 * - Cada mensaje debe tener: {id, email, message, timestamp}
 * - IMPORTANTE: Verificar que el email existe usando userService.getUserByEmail()
 *   antes de crear un mensaje
 */

/**
 *
 * @param userService
 */
export function createMessageService(userService) {
  // Estado privado
  const messages = [];
  let nextId = 1;

  /**
   * Crea un nuevo mensaje
   * @param email
   * @param message
   */
  function createMessage(email, message) {
    const user = userService.getUserByEmail(email);
    if (!user) {
      throw new Error('Email no registrado');
    }

    const msg = {
      id: String(nextId++),
      email,
      message,
      timestamp: new Date().toISOString()
    };

    messages.push(msg);
    return { ...msg };
  }

  /**
   * Obtiene los últimos N mensajes (más recientes primero)
   * @param limit
   */
  function getRecentMessages(limit = 50) {
    return [...messages]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Obtiene mensajes desde un timestamp específico
   * @param since
   */
  function getMessagesSince(since) {
    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) return [];

    return messages
      .filter(m => new Date(m.timestamp) > sinceDate)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  return {
    createMessage,
    getRecentMessages,
    getMessagesSince
  };
}
