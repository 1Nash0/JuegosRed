import Phaser from 'phaser';
import { Pom } from '../entities/Pom';
import { Pin } from '../entities/Pin';

export class GameScene extends Phaser.Scene {

    constructor() {
        super('GameScene');
    }

    init() {
        this.timeLeft = 20;
        this.timerText = null;
        this.gameTimer = null;
        this.isGameOver = false;

        // POWERUP
        this.powerupAmount = 30;
        this.powerupUsesP1 = 0;
        this.powerupUsesP2 = 0;
        this.powerupMaxUsesTotal = 3;
        this.powerupStoredP1 = 0;
        this.powerupStoredP2 = 0;
        this.powerupMaxStored = 3;

        this.powerup = null;
        this.powerupHoleIndex = -1;
        this.powerupDuration = 5000;
        this.powerupSpawnMin = 4000;
        this.powerupSpawnMax = 12000;
    }

    preload() {
        // IMÁGENES
        this.load.image('fondo', 'assets/Bocetos/Gameplay.png');
        this.load.image('Martillo', 'assets/Martillo_provisional.png');
        this.load.image('bojack', 'assets/bojack.png');
        this.load.image('reloj', 'assets/reloj.png');

        // SONIDOS
        this.load.audio('Musica_nivel', 'assets/Sonidos para_red/Hydrogen.mp3');
        this.load.audio('Castor', 'assets/Sonidos para_red/Castor.mp3');
        this.load.audio('Golpe', 'assets/Sonidos para_red/Golpe.mp3');
        this.load.audio('Fin_partida', 'assets/Sonidos para_red/Miami.mp3');
        this.load.audio('Sonido_martillo', 'assets/Sonidos para_red/Martillo_juez.mp3');
        this.load.audio('Boton', 'assets/Sonidos para_red/Boton.mp3');
    }

    create() {

        // PODERES
        this.sprite = this.physics.add.sprite(500, 300, 'Poder');

        // SONIDOS
        this.sound.add('Musica_nivel').play({ loop: true, volume: 0.5 });

        // Ocultar cursor del navegador
        this.input.mouse.disableContextMenu();
        this.game.canvas.style.cursor = 'none';
        
        this.input.on('pointerover', () => {
            this.game.canvas.style.cursor = 'none';
        });

        this.add.rectangle(500, 300, 1000, 600, 0x1a1a2e);

        const bg = this.add.image(0, 0, 'fondo').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);

        // Martillo que sigue al ratón
        this.martillo = new Pom(this, 0, 400, 300);

        // Score texts
        this.scorePlayer1 = this.add.text(150, 50, 'Pom 0', {
            fontSize: '32px',
            color: '#263154ff',
            fontStyle: 'bold',
            fontFamily: 'Arial'
        }).setOrigin(0, 0);

        this.scorePlayer2 = this.add.text(650, 50, 'Pin: 0', {
            fontSize: '32px',
            color: '#701e1eff',
            fontStyle: 'bold',
            fontFamily: 'Arial'
        }).setOrigin(0, 0);

        this.puntosPlayer1 = 0;
        this.puntosPlayer2 = 0;

        // Timer abajo a la derecha
        this.timerText = this.add.text(
            this.scale.width - 20,
            this.scale.height - 20,
            this.formatTime(this.timeLeft),
            { fontSize: '28px', color: '#000000ff' }
        ).setOrigin(1, 1);

        // Powerup UI
        this.powerupTextP1 = this.add.text(160, 80, `Pom Powerups: ${this.powerupStoredP1}/${this.powerupMaxStored}`, {
            fontSize: '16px',
            color: '#263154ff',
            fontStyle: 'bold',
            fontFamily: 'Arial'
        }).setOrigin(0, 0);

        this.powerupTextP2 = this.add.text(this.scale.width - 160, 80, `Pin Powerups: ${this.powerupStoredP2}/${this.powerupMaxStored}`, {
            fontSize: '16px',
            color: '#701e1eff',
            fontStyle: 'bold',
            fontFamily: 'Arial'
        }).setOrigin(1, 0);

