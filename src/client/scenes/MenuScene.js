import Phaser from 'phaser';
import { connectionManager } from '../services/ConnectionManager';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {

        // IMÁGENES
    this.load.image('Titulo', 'assets/Bocetos/Inicio.png'); // fondo(titulo) 

        // SONIDOS
  this.load.audio('Musica_menu', 'assets/Sonidos para_red/Its Safe Now.mp3');
    this.load.audio('Boton', 'assets/Sonidos para_red/Boton.mp3');  
}

    create() {

        // SONIDOS - Detener cualquier música anterior y reproducir la del menú
        this.sound.stopAll();
        this.musicaMenu = this.sound.add('Musica_menu');
        this.musicaMenu.play({ loop: true, volume: 0.5 });

        const bg = this.add.image(0, 0, 'Titulo').setOrigin(0, 0);  //fondo(titulo)
        bg.setDisplaySize(this.scale.width, this.scale.height);


        this.add.text(380, 200, 'MOLE', {
            fontSize: '72px',
            color: '#892327',
            fontStyle: 'bold',
            fontFamily: 'roboto'
        }).setOrigin(0.5);
            this.add.text(600, 200, 'HOLE', {
            fontSize: '72px',
            color: '#253754',
            fontFamily: 'roboto'
        }).setOrigin(0.5);

        const localBtn = this.add.text(500, 320, 'Local 2 Jugadores', {
            fontSize: '30px',
            fontStyle: 'bold',
            fontFamily: 'roboto',
            color: '#892327',
        }).setOrigin(0.5)
        .setInteractive({useHandCursor: true})
        .on('pointerover', () => localBtn.setColor('#00fff7ff'))
        .on('pointerout', () => localBtn.setColor('#892327'))
        .on('pointerdown', () => {
            this.sound.add('Boton').play();
            this.sound.stopAll();
            this.scene.start('GameScene');

        });
         const creditBtn = this.add.text(500, 420, 'Créditos', {
            fontSize: '30px',
            fontStyle: 'bold',
            fontFamily: 'roboto',
            color: '#892327',
        }).setOrigin(0.5)
        .setInteractive({useHandCursor: true})
        .on('pointerover', () => creditBtn.setColor('#00fff7ff'))
        .on('pointerout', () => creditBtn.setColor('#892327'))
        .on('pointerdown', () => {
            this.sound.add('Boton').play();
            this.sound.stopAll();
            this.scene.start('CreditScene');

        });

         const settingsBtn = this.add.text(500, 470, 'Ajustes', {
            fontSize: '30px',
            fontStyle: 'bold',
            fontFamily: 'roboto',
            color: '#892327',
        }).setOrigin(0.5)
        .setInteractive({useHandCursor: true})
        .on('pointerover', () => settingsBtn.setColor('#00fff7ff'))
        .on('pointerout', () => settingsBtn.setColor('#892327'))
        .on('pointerdown', () => {
            this.sound.add('Boton').play();
            this.sound.stopAll();
            this.scene.start('SettingsScene');

        });

        /*const onlineBtn = this.add.text(500, 390, 'Multijugador online (no disponible)', {
            fontSize: '24px',
            color: '#ff6666',
        }).setOrigin(0.5);*/


        //ONLINE

        const onlineBtn = this.add.text(500, 370, 'Multijugador en Línea', {
                    fontSize: '30px',
                    fontStyle: 'bold',
                    fontFamily: 'roboto',
                    color: '#892327',
                }).setOrigin(0.5)
                .setInteractive({useHandCursor: true})
                .on('pointerover', () => onlineBtn.setColor('#00fff7ff'))
                .on('pointerout', () => onlineBtn.setColor('#892327'))
                .on('pointerdown', () => {
                    this.scene.start('LobbyScene');
                });
        
                // Indicador de conexión al servidor
                this.connectionText = this.add.text(500, 530, 'Servidor: Comprobando...', {
                    fontSize: '18px',
                    color: '#ffff00'
                }).setOrigin(0.5);
        
                // Listener para cambios de conexión
                this.connectionListener = (data) => {
                    this.updateConnectionDisplay(data);
                };
                connectionManager.addListener(this.connectionListener);
            }
        
            updateConnectionDisplay(data) {
                // Solo actualizar si el texto existe (la escena está creada)
                if (!this.connectionText || !this.scene || !this.scene.isActive('MenuScene')) {
                    return;
                }
        
                try {
                    if (data.connected) {
                        this.connectionText.setText(`Servidor: ${data.count} usuario(s) conectado(s)`);
                        this.connectionText.setColor('#00ff00');
                    } else {
                        this.connectionText.setText('Servidor: Desconectado');
                        this.connectionText.setColor('#ff0000');
                    }
                } catch (error) {
                    console.error('[MenuScene] Error updating connection display:', error);
                }
            }
        
            shutdown() {
                // Remover el listener
                if (this.connectionListener) {
                    connectionManager.removeListener(this.connectionListener);
                }
                // Detener la música del menú
                if (this.musicaMenu) {
                    this.musicaMenu.stop();
                }
            }
    }
