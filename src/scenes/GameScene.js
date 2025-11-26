import Phaser from 'phaser';
import { Pom } from '../entities/Pom';
import { Pin } from '../entities/Pin';

export class GameScene extends Phaser.Scene {

    constructor() {
        super('GameScene');
    }

    init() {
        this.processor = null;
        this.timeLeft = 60;        // segundos para la partida
        this.timerText = null;
        this.gameTimer = null;
        this.isGameOver = false;
    }

    preload() {

        // IMÁGENES
        this.load.image('fondo', 'assets/Bocetos/Gameplay.png');
        this.load.image('Martillo', 'assets/Martillo_provisional.png');
        this.load.image('bojack', 'assets/bojack.png');

        // SONIDOS
        this.load.audio('Sonido_martillo', 'assets/Sonidos para_red/Martillo_juez.mp3');
        this.load.audio('Musica_nivel', 'assets/Sonidos para_red/Hydrogen.mp3');
        this.load.audio('Sonido castor', 'assets/Sonidos para_red/Sonido castor.mp3');
        this.load.audio('Golpe', 'assets/Sonidos para_red/Golpe.mp3');
        this.load.audio('Fin_partida', 'assets/Sonidos para_red/Miami.mp3');
   
    }

    create() {

        // SONIDOS
        this.sound.add('Musica_nivel').play({ loop: true, volume: 0.5 });


        this.add.rectangle(500, 300, 1000, 600, 0x1a1a2e);

        const bg = this.add.image(0, 0, 'fondo').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);

        // Martillo que sigue al ratón
        this.martillo = new Pom(this, 400, 300);

        // Score texts
        this.scorePlayer1 = this.add.text(150, 50, 'Jugador 1: 0', {
            fontSize: '32px',
            color: '#00ff00'
        }).setOrigin(0, 0);

        this.scorePlayer2 = this.add.text(650, 50, 'Jugador 2: 0', {
            fontSize: '32px',
            color: '#ff0000'
        }).setOrigin(0, 0);

        this.puntosPlayer1 = 0;
        this.puntosPlayer2 = 0;

        // Timer arriba a la derecha
        this.timerText = this.add.text(this.scale.width - 20, 20, this.formatTime(this.timeLeft), {
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(1, 0);

        // Crear topo
        this.createTopos();

        // Detectar clics fuera del topo
        this.input.on('pointerdown', (pointer) => {
            if (this.isGameOver) return;
            // Solo contar si no clicamos en el topo
            if (!this.topo.sprite.getBounds().contains(pointer.x, pointer.y)) {
                this.puntosPlayer2 += 1;
                this.scorePlayer2.setText(`Jugador 2: ${this.puntosPlayer2}`);
                this.sound.play('Sonido_martillo');
            }
        });

        // Iniciar cuenta atrás de 1 minuto
        this.gameTimer = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                if (this.isGameOver) return;
                this.timeLeft--;
                this.timerText.setText(this.formatTime(this.timeLeft));
                if (this.timeLeft <= 0) {
                    this.endRound();
                }
            }
        });

        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    createTopos() {
        this.topoHoles = [
            { x: 200, y: 420 },
            { x: 320, y: 320 },
            { x: 440, y: 420 },
            { x: 560, y: 320 },
            { x: 680, y: 420 }
        ];

        this.topo = new Pin(this, 0, this.topoHoles[0].x, this.topoHoles[0].y);
        this.topo.setHoles(this.topoHoles);

        // Evento cuando golpeas el topo
        this.topo.sprite.on('pointerdown', () => {
            if (this.isGameOver) return;
            if (this.topo.isActive) {
                this.puntosPlayer1 += 1;
                this.scorePlayer1.setText(`Jugador 1: ${this.puntosPlayer1}`);
                this.topo.hide();
                this.sound.play('Golpe');
                this.sound.play('Sonido castor');
                // Temblor de pantalla
                this.cameras.main.shake(200, 0.01);
            }
        });

        // El topo sale automáticamente cada 2 segundos
        this.topoTimer = this.time.addEvent({
            delay: 2000,
            loop: true,
            callback: () => {
                if (this.isGameOver) return;
                if (!this.topo.isActive) {
                    this.topo.popUp();
                }
            }
        });
    }

    // Formatear segundos a MM:SS
    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // Termina la partida, muestra ganador y bloquea input
    endRound() {
        this.isGameOver = true;
        this.sound.stopAll();
        this.sound.play('Fin_partida', { volume: 0.5 });

        // Detener timers
        if (this.topoTimer) this.topoTimer.remove(false);
        if (this.gameTimer) this.gameTimer.remove(false);

        // Desactivar interacciones
        if (this.topo && this.topo.sprite) {
            this.topo.sprite.disableInteractive();
            this.topo.hide();
        }

        // Calcular ganador
        let winnerText = 'Empate';
        if (this.puntosPlayer1 > this.puntosPlayer2) {
            winnerText = 'Gana Jugador 1';
        } else if (this.puntosPlayer2 > this.puntosPlayer1) {
            winnerText = 'Gana Jugador 2';
        }

        // Mostrar resultado en pantalla
        this.add.rectangle(this.scale.width / 2, this.scale.height / 2 - 40, 700, 540, 0x000000, 0.7).setOrigin(0.5);
        this.add.text(this.scale.width / 2, this.scale.height / 2 - 30, winnerText, {
            fontSize: '48px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2 + 30, `P1: ${this.puntosPlayer1}   P2: ${this.puntosPlayer2}`, {
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(0.5);

        
    }

    update() {
        if (this.isGameOver) return;

        // Control del topo con teclado numérico (1, 2, 3, 4, 5)
        if (this.topo) {
            const numKeys = [
                Phaser.Input.Keyboard.KeyCodes.ONE,
                Phaser.Input.Keyboard.KeyCodes.TWO,
                Phaser.Input.Keyboard.KeyCodes.THREE,
                Phaser.Input.Keyboard.KeyCodes.FOUR,
                Phaser.Input.Keyboard.KeyCodes.FIVE
            ];

            numKeys.forEach((key, index) => {
                const keyObj = this.input.keyboard.addKey(key);
                if (Phaser.Input.Keyboard.JustDown(keyObj)) {
                    this.topo.moveToHole(index);
                }
            });
        }

        // ESC para salir
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.sound.stopAll();
            this.scene.start('MenuScene');
        }
    }
}