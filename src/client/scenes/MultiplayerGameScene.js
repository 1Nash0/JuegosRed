import Phaser from 'phaser';
import { Pom } from '../entities/Pom';
import { Pin } from '../entities/Pin';

const POWERUP_CLOCK = 'clock';
const POWERUP_THERMOMETER = 'thermometer';

/**
 * Multiplayer Whack-a-Mole Game Scene
 * Player 1 controls the hammer (Pom), Player 2 controls the mole (Pin)
 * Server synchronizes game state via WebSocket
 */
export class MultiplayerGameScene extends Phaser.Scene {

    constructor() {
        super('MultiplayerGameScene');
    }

    init(data) {
        this.ws = data.ws;
        this.playerRole = data.playerRole; // 'player1' or 'player2'
        this.roomId = data.roomId;

        // Game state
        this.timeLeft = 10;
        this.isGameOver = false;

        // Scores
        this.puntosPlayer1 = 0; // Pom (Player 1)
        this.puntosPlayer2 = 0; // Pin (Player 2)

        // Powerup config & state
        this.powerupAmount = 20;
        this.powerupMaxStoredP1 = 3;
        this.powerupMaxStoredP2 = 3;
        this.powerupStoredP1 = [];
        this.powerupStoredP2 = [];
        this.powerupsUsedP1 = 0;
        this.powerupsUsedP2 = 0;

        this.powerup = null;
        this.powerupHoleIndex = -1;
        this.powerupDuration = 5000;
        this.powerupSpawnMin = 4000;
        this.powerupSpawnMax = 12000;

        // Thermometer effect
        this.thermometerEffectActive = false;
        this.pinBlocked = false;
        this.thermometerTimer = null;

        // timers / references
        this.topoTimer = null;
        this.gameTimer = null;
    }

    preload() {
        // IMÁGENES
        this.load.image('fondo', 'assets/FondoGameplay.png');
        this.load.image('Martillo', 'assets/mazo.png');
        this.load.image('bojack', 'assets/pin.png');
        this.load.image('Pingolpeado', 'assets/pingolpeado.png');
        this.load.image('reloj', 'assets/relojarena.png');
        this.load.image('agujero', 'assets/agujero.png');
        this.load.image('termometro', 'assets/termometro.png');

        // SONIDOS
        this.load.audio('Musica_nivel', 'assets/Sonidos para_red/Hydrogen.mp3');
        this.load.audio('Castor', 'assets/Sonidos para_red/Castor.mp3');
        this.load.audio('Golpe', 'assets/Sonidos para_red/Golpe.mp3');
        this.load.audio('Sonido_martillo', 'assets/Sonidos para_red/Martillo_juez.mp3');
        this.load.audio('Boton', 'assets/Sonidos para_red/Boton.mp3');
        this.load.audio('Frio', 'assets/Sonidos para_red/Tembleque.mp3');
    }

    create() {
        
        // Background & UI container
        this.add.rectangle(500, 300, 1000, 600, 0x1a1a2e);
        const bg = this.add.image(0, 0, 'fondo').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);

        this.add.image(200, 480, 'agujero').setScale(0.5);
        this.add.image(320, 320, 'agujero').setScale(0.5);
        this.add.image(440, 480, 'agujero').setScale(0.5);
        this.add.image(560, 320, 'agujero').setScale(0.5);
        this.add.image(680, 480, 'agujero').setScale(0.5);
        this.add.image(800, 320, 'agujero').setScale(0.5);

        // Input and hammer setup
        if (this.playerRole === 'player1') {
            this.input.on('pointerdown', pointer => {
                this.handlePointerDown(pointer);
            });

            // Create hammer that will follow the mouse for P1
            this.martillo = new Pom(
                this,
                'Martillo',
                this.input.activePointer.worldX,
                this.input.activePointer.worldY,
                { followPointer: true }
            );
            this.game.canvas.style.cursor = 'none';
        } else {
            // For player2, create a martillo sprite to display the opponent's hammer
            // but do NOT follow the local pointer and make it non-interactive
            this.martillo = new Pom(this, 'Martillo', 400, 300, { followPointer: false });
            this.martillo.setVisible(false);
            try {
                // Ensure it cannot be interacted with locally
                if (this.martillo.disableInteractive) this.martillo.disableInteractive();
            } catch (e) {}
        }

        // Sonido de fondo
        this.musicaNivel = this.sound.add('Musica_nivel');
        this.musicaNivel.play({ loop: true, volume: 0.5 });

        // Cursor: ocultamos por defecto; la entidad Pom puede mostrar su propio sprite
        this.input.mouse.disableContextMenu();
        this.game.canvas.style.cursor = 'none';

        // (hammer already created above for P1)

        // Scores arriba a la izquierda y derecha
        this.scorePlayer1 = this.add.text(80, 50, 'Pom: 0', {
            fontSize: '32px',
            color: '#6a7cb4ff',
            fontStyle: 'bold',
            fontFamily: 'Arial'
        }).setOrigin(0, 0);