        // ESC para pausar
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.isGameOver) return;
            this.scene.launch('PauseScene', { originalScene: 'GameScene' });
            this.scene.pause();
        });

        // Crear topo
        this.createTopos();

        // Iniciar spawn de powerups
        this.scheduleNextPowerup();

        // Evento cuando topo aparece (para recoger powerup automáticamente)
        this.events.off('topoPopped');
        this.events.on('topoPopped', (data = {}) => {
            if (this.isGameOver) return;
            if (this.powerup && this.powerupHoleIndex === data.holeIndex) {
                this.pickupPowerupByPlayer(2);
            }
        });

        // Detectar clics
        this.input.on('pointerdown', (pointer) => {
            if (this.isGameOver) return;

            const isLeft = pointer.button === 0 || (pointer.event && pointer.event.button === 0);
            const isRight = pointer.button === 2 || (pointer.event && pointer.event.button === 2);

            // Si hay powerup activo y el click está sobre él
            if (this.powerup && this.powerup.active) {
                const pBounds = this.powerup.getBounds();
                if (pBounds.contains(pointer.x, pointer.y)) {
                    if (isLeft) {
                        this.pickupPowerupByPlayer(1);
                        return;
                    }
                    if (isRight) {
                        if (this.topo && this.powerupHoleIndex === this.topo.currentHoleIndex) {
                            this.pickupPowerupByPlayer(2);
                        }
                        return;
                    }
                    return;
                }
            }

            // Right click usa powerup del jugador 1
            if (isRight) {
                this.usePowerupByPlayer(1);
                return;
            }

            // Left click fuera del topo suma punto a jugador 2
            if (!this.topo || !this.topo.sprite) return;
            const bounds = this.topo.sprite.getBounds();
            if (!bounds.contains(pointer.x, pointer.y)) {
                this.puntosPlayer2 += 1;
                this.scorePlayer2.setText(`Pom: ${this.puntosPlayer2}`);
                this.sound.play('Sonido_martillo');
            }
        });

        // SPACE usa powerup del jugador 2
        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.isGameOver) return;
            this.usePowerupByPlayer(2);
        });

        // Timer cuenta atrás
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
                this.scorePlayer1.setText(`Pin: ${this.puntosPlayer1}`);
                this.topo.hide();
                this.sound.play('Golpe');
                this.sound.play('Castor');
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

    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

     endRound() {
        this.isGameOver = true;
        this.sound.stopAll();
        this.sound.play('Fin_partida', { volume: 0.5 });

        // Mostrar cursor
        this.game.canvas.style.cursor = 'auto';
        this.input.off('pointerover');

        // Ocultar martillo
        if (this.martillo) {
            this.martillo.setVisible(false);
        }

        // Detener timers
        if (this.topoTimer) this.topoTimer.remove(false);
        if (this.gameTimer) this.gameTimer.remove(false);

        // Desactivar interacciones
        if (this.topo && this.topo.sprite) {
            this.topo.sprite.disableInteractive();
            this.topo.hide();
        }

        // PANEL central bonito
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        const panel = this.add.rectangle(cx, cy, 760, 420, 0x0b1220, 0.88).setOrigin(0.5).setDepth(200);
        panel.setStrokeStyle(4, 0x1f6feb);

        // efecto entrada
        panel.scale = 0.8;
        this.tweens.add({ targets: panel, scale: 1, duration: 220, ease: 'Back.Out' });

        // Titulo ganador
        let winnerText = 'Empate';
        if (this.puntosPlayer1 > this.puntosPlayer2) {
            winnerText = 'Gana Jugador 1';
        } else if (this.puntosPlayer2 > this.puntosPlayer1) {
            winnerText = 'Gana Jugador 2';
        }

        this.add.text(cx, cy - 120, winnerText, {
            fontSize: '42px',
            fontStyle: 'bold',
            color: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(201);

        // Estadísticas
        this.add.text(cx, cy - 40, `P1: ${this.puntosPlayer1}`, {
            fontSize: '26px',
            color: '#3c4e97ff',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(201);

        this.add.text(cx, cy + 4, `P2: ${this.puntosPlayer2}`, {
            fontSize: '26px',
            color: '#843131ff',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(201);

        // Botones: Volver al menú y Repetir
        const btnY = cy + 90;
        const btnW = 220, btnH = 56;

        const createBtn = (x, y, text, baseColor, hoverColor, cb) => {
            const bg = this.add.rectangle(x, y, btnW, btnH, baseColor).setOrigin(0.5).setDepth(205);
            bg.setStrokeStyle(2, 0x0a2740, 0.9);

            const label = this.add.text(x, y, text, {
                fontSize: '20px',
                color: '#001a22', // texto oscuro por defecto (buena legibilidad sobre fondo claro)
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }).setOrigin(0.5).setDepth(206);

            // sombra para mejor contraste
            label.setShadow(2, 2, '#000000', 4);

            // container para interacción
            const container = this.add.container(0, 0, [bg, label]);
            container.setSize(btnW, btnH);
            container.setInteractive(new Phaser.Geom.Rectangle(x - btnW/2, y - btnH/2, btnW, btnH), Phaser.Geom.Rectangle.Contains);

            // hover: cambiar color, texto a blanco y hacer un pequeño pop
            container.on('pointerover', () => {
                bg.setFillStyle(hoverColor);
                label.setColor('#ffffff');
                this.tweens.killTweensOf(container);
                this.tweens.add({
                    targets: container,
                    scaleX: 1.03,
                    scaleY: 1.03,
                    duration: 120,
                    ease: 'Power1'
                });
                this.game.canvas.style.cursor = 'pointer';
            });

            // out: restaurar
            container.on('pointerout', () => {
                bg.setFillStyle(baseColor);
                label.setColor('#001a22');
                this.tweens.killTweensOf(container);
                this.tweens.add({
                    targets: container,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 120,
                    ease: 'Power1'
                });
                this.game.canvas.style.cursor = 'auto';
            });

            container.on('pointerdown', cb);
            return container;
        };

        createBtn(cx - 140, btnY, 'Repetir', 0x88e1ff, 0x4fb0ff, () => {
            this.sound.play('Boton');
            this.scene.restart();
        });

        createBtn(cx + 140, btnY, 'Volver al Menú', 0xffdba8, 0xffb57a, () => {
            this.sound.play('Boton');
            this.scene.start('MenuScene');
        });
    }

    update() {
        if (this.isGameOver) return;

        // Control del topo con teclado numérico (1-5)
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

        // ESC para salir al menú
        const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        if (Phaser.Input.Keyboard.JustDown(escKey) && !this.isGameOver) {
            this.sound.stopAll();
            this.scene.start('MenuScene');
        }
    }

    resume() {
        if (this.game && this.game.canvas && this.game.canvas.style) {
            this.game.canvas.style.cursor = 'none';
        }
    }

     spawnPowerupAtRandomHole() {
        if (!this.topoHoles || !this.topoHoles.length) return;
        if (this.powerup) return;

        const index = Phaser.Math.Between(0, this.topoHoles.length - 1);
        const pos = this.topoHoles[index];

        // Usar el sprite 'reloj' (pre-cargado en preload) en lugar del círculo azul
        const spriteKey = 'reloj';
        this.powerup = this.add.image(pos.x, pos.y - 10, spriteKey).setScale(0.10).setDepth(8);
        this.powerupHoleIndex = index;
        this.powerup.setInteractive({ useHandCursor: true });

        // Animación sutil de flotación
        this.tweens.add({
            targets: this.powerup,
            y: pos.y - 16,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Expiración y programación del siguiente spawn
        this.time.delayedCall(this.powerupDuration, () => {
            if (this.powerup) {
                this.powerup.destroy();
                this.powerup = null;
                this.powerupHoleIndex = -1;
                this.scheduleNextPowerup();
            }
        });
    }

    scheduleNextPowerup() {
        if (this.isGameOver) return;
        if (this.powerup) return;

        const delay = Phaser.Math.Between(this.powerupSpawnMin, this.powerupSpawnMax);
        this.time.delayedCall(delay, () => {
            if (this.isGameOver) return;
            this.spawnPowerupAtRandomHole();
        });
    }

    pickupPowerupByPlayer(playerId) {
        if (!this.powerup) return false;
        if (this.isGameOver) return false;

        if (playerId === 1) {
            if (this.powerupStoredP1 >= this.powerupMaxStored) return false;
            this.powerupStoredP1 += 1;
            if (this.powerupTextP1) this.powerupTextP1.setText(`P1 Powerups: ${this.powerupStoredP1}/${this.powerupMaxStored}`);
        } else {
            if (this.powerupStoredP2 >= this.powerupMaxStored) return false;
            this.powerupStoredP2 += 1;
            if (this.powerupTextP2) this.powerupTextP2.setText(`P2 Powerups: ${this.powerupStoredP2}/${this.powerupMaxStored}`);
        }

        

        if (this.powerup) {
            this.powerup.destroy();
            this.powerup = null;
            this.powerupHoleIndex = -1;
        }
        this.scheduleNextPowerup();
        return true;
    }

    usePowerupByPlayer(playerId) {
        if (this.isGameOver) return false;

        if (playerId === 1) {
            if (this.powerupUsesP1 >= this.powerupMaxUsesTotal) return false;
            if (this.powerupStoredP1 <= 0) return false;
            this.powerupStoredP1 -= 1;
            this.powerupUsesP1 += 1;
            if (this.powerupTextP1) this.powerupTextP1.setText(`P1 Powerups: ${this.powerupStoredP1}/${this.powerupMaxStored}`);
        } else {
            if (this.powerupUsesP2 >= this.powerupMaxUsesTotal) return false;
            if (this.powerupStoredP2 <= 0) return false;
            this.powerupStoredP2 -= 1;
            this.powerupUsesP2 += 1;
            if (this.powerupTextP2) this.powerupTextP2.setText(`P2 Powerups: ${this.powerupStoredP2}/${this.powerupMaxStored}`);
        }

        this.timeLeft += this.powerupAmount;
        if (this.timerText) this.timerText.setText(this.formatTime(this.timeLeft));

        
        this.cameras.main.flash(150, 100, 255, 100);

        return true;
    }
}