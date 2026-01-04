import Phaser from 'phaser';
import { connectionManager } from '../services/ConnectionManager';

/**
 * Escena que se muestra cuando se pierde la conexión con el servidor
 * Pausa el resto de escenas y comprueba continuamente hasta que se restablezca
 */
export class ConnectionLostScene extends Phaser.Scene {
    constructor() {
        super('ConnectionLostScene');
        this.reconnectCheckInterval = null;
    }

    init(data) {
        // Guardar las escenas que estaban activas cuando se perdió la conexión
        // Puede venir como previousScenes (array) o previousScene (string por compatibilidad)
        this.previousScenes = [];
        if (Array.isArray(data.previousScenes)) {
            this.previousScenes = data.previousScenes;
        } else if (data.previousScene) {
            this.previousScenes = [data.previousScene];
        }
    }

    create() {
        // Fondo semi-transparente
        this.add.rectangle(500, 300, 1000, 600, 0x000000, 0.8);

        // Título
        this.add.text(500, 200, 'CONEXIÓN PERDIDA', {
            fontSize: '48px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Mensaje
        this.statusText = this.add.text(500, 300, 'Intentando reconectar...', {
            fontSize: '24px',
            color: '#ffff00'
        }).setOrigin(0.5);

        // Contador de intentos
        this.attemptCount = 0;
        this.attemptText = this.add.text(500, 350, 'Intentos: 0', {
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Indicador parpadeante
        this.dotCount = 0;
        this.time.addEvent({
            delay: 2000,
            callback: () => {
                this.dotCount = (this.dotCount + 1) % 4;
                const dots = '.'.repeat(this.dotCount);
                this.statusText.setText(`Intentando reconectar${dots}`);
            },
            loop: true
        });

        // Pausar todos los sonidos para indicar que todo se detuvo
        try {
            this.sound.pauseAll();
        } catch (e) {
            console.warn('[ConnectionLostScene] No se pudo pausar audio:', e);
        }

        // Listener para cambios de conexión
        this.connectionListener = (data) => {
            if (data.connected) {
                this.onReconnected();
            }
        };
        connectionManager.addListener(this.connectionListener);

        // Intentar reconectar cada 2 segundos
        this.reconnectCheckInterval = setInterval(() => {
            this.attemptReconnect();
        }, 2000);

        // Primer intento inmediato
        this.attemptReconnect();
    }

    async attemptReconnect() {
        this.attemptCount++;
        this.attemptText.setText(`Intentos: ${this.attemptCount}`);
        await connectionManager.checkConnection();
    }

    onReconnected() {
        // Limpiar interval
        if (this.reconnectCheckInterval) {
            clearInterval(this.reconnectCheckInterval);
        }

        // Remover listener
        connectionManager.removeListener(this.connectionListener);

        // Restaurar audio
        try {
            this.sound.resumeAll();
        } catch (e) {
            console.warn('[ConnectionLostScene] No se pudo reanudar audio:', e);
        }

        // Mensaje de éxito
        this.statusText.setText('¡Conexión restablecida!');
        this.statusText.setColor('#00ff00');

        // Volver a las escenas anteriores
        this.time.delayedCall(1000, () => {
            this.scene.stop();

            if (Array.isArray(this.previousScenes) && this.previousScenes.length > 0) {
                this.previousScenes.forEach(key => {
                    try {
                        if (key && this.scene.get(key)) {
                            this.scene.resume(key);
                        }
                    } catch (e) {
                        console.warn(`[ConnectionLostScene] No se pudo reanudar escena ${key}:`, e);
                    }
                });
            }
        });
    }

    shutdown() {
        // Limpiar el interval al cerrar la escena
        if (this.reconnectCheckInterval) {
            clearInterval(this.reconnectCheckInterval);
        }
        // Remover el listener
        if (this.connectionListener) {
            connectionManager.removeListener(this.connectionListener);
        }
        // Intentar reanudar escenas y audio por seguridad (si no se reanudaron en onReconnected)
        try {
            if (Array.isArray(this.previousScenes) && this.previousScenes.length > 0) {
                this.previousScenes.forEach(key => {
                    try {
                        if (key && this.scene.get(key)) {
                            this.scene.resume(key);
                        }
                    } catch (e) {
                        console.warn(`[ConnectionLostScene] No se pudo reanudar escena ${key} en shutdown:`, e);
                    }
                });
            }
            this.sound.resumeAll();
        } catch (e) {
            // No hacemos nada crítico si falla
        }
    }
}
