import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { CreditScene } from './scenes/CreditScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { ConnectionLostScene } from './scenes/ConnectionLostScene.js';
import LobbyScene from './scenes/LobbyScene.js';
import { MultiplayerGameScene } from './scenes/MultiplayerGameScene.js';
import { connectionManager } from './services/ConnectionManager.js';

const config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [MenuScene, GameScene, PauseScene, CreditScene, SettingsScene, ConnectionLostScene, LobbyScene, MultiplayerGameScene],
    backgroundColor: '#1a1a2e',
}

const game = new Phaser.Game(config);

// Global connection listener: al perder conexión, abrir ConnectionLostScene y pausar la escena activa
connectionManager.addListener((data) => {
  if (!data.connected) {
    try {
      // Si ya está abierta la escena de reconexión, no hacemos nada
      const connScene = game.scene.getScene('ConnectionLostScene');
      if (connScene && connScene.scene.isActive()) {
        return;
      }

      // Buscar una escena activa para pausar (excluir ConnectionLostScene)
      const activeScenes = game.scene.getScenes(true);
      const previous = activeScenes.find(s => s.scene && s.scene.key && s.scene.key !== 'ConnectionLostScene');
      const previousKey = previous ? previous.scene.key : null;

      if (previousKey) {
        game.scene.pause(previousKey);
      }

      game.scene.start('ConnectionLostScene', { previousScene: previousKey });
    } catch (err) {
      console.error('[Main] Error handling connection loss:', err);
    }
  }
});