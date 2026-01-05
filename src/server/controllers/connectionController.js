/**
 * Controller para gestionar las conexiones de usuarios
 * @param connectionService
 */
export function createConnectionController(connectionService) {
  return {
    /**
     * Handler para el endpoint /connected
     * Registra la conexión de la sesión y devuelve el número de sesiones conectadas
     * @param req
     * @param res
     */
    handleConnected(req, res) {
      const { sessionId } = req.body;

      // Validar que se envió un sessionId
      if (!sessionId) {
        return res.status(400).json({
          error: 'sessionId es requerido'
        });
      }

      // Actualizar el timestamp de la última conexión de esta sesión
      const connectedCount = connectionService.updateConnection(sessionId);

      console.log(`[ConnectionController] session ${sessionId} checked in. Connected sessions: ${connectedCount}`);

      res.json({
        connected: connectedCount
      });
    }
  };
}