        this.scorePlayer2 = this.add.text(850, 50, 'Pin: 0', {
            fontSize: '32px',
            color: '#9e4b4bff',
            fontStyle: 'bold',
            fontFamily: 'Arial'
        }).setOrigin(0, 0);

        // Timer abajo a la derecha
        this.timerText = this.add.text(
            this.scale.width - 20,
            this.scale.height - 20,
            this.formatTime(this.timeLeft),
            { fontSize: '40px',fontStyle: 'bold', color: '#ffffffff', fontFamily: 'Arial' }
        ).setOrigin(1, 1);

        // Powerup UI
        this.powerupTextP1 = this.add.text(80, 80, `P1 Powerups: ${this.powerupStoredP1}/${this.powerupMaxStoredP1}`, {
            fontSize: '16px',
            color: '#6a7cb4ff',
            fontStyle: 'bold',
            fontFamily: 'Arial'
        }).setOrigin(0, 0);

        this.powerupTextP2 = this.add.text(this.scale.width + 20, 80, `P2 Powerups: ${this.powerupStoredP2}/${this.powerupMaxStoredP2}`, {
            fontSize: '16px',
            color: '#9e4b4bff',
            fontStyle: 'bold',
            fontFamily: 'Arial'
        }).setOrigin(1.5, 0);

        // Role indicator
        const roleText = this.playerRole === 'player1' ? 'Eres Pom (Martillo)' : 'Eres Pin (Castor)';
        this.add.text(400, 20, roleText, {
            fontSize: '16px',
            color: '#ffff00'
        }).setOrigin(0.5);

        // Teclas: solo se crean una vez
        this.keys = this.input.keyboard.addKeys({
            one: Phaser.Input.Keyboard.KeyCodes.ONE,
            two: Phaser.Input.Keyboard.KeyCodes.TWO,
            three: Phaser.Input.Keyboard.KeyCodes.THREE,
            four: Phaser.Input.Keyboard.KeyCodes.FOUR,
            five: Phaser.Input.Keyboard.KeyCodes.FIVE,
            six: Phaser.Input.Keyboard.KeyCodes.SIX,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE
        });

        // Resume handler (cuando vuelves desde pausa)
        this.events.on('Reanudar', this.onResume, this);

        // Crear topo (Pin)
        this.createTopos();

        // Start powerup spawns
        this.scheduleNextPowerup();

        // Evento topo popped: recoge el powerup automáticamente para P2 si coincide
        this.events.off('topoPopped'); // aseguramos que no haya duplicados
        this.events.on('topoPopped', (data = {}) => {
            if (this.isGameOver) return;
            if (this.powerup && this.powerupHoleIndex === data.holeIndex) {
                // Si el topo aparece exactamente en el powerup -> solicitar pickup al servidor (P2)
                if (this.playerRole === 'player2') {
                    this.sendMessage({ type: 'powerupPickup', playerId: 2, holeIndex: data.holeIndex });
                }
            }

            // Notify server that the mole popped (only from player2 client)
            if (this.playerRole === 'player2') {
                try {
                    this.sendMessage({ type: 'molePop', holeIndex: data.holeIndex });
                } catch (err) {
                    console.warn('Failed to send molePop:', err);
                }
            }
        });

        // Evento topo Hidden (siempre que se oculte)
        this.events.off('topoHidden');
        this.events.on('topoHidden', (data = {}) => {
            if (this.isGameOver) return;
            // Notify server that the mole hid (useful to clear server-side moleActive)
            if (this.playerRole === 'player2') {
                try {
                    this.sendMessage({ type: 'moleHide', holeIndex: data.holeIndex, wasHit: !!data.wasHit });
                } catch (err) {
                    console.warn('Failed to send moleHide:', err);
                }
            }
        });

        // Evento topo missed: cuando el topo desaparece sin ser golpeado, punto para P2
        this.events.off('topoMissed'); // aseguramos que no haya duplicados
        this.events.on('topoMissed', (_data = {}) => {
            if (this.isGameOver) return;
            if (!this.pinBlocked && this.playerRole === 'player2') {
                // Only player 2 sends the miss message
                this.sendMessage({ type: 'moleMiss' });
            }
        });

        // Timer cuenta atrás
        // this.gameTimer = this.time.addEvent({
        //     delay: 1000,
        //     loop: true,
        //     callback: () => {
        //         if (this.isGameOver) return;
        //         this.timeLeft--;
        //         this.timerText.setText(this.formatTime(this.timeLeft));
        //         if (this.timeLeft <= 0) {
        //             this.endGame();
        //         }
        //     }
        // });
        

        // Aseguramos que los textos y UI estén sincronizados
        this.updateScoreUI();
        this.updatePowerupUI();

        // Set up WebSocket listeners
        this.setupWebSocketListeners();
    }

    

    setupWebSocketListeners() {
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            } catch (error) {
                console.error('Error parsing server message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
            if (!this.isGameOver) {
                this.handleDisconnection();
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (!this.isGameOver) {
                this.handleDisconnection();
            }
        };
    }

    handleServerMessage(data) {
        switch (data.type) {
            case 'moleMove':
                // Update mole position
                if (this.topo) {
                    this.topo.moveToHole(data.holeIndex);
                }
                break;

            case 'hammerMove':
                // Update hammer position on the client that does NOT control it
                if (this.martillo) {
                    // ensure visible
                    this.martillo.setVisible(true);
                    // Store target for smooth interpolation in update()
                    this._remoteHammerTarget = { x: data.x, y: data.y, angle: data.angle || 0, ts: Date.now() };
                }
                break;



            case 'hammerResult':
                {
                // Server-side result of a hammer attempt
                console.log('[Multiplayer] hammerResult received', data);
                // Show opponent's hammer at the targeted hole (if holeIndex provided)
                const idx = (typeof data.holeIndex === 'number') ? data.holeIndex : -1;
                if (idx >= 0 && this.topoHoles && this.topoHoles[idx]) {
                    const pos = this.topoHoles[idx];
                    if (this.martillo) {
                        const isLocalHammer = (this.playerRole === 'player1');
                        if (!isLocalHammer) {
                            // show opponent hammer briefly at the hit location
                            this.martillo.setVisible(true);
                            if (typeof this.martillo.setPosition === 'function') this.martillo.setPosition(pos.x, pos.y - 20);
                            else { this.martillo.x = pos.x; this.martillo.y = pos.y - 20; }
                            if (typeof this.martillo.hit === 'function') this.martillo.hit();
                            this.time.delayedCall(500, () => { try { if (this.martillo && this.martillo.setVisible) this.martillo.setVisible(false); } catch (e) {} });
                        } else {
                            // Local hammer: just play hit animation but keep it visible/following
                            if (typeof this.martillo.hit === 'function') this.martillo.hit();
                        }
                    }
                }

                // Play sounds / effects depending on hit/miss
                if (data.hit) {
                    if (this.topo && typeof this.topo.hide === 'function') this.topo.hide();
                    this.sound.play('Golpe');
                    this.sound.play('Castor');
                    this.cameras.main.shake(200, 0.01);
                } else {
                    this.sound.play('Sonido_martillo');
                }

                // Update scores if provided
                if (typeof data.player1Score === 'number') this.puntosPlayer1 = data.player1Score;
                if (typeof data.player2Score === 'number') this.puntosPlayer2 = data.player2Score;
                this.updateScoreUI();
                break;
            }

            case 'powerupSpawn':
                // Spawn powerup at hole
                this.spawnPowerupAtHole(data.holeIndex, data.powerupType);
                break;

            case 'powerupPickup':
                // Player picked up powerup
                this.pickupPowerupByPlayer(data.playerId);
                break;

            case 'powerupUse':
                // Player used powerup (server includes powerupType to ensure correct visual/effect)
                this.usePowerupByPlayer(data.playerId, data.powerupType);
                break;

            case 'scoreUpdate':
                // Update scores
                console.log('[Multiplayer] scoreUpdate received', data);
                this.puntosPlayer1 = data.player1Score;
                this.puntosPlayer2 = data.player2Score;
                this.updateScoreUI();
                break;

            case 'timeUpdate':
                // Synchronize time
                this.timeLeft = data.timeLeft;
                this.timerText.setText(this.formatTime(this.timeLeft));
                break;

            case 'gameOver':
                this.endGame(data.winner, data.player1Score, data.player2Score);
                break;

            case 'playerDisconnected':
                this.handleDisconnection();
                break;

            case 'pause':
                if (!this.isGameOver) {
                    this.scene.launch('PauseScene', { originalScene: 'MultiplayerGameScene' });
                    try { this.scene.bringToTop('PauseScene'); } catch (e) {}
                    // Pause the multiplayer scene explicitly so timers stop (pause the correct scene)
                    try { this.scene.pause('MultiplayerGameScene'); } catch (e) {}
                }
                break;

            case 'resume':
                if (!this.isGameOver) {
                    // If another player resumed, close PauseScene if open and resume gameplay
                    try { if (this.scene.isActive('PauseScene')) this.scene.stop('PauseScene'); } catch (e) {}
                    try { this.scene.resume('MultiplayerGameScene'); } catch (e) {}
                }
                break;

            default:
                console.log('Unknown message type:', data.type);
        }
    }

    // ----------------------
    // Helper: pointer handler
    // ----------------------
    handlePointerDown(pointer) {
        if (this.isGameOver || this.playerRole !== 'player1') return;

        const isLeft = pointer.button === 0 || (pointer.event && pointer.event.button === 0);
        const isRight = pointer.button === 2 || (pointer.event && pointer.event.button === 2);

        // Si hay powerup y se clickea sobre él
        if (this.powerup && this.powerup.sprite) {
            const pBounds = this.powerup.sprite.getBounds();
            if (pBounds && pBounds.contains(pointer.x, pointer.y)) {
                if (isLeft) {
                    this.sendMessage({ type: 'powerupPickup', playerId: 1, holeIndex: this.powerupHoleIndex });
                    return;
                }
                if (isRight) {
                    // Si el topo está en el mismo agujero, P2 puede recoger con RMB
                    if (this.topo && this.powerupHoleIndex === this.topo.currentHoleIndex) {
                        this.sendMessage({ type: 'powerupPickup', playerId: 2, holeIndex: this.powerupHoleIndex });
                    }
                    return;
                }
            }
        }

        // Si se hace RMB en otro sitio: usar powerup P1 (Pom)
        if (isRight) {
            this.sendMessage({ type: 'powerupUse', playerId: 1 });
            return;
        }

        // Si LMB: intentar golpear topo (solo en P1)
        if (isLeft) {
            // animación del martillo SIEMPRE que se golpea localmente
            if (this.martillo) {
                this.martillo.hit();
            }

            // Determine holeIndex under pointer (if any)
            const px = (pointer.worldX !== undefined) ? pointer.worldX : pointer.x;
            const py = (pointer.worldY !== undefined) ? pointer.worldY : pointer.y;
            const holeIndex = this.getHoleIndexFromPointer(px, py);

            // Send hit attempt to server including holeIndex and coords
            this.sendMessage({
                type: 'hammerHit',
                holeIndex,
                x: px,
                y: py
            });
        }
    }

    getHoleIndexFromPointer(x, y) {
        if (!this.topoHoles || !this.topoHoles.length) return -1;
        let best = -1;
        let bestDist = Infinity;
        for (let i = 0; i < this.topoHoles.length; i++) {
            const h = this.topoHoles[i];
            const dx = x - h.x;
            const dy = y - (h.y - 10); // powerups sit slightly above
            const d2 = dx * dx + dy * dy;
            if (d2 < bestDist) {
                bestDist = d2;
                best = i;
            }
        }
        // threshold: accept only if within ~80px
        if (bestDist <= 80 * 80) return best;
        return -1;
    }

    handleHammerHit(x, y) {
        // Legacy client-side helper: compute local result for immediate feedback only
        // Server is authoritative and will broadcast the final 'hammerResult'.
        let hit = false;
        let miss = false;

        if (this.topo && this.topo.sprite) {
            const bounds = this.topo.sprite.getBounds();
            const smallerBounds = new Phaser.Geom.Rectangle(
                bounds.x + bounds.width * 0.25,
                bounds.y + bounds.height * 0.25,
                bounds.width * 0.5,
                bounds.height * 0.5
            );
            hit = smallerBounds.contains(x, y) && this.topo.isActive;
        }

        if (!hit && !this.pinBlocked) {
            miss = true;
        }

        // Provide immediate local feedback (no longer sending authoritative result to server)
        if (hit) {
            // visual feedback only - do NOT call this.topo.hide() (server will instruct hide via hammerResult)
            this.sound.play('Golpe');
            this.sound.play('Castor');
            this.cameras.main.shake(200, 0.01);
        } else if (miss) {
            this.sound.play('Sonido_martillo');
        }
    }

    createTopos() {
        this.topoHoles = [
            { x: 200, y: 480 },
            { x: 320, y: 320 },
            { x: 440, y: 480 },
            { x: 560, y: 320 },
            { x: 680, y: 480 },
            { x: 800, y: 320 }
        ];

        this.topo = new Pin(this, 0, this.topoHoles[0].x, this.topoHoles[0].y);
        this.topo.setHoles(this.topoHoles);

        // El Pin (topo) debe manejar su propio pointerdown; lo conectamos aquí de forma segura:
        this.topo.sprite.setInteractive();
        this.topo.sprite.on('pointerdown', (pointer, localX, localY, event) => {
            // Evitar que el evento burbujee al input global
            try { if (event && event.stopPropagation) event.stopPropagation(); } catch (err) { console.warn('stopPropagation failed', err); }
            if (this.isGameOver) return;
            // In multiplayer only allow local pointer hits if this client is Player1 (Pom)
            if (this.topo.isActive && !this.pinBlocked && this.playerRole === 'player1') {
                // Animar el martillo cuando golpea (solo P1 tiene control local)
                if (this.martillo) {
                    this.martillo.hit();
                }

                // Sonidos y efecto (feedback instantáneo)
                this.sound.play('Golpe');
                this.sound.play('Castor');
                this.cameras.main.shake(200, 0.01);

                // Enviar intento de golpe al servidor para que el flujo de puntuación ocurra (server autoritativo)
                try {
                    this.sendMessage({
                        type: 'hammerHit',
                        holeIndex: this.topo.currentHoleIndex,
                        x: (pointer.worldX !== undefined) ? pointer.worldX : pointer.x,
                        y: (pointer.worldY !== undefined) ? pointer.worldY : pointer.y
                    });
                } catch (err) {
                    console.warn('Failed to send hammerHit from topo pointer:', err);
                }
            }
        });

        // Timer de aparición del topo (popUp cada X ms si está escondido)
        this.topoTimer = this.time.addEvent({
            delay: 1500,
            loop: true,
            callback: () => {
                if (this.isGameOver) return;
                if (!this.topo.isActive) {
                    this.topo.popUp();
                }
            }
        });
    }

    endGame(winner, player1Score, player2Score) {
        this.isGameOver = true;
        this.sound.stopAll();

        if (this.game?.canvas?.style) {
            this.game.canvas.style.cursor = 'auto';
        }

        // Desactivar input del juego (NO borrar listeners)
        this.input.enabled = false;

        if (this.martillo?.setVisible) this.martillo.setVisible(false);
        if (this.topoTimer) this.topoTimer.remove(false);
        if (this.gameTimer) this.gameTimer.remove(false);

        if (this.topo?.sprite) {
            this.topo.sprite.disableInteractive();
            this.topo.hide();
        }

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        // ----------------------
        // Overlay
        // ----------------------
        this.add.rectangle(
            cx,
            cy,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.6
        ).setDepth(100);

        // ----------------------
        // Panel
        // ----------------------
        const panel = this.add.rectangle(cx, cy, 700, 380, 0x0b1220, 0.95)
            .setStrokeStyle(4, 0x1f6feb)
            .setDepth(200)
            .setScale(0.8);

        this.tweens.add({
            targets: panel,
            scale: 1,
            duration: 300,
            ease: 'Back.Out'
        });

        // ----------------------
        // Texto ganador
        // ----------------------
        let winnerText = 'Empate 🤝';
        let color = '#ffffff';

        if (player1Score > player2Score) {
            winnerText = '🏆 Gana Pom';
            color = '#6c8bff';
        } else if (player2Score > player1Score) {
            winnerText = '🏆 Gana Pin';
            color = '#ff6b6b';
        }

        this.add.text(cx, cy - 120, winnerText, {
            fontSize: '38px',
            fontStyle: 'bold',
            color,
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(300);

        this.add.text(cx, cy - 40, `Pom: ${player1Score}`, {
            fontSize: '26px',
            color: '#6c8bff'
        }).setOrigin(0.5).setDepth(300);

        this.add.text(cx, cy, `Pin: ${player2Score}`, {
            fontSize: '26px',
            color: '#ff6b6b'
        }).setOrigin(0.5).setDepth(300);

        // Reactivar input SOLO para UI
        this.input.enabled = true;

        // ----------------------
        // BOTONES (DESDE CERO)
        // ----------------------
        const btnW = 220;
        const btnH = 60;

        const createButton = (x, y, text, baseColor, hoverColor, onClick) => {

            // BOTÓN = RECTANGLE INTERACTIVO
            const btn = this.add.rectangle(x, y, btnW, btnH, baseColor)
                .setOrigin(0.5)
                .setDepth(400)
                .setInteractive({ useHandCursor: true });

            btn.setStrokeStyle(2, 0x0a2740);

            const label = this.add.text(x, y, text, {
                fontSize: '22px',
                fontStyle: 'bold',
                color: '#00131d',
                fontFamily: 'Arial'
            }).setOrigin(0.5).setDepth(401);

            // Hover
            btn.on('pointerover', () => {
                btn.setFillStyle(hoverColor);
                label.setColor('#ffffff');
            });

            btn.on('pointerout', () => {
                btn.setFillStyle(baseColor);
                label.setColor('#00131d');
            });

            // Click
            btn.on('pointerdown', () => {
                if (this.sound.get('Boton')) {
                    this.sound.play('Boton', { volume: 0.5 });
                }

                this.tweens.add({
                    targets: btn,
                    scale: 0.95,
                    yoyo: true,
                    duration: 80,
                    onComplete: onClick
                });
            });
        };

        const btnY = cy + 120;

       

        createButton(
            cx + 130,
            btnY,
            'Menú Principal',
            0xffdba8,
            0xffb57a,
            () => this.scene.start('MenuScene')
        );

        // Teclado
        this.input.keyboard.once('keydown-ENTER', () => this.scene.restart());
        this.input.keyboard.once('keydown-ESC', () => this.scene.start('MenuScene'));
    }

    handleDisconnection() {
        this.isGameOver = true;
        this.sound.stopAll();

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        this.add.text(cx, cy, 'Opponent Disconnected', {
            fontSize: '48px',
            color: '#ff0000'
        }).setOrigin(0.5).setDepth(2000);

        // Give a short pause for the message, then return to lobby/menu
        setTimeout(() => {
            try {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.close();
            } catch (e) {}
            this.scene.start('MenuScene');
        }, 1200);
    }

    createMenuButton() {
        const menuBtn = this.add.text(400, 400, 'Return to Main Menu', {
            fontSize: '32px',
            color: '#ffffff',
        }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => menuBtn.setColor('#cccccc'))
        .on('pointerout', () => menuBtn.setColor('#ffffff'))
        .on('pointerdown', () => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }
            this.scene.start('MenuScene');
        });
    }

    // Powerups

    scheduleNextPowerup() {
        if (this.isGameOver) return;
        if (this.powerup) return;
        // Spawn only if at least one player can store another powerup
        const p1CanStore = this.powerupStoredP1.length < this.powerupMaxStoredP1;
        const p2CanStore = this.powerupStoredP2.length < this.powerupMaxStoredP2;
        if (!p1CanStore && !p2CanStore) return;

        const delay = Phaser.Math.Between(this.powerupSpawnMin, this.powerupSpawnMax);
        this.time.delayedCall(delay, () => {
            if (this.isGameOver) return;
            // Server will spawn powerup
            this.sendMessage({ type: 'requestPowerupSpawn' });
        });
    }

    spawnPowerupAtHole(holeIndex, powerupType) {
        if (!this.topoHoles || holeIndex < 0 || holeIndex >= this.topoHoles.length) return;
        if (this.powerup) return;

        const pos = this.topoHoles[holeIndex];

        let spriteKey;
        let scale = 0.45; // escala por defecto para reloj
        if (powerupType === POWERUP_CLOCK) {
            spriteKey = 'reloj';
        } else if (powerupType === POWERUP_THERMOMETER) {
            spriteKey = 'termometro';
            scale = 0.30; // escala más grande para termómetro
        }

        this.powerup = this.add.image(pos.x, pos.y - 10, spriteKey).setScale(scale).setDepth(8);
        this.currentPowerupType = powerupType;
        this.powerupHoleIndex = holeIndex;
        this.powerup.setInteractive({ useHandCursor: true });

        // Evento click en powerup: Jugador 1 (P1) (LMB) recoge
        this.powerup.on('pointerdown', (pointer) => {
            if (this.isGameOver) return;
            const isLeft = pointer.button === 0 || (pointer.event && pointer.event.button === 0);
            if (isLeft && this.playerRole === 'player1') {
                this.sendMessage({ type: 'powerupPickup', playerId: 1, holeIndex: this.powerupHoleIndex });
                this.sound.play('Boton');
            }
        });

        // flotación sutil
        this.tweens.add({
            targets: this.powerup,
            y: pos.y - 16,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // expiración del powerup
        this.time.delayedCall(this.powerupDuration, () => {
            if (!this.powerup) return;
            this.powerup.destroy();
            this.powerup = null;
            this.powerupHoleIndex = -1;
            this.scheduleNextPowerup();
        });
    }

    pickupPowerupByPlayer(playerId) {
        if (!this.powerup) return false;
        if (this.isGameOver) return false;

        // Termómetro solo puede ser recogido por Pom (P2)
        if (this.currentPowerupType === POWERUP_THERMOMETER && playerId !== 2) return false;

        if (playerId === 1) {
            if (this.powerupsUsedP1 >= 3) return false;
            if (this.powerupStoredP1.length >= this.powerupMaxStoredP1) return false;
            this.powerupStoredP1.push(this.currentPowerupType);
        } else {
            if (this.powerupsUsedP2 >= 3) return false;
            if (this.powerupStoredP2.length >= this.powerupMaxStoredP2) return false;
            this.powerupStoredP2.push(this.currentPowerupType);
        }

        // Sonido al recoger powerup
        if (this.sound.get('Boton')) this.sound.play('Boton');

        // Update UI
        this.updatePowerupUI();

        // Destroy powerup and schedule next spawn
        if (this.powerup) {
            this.powerup.destroy();
            this.powerup = null;
            this.powerupHoleIndex = -1;
        }
        this.scheduleNextPowerup();
        return true;
    }

    usePowerupByPlayer(playerId, forcedPowerupType = undefined) {
        if (this.isGameOver) return false;

        let powerupType;
        // If the server forced a powerupType (broadcasted), use that; otherwise pop local stored one
        if (typeof forcedPowerupType === 'string') {
            powerupType = forcedPowerupType;
            // remove one instance from local store if present (safe cleanup)
            const store = (playerId === 1) ? this.powerupStoredP1 : this.powerupStoredP2;
            const idx = store.indexOf(powerupType);
            if (idx !== -1) store.splice(idx, 1);
        } else {
            if (playerId === 1) {
                if (this.powerupStoredP1.length <= 0) return false;
                powerupType = this.powerupStoredP1.pop();
            } else {
                if (this.powerupStoredP2.length <= 0) return false;
                powerupType = this.powerupStoredP2.pop();
            }
        }

        // Apply effect based on type
        if (powerupType === POWERUP_CLOCK) {
            // Aumentar tiempo (server-authoritative is preferred)
            this.timerText.setText(this.formatTime(this.timeLeft));
        } else if (powerupType === POWERUP_THERMOMETER) {
            // Activar efecto del termómetro (visual + block locally, scoring is server-authoritative)
            this.thermometerEffectActive = true;
            this.pinBlocked = true;

            //sonido de frio
            this.sound.play('Frio');

            // Crear overlay azul claro que cubre toda la pantalla
            const overlay = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                this.scale.width,
                this.scale.height,
                0x87CEEB, // Sky blue / azul claro
                0.4 // alfa 40% para que se vea de fondo pero transparente
            ).setDepth(10); // por encima de la mayoría de objetos pero no de UI crítica

            // Do NOT award points locally here; server will send scoreUpdate ticks
            this.time.delayedCall(4000, () => {
                this.thermometerEffectActive = false;
                this.pinBlocked = false;
                // Eliminar el overlay al terminar
                if (overlay) {
                    overlay.destroy();
                }
            });
        }

        // feedback visual y sonoro
        this.cameras.main.flash(150, 100, 255, 100);
        if (this.sound.get('Boton')) this.sound.play('Boton');

        // actualizar UI
        this.updatePowerupUI();

        // incrementar contador de powerups usados
        if (playerId === 1) {
            this.powerupsUsedP1++;
        } else {
            this.powerupsUsedP2++;
        }

        return true;
    }

    // ----------------------
    // UI update helpers
    // ----------------------
    updateScoreUI() {
        // Consistencia con asignación: P1 = Pom, P2 = Pin
        if (this.scorePlayer1) this.scorePlayer1.setText(`Pom: ${this.puntosPlayer1}`);
        if (this.scorePlayer2) this.scorePlayer2.setText(`Pin: ${this.puntosPlayer2}`);
    }

    updatePowerupUI() {
        if (this.powerupTextP1) this.powerupTextP1.setText(`P1 Powerups: ${this.powerupStoredP1.length}/${this.powerupMaxStoredP1}`);
        if (this.powerupTextP2) this.powerupTextP2.setText(`P2 Powerups: ${this.powerupStoredP2.length}/${this.powerupMaxStoredP2}`);
    }

    // ----------------------
    // Format time helper
    // ----------------------
    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // ----------------------
    // Update loop
    // ----------------------
    update() {
        if (this.isGameOver){
            return;
        }
        
    if (this.isGameOver) return;

    // 🔨 mover martillo con el ratón (SOLO P1)
    if (this.playerRole === 'player1' && this.martillo) {
        this.martillo.setPosition(
            this.input.activePointer.worldX,
            this.input.activePointer.worldY
        );
        // Send hammer position to server (throttle to ~20Hz)
        const now = Date.now();
        if (!this._lastHammerSentTime) this._lastHammerSentTime = 0;
        if (now - this._lastHammerSentTime > 50) {
            this.sendMessage({ type: 'hammerMove', x: this.martillo.x, y: this.martillo.y, angle: this.martillo.angle || 0 });
            this._lastHammerSentTime = now;
        }
    }

    // Smooth remote hammer movement (interpolate towards latest target)
    if (this.playerRole !== 'player1' && this.martillo && this._remoteHammerTarget) {
        const t = 0.2; // interpolation factor (0..1)
        this.martillo.x += (this._remoteHammerTarget.x - this.martillo.x) * t;
        this.martillo.y += (this._remoteHammerTarget.y - this.martillo.y) * t;
        // smooth rotation if available
        const targetAngle = this._remoteHammerTarget.angle || 0;
        if (typeof this.martillo.setAngle === 'function') {
            const current = this.martillo.angle || 0;
            const na = current + (targetAngle - current) * 0.25;
            try { this.martillo.setAngle(na); } catch (e) { this.martillo.angle = na; }
        } else {
            this.martillo.angle = (this.martillo.angle || 0) + (targetAngle - (this.martillo.angle || 0)) * 0.25;
        }
    }

        // Player 2 controls mole movement with keyboard
        if (this.playerRole === 'player2' && this.topo) {
            if (this.keys.one.isDown) {
                this.topo.moveToHole(0);
                this.sendMessage({ type: 'moleMove', holeIndex: 0 });
            }
            if (this.keys.two.isDown) {
                this.topo.moveToHole(1);
                this.sendMessage({ type: 'moleMove', holeIndex: 1 });
            }
            if (this.keys.three.isDown) {
                this.topo.moveToHole(2);
                this.sendMessage({ type: 'moleMove', holeIndex: 2 });
            }
            if (this.keys.four.isDown) {
                this.topo.moveToHole(3);
                this.sendMessage({ type: 'moleMove', holeIndex: 3 });
            }
            if (this.keys.five.isDown) {
                this.topo.moveToHole(4);
                this.sendMessage({ type: 'moleMove', holeIndex: 4 });
            }
            if (this.keys.six.isDown) {
                this.topo.moveToHole(5);
                this.sendMessage({ type: 'moleMove', holeIndex: 5 });
            }
        }

        // ESC para pausar
        if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
            if (!this.isGameOver) {
                // Notify opponent and pause locally
                this.sendMessage({ type: 'pause' });
                this.scene.launch('PauseScene', { originalScene: 'MultiplayerGameScene' });
                // Ensure PauseScene is above everything and pause this scene by key
                try { this.scene.bringToTop('PauseScene'); } catch (e) {}
                this.scene.pause('MultiplayerGameScene');
            }
        }

        // SPACE para usar powerup P2
        if (Phaser.Input.Keyboard.JustDown(this.keys.space) && this.playerRole === 'player2') {
            this.sendMessage({ type: 'powerupUse', playerId: 2 });
        }
    }

    endRound() {
        this.isGameOver = true;
        this.sound.stopAll();

        if (this.game?.canvas?.style) {
            this.game.canvas.style.cursor = 'auto';
        }

        // Desactivar input del juego
        this.input.enabled = false;

        if (this.martillo?.setVisible) this.martillo.setVisible(false);
        if (this.topoTimer) this.topoTimer.remove(false);
        if (this.gameTimer) this.gameTimer.remove(false);

        if (this.topo?.sprite) {
            this.topo.sprite.disableInteractive();
            this.topo.hide();
        }

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        // ----------------------
        // Overlay
        // ----------------------
        this.add.rectangle(
            cx,
            cy,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.6
        ).setDepth(100);

        // ----------------------
        // Panel
        // ----------------------
        const panel = this.add.rectangle(cx, cy, 700, 380, 0x0b1220, 0.95)
            .setStrokeStyle(4, 0x1f6feb)
            .setDepth(200)
            .setScale(0.8);

        this.tweens.add({
            targets: panel,
            scale: 1,
            duration: 300,
            ease: 'Back.Out'
        });

        // ----------------------
        // Texto ganador
        // ----------------------
        let winnerText = 'Empate 🤝';
        let color = '#ffffff';

        if (this.puntosPlayer1 > this.puntosPlayer2) {
            winnerText = '🏆 Gana Jugador 1 (Pom)';
            color = '#6c8bff';
        } else if (this.puntosPlayer2 > this.puntosPlayer1) {
            winnerText = '🏆 Gana Jugador 2 (Pin)';
            color = '#ff6b6b';
        }

        this.add.text(cx, cy - 120, winnerText, {
            fontSize: '38px',
            fontStyle: 'bold',
            color,
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(300);

        this.add.text(cx, cy - 40, `P1 (Pom): ${this.puntosPlayer1}`, {
            fontSize: '26px',
            color: '#6c8bff'
        }).setOrigin(0.5).setDepth(300);

        this.add.text(cx, cy, `P2 (Pin): ${this.puntosPlayer2}`, {
            fontSize: '26px',
            color: '#ff6b6b'
        }).setOrigin(0.5).setDepth(300);

        // Reactivar input SOLO para UI
        this.input.enabled = true;

        // ----------------------
        // BOTONES
        // ----------------------
        const btnW = 220;
        const btnH = 60;

        const createButton = (x, y, text, baseColor, hoverColor, onClick) => {
            const btn = this.add.rectangle(x, y, btnW, btnH, baseColor)
                .setOrigin(0.5)
                .setDepth(400)
                .setInteractive({ useHandCursor: true });

            btn.setStrokeStyle(2, 0x0a2740);

            const label = this.add.text(x, y, text, {
                fontSize: '22px',
                fontStyle: 'bold',
                color: '#00131d',
                fontFamily: 'Arial'
            }).setOrigin(0.5).setDepth(401);

            btn.on('pointerover', () => {
                btn.setFillStyle(hoverColor);
                label.setColor('#ffffff');
            });

            btn.on('pointerout', () => {
                btn.setFillStyle(baseColor);
                label.setColor('#00131d');
            });

            btn.on('pointerdown', () => {
                if (this.sound.get('Boton')) {
                    this.sound.play('Boton', { volume: 0.5 });
                }

                this.tweens.add({
                    targets: btn,
                    scale: 0.95,
                    yoyo: true,
                    duration: 80,
                    onComplete: onClick
                });
            });
        };

        const btnY = cy + 120;

        createButton(
            cx - 130,
            btnY,
            'Volver al Lobby',
            0x88e1ff,
            0x4fb0ff,
            () => this.scene.start('LobbyScene')
        );

        createButton(
            cx + 100,
            btnY,
            'Menú Principal',
            0xffdba8,
            0xffb57a,
            () => this.scene.start('MenuScene')
        );

        // Teclado
        this.input.keyboard.once('keydown-ENTER', () => this.scene.start('LobbyScene'));
        this.input.keyboard.once('keydown-ESC', () => this.scene.start('MenuScene'));
    }

    // ----------------------
    // Resume handler
    // ----------------------
    onResume() {
    if (this.game && this.game.canvas && this.game.canvas.style) {
        this.game.canvas.style.cursor = 'none';
    }

    if (this.playerRole === 'player1') {
        // 🔒 eliminamos cualquier listener previo
        this.input.off('pointerdown');

        // ✅ añadimos uno solo
        this.input.on('pointerdown', (pointer) => {
            this.handlePointerDown(pointer);
        });
    }
}


    sendMessage(message) {
        try {
            console.log('[MultiplayerClient] sendMessage', message);
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(message));
            }
        } catch (e) {
            console.warn('[MultiplayerClient] sendMessage failed', e);
        }
    }

    shutdown() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
    }
}
