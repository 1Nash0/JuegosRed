// src/scenes/GameScene.js
import Phaser from 'phaser';
import { Pom } from '../entities/Pom';
import { Pin } from '../entities/Pin';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init() {
    // Game state
    this.timeLeft = 60; // segundos
    this.isGameOver = false;

    // Scores (Opción A: Jugador 1 = Pom, Jugador 2 = Pin)
    this.puntosPlayer1 = 0; // Pom
    this.puntosPlayer2 = 0; // Pin

    // Powerup config & state
    this.powerupAmount = 20;
    this.powerupMaxStored = 3;
    this.powerupStoredP1 = 0;
    this.powerupStoredP2 = 0;

    this.powerup = null;
    this.powerupHoleIndex = -1;
    this.powerupDuration = 5000;
    this.powerupSpawnMin = 4000;
    this.powerupSpawnMax = 12000;

    // timers / references
    this.topoTimer = null;
    this.gameTimer = null;
  }

  preload() {
    // IMÁGENES
    this.load.image('fondo', 'assets/fondo_game.png');
    this.load.image('Martillo', 'assets/mazo.png');
    this.load.image('bojack', 'assets/pin.png');
    this.load.image('reloj', 'assets/reloj.png');
    this.load.image('agujero', 'assets/agujero.png');

    // SONIDOS
    this.load.audio('Musica_nivel', 'assets/Sonidos para_red/Hydrogen.mp3');
    this.load.audio('Castor', 'assets/Sonidos para_red/Castor.mp3');
    this.load.audio('Golpe', 'assets/Sonidos para_red/Golpe.mp3');
    this.load.audio('Fin_partida', 'assets/Sonidos para_red/Miami.mp3');
    this.load.audio('Sonido_martillo', 'assets/Sonidos para_red/Martillo_juez.mp3');
    this.load.audio('Boton', 'assets/Sonidos para_red/Boton.mp3');
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

    // Sonido de fondo
   this.musicaNivel = this.sound.add('Musica_nivel');
this.musicaNivel.play({ loop: true, volume: 0.5 });


    // Cursor: ocultamos por defecto; la entidad Pom puede mostrar su propio sprite
    this.input.mouse.disableContextMenu();
    this.game.canvas.style.cursor = 'none';

    // Martillo que sigue al ratón (Pom)
  this.martillo = new Pom(
  this,
  'Martillo',
  this.input.activePointer.x,
  this.input.activePointer.y
);


    // Scores (consistentes con Opción A)
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
    this.powerupTextP1 = this.add.text(80, 80, `P1 Powerups: ${this.powerupStoredP1}/${this.powerupMaxStored}`, {
      fontSize: '16px',
      color: '#6a7cb4ff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0, 0);

    this.powerupTextP2 = this.add.text(this.scale.width + 20, 80, `P2 Powerups: ${this.powerupStoredP2}/${this.powerupMaxStored}`, {
      fontSize: '16px',
      color: '#9e4b4bff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(1.5, 0);

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
    this.events.on('resume', this.onResume, this);

    // Crear topo (Pin)
    this.createTopos();

    // Start powerup spawns
    this.scheduleNextPowerup();

    // Evento topo popped: recoge el powerup automáticamente para P2 si coincide
    this.events.off('topoPopped'); // aseguramos que no haya duplicados
    this.events.on('topoPopped', (data = {}) => {
      if (this.isGameOver) return;
      if (this.powerup && this.powerupHoleIndex === data.holeIndex) {
        // Si el topo aparece exactamente en el powerup -> se recoge para P2 (Pin)
        this.pickupPowerupByPlayer(2);
      }
    });

    // Input pointer: manejador único
    this.input.on('pointerdown', (pointer) => this.handlePointerDown(pointer));

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

    // Aseguramos que los textos y UI estén sincronizados
    this.updateScoreUI();
    this.updatePowerupUI();
  }

  // ----------------------
  // Helper: pointer handler
  // ----------------------
  handlePointerDown(pointer) {
    if (this.isGameOver) return;

    const isLeft = pointer.button === 0 || (pointer.event && pointer.event.button === 0);
    const isRight = pointer.button === 2 || (pointer.event && pointer.event.button === 2);

    // Si hay powerup y se clickea sobre él
    if (this.powerup && this.powerup.sprite) {
      const pBounds = this.powerup.sprite.getBounds();
      if (pBounds && pBounds.contains(pointer.x, pointer.y)) {
        if (isLeft) {
          this.pickupPowerupByPlayer(1); // Pom recoge con LMB
          return;
        }
        if (isRight) {
          // Si el topo está en el mismo agujero, P2 puede recoger con RMB
          if (this.topo && this.powerupHoleIndex === this.topo.currentHoleIndex) {
            this.pickupPowerupByPlayer(2);
          }
          return;
        }
      }
    }

    // Si se hace RMB en otro sitio: usar powerup P1
    if (isRight) {
      this.usePowerupByPlayer(1);
      return;
    }

    // Si LMB: intentar golpear topo (si está activo) — si fallas, punto para jugador 2 (Pin)
    if (isLeft) {

  // animación del martillo SIEMPRE que se golpea
  if (this.martillo) {
    this.martillo.hit();
  }

  if (!this.topo || !this.topo.sprite) return;

  const bounds = this.topo.sprite.getBounds();
  const clickedTopo = bounds && bounds.contains(pointer.x, pointer.y);

  if (clickedTopo && this.topo.isActive) {
    // Golpe exitoso
    this.puntosPlayer1 += 1;
    this.updateScoreUI();
    this.topo.hide();
    this.sound.play('Golpe');
    this.sound.play('Castor');
    this.cameras.main.shake(200, 0.01);
    return;
  } else {
    // Fallo
    this.puntosPlayer2 += 1;
    this.updateScoreUI();
    this.sound.play('Sonido_martillo');
  }
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
    this.topo.sprite.on('pointerdown', () => {
      if (this.isGameOver) return;
      if (this.topo.isActive) {
        // Golpe exitoso -> punto para jugador 1 (Pom)
        this.puntosPlayer1 += 1;
        this.updateScoreUI();

        // Oculta topo, reproduce sonidos y efecto
        this.topo.hide();
        this.sound.play('Golpe');
        this.sound.play('Castor');
        

        this.cameras.main.shake(200, 0.01);
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

  
  // Powerups

  scheduleNextPowerup() {
    if (this.isGameOver) return;
    if (this.powerup) return;
    if (this.powerupMaxStored <= 0) return; // No programar si máximo es 0

    const delay = Phaser.Math.Between(this.powerupSpawnMin, this.powerupSpawnMax);
    this.time.delayedCall(delay, () => {
      if (this.isGameOver) return;
      this.spawnPowerupAtRandomHole();
    });
  }

  spawnPowerupAtRandomHole() {
    if (!this.topoHoles || !this.topoHoles.length) return;
    if (this.powerup) return;

    const index = Phaser.Math.Between(0, this.topoHoles.length - 1);
    const pos = this.topoHoles[index];

    const spriteKey = 'reloj';
    this.powerup = this.add.image(pos.x, pos.y - 10, spriteKey).setScale(0.15).setDepth(8);

    this.powerupHoleIndex = index;
    this.powerup.setInteractive({ useHandCursor: true });

    // Evento click en powerup: Jugador 1 (LMB) recoge
    this.powerup.on('pointerdown', (pointer) => {
      if (this.isGameOver) return;
      const isLeft = pointer.button === 0 || (pointer.event && pointer.event.button === 0);
      if (isLeft) {
        this.pickupPowerupByPlayer(1);
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

    if (playerId === 1) {
      if (this.powerupStoredP1 >= this.powerupMaxStored) return false;
      this.powerupStoredP1 += 1;
    } else {
      if (this.powerupStoredP2 >= this.powerupMaxStored) return false;
      this.powerupStoredP2 += 1;
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

  usePowerupByPlayer(playerId) {
    if (this.isGameOver) return false;

    if (playerId === 1) {
      if (this.powerupStoredP1 <= 0) return false;
      this.powerupStoredP1 -= 1;
      // Reducir máximo disponible
      if (this.powerupMaxStored > 0) this.powerupMaxStored -= 1;
    } else {
      if (this.powerupStoredP2 <= 0) return false;
      this.powerupStoredP2 -= 1;
      // Reducir máximo disponible
      if (this.powerupMaxStored > 0) this.powerupMaxStored -= 1;
    }

    // Apply effect: aumentar tiempo
    this.timeLeft += this.powerupAmount;
    this.timerText.setText(this.formatTime(this.timeLeft));

    // feedback visual y sonoro
    this.cameras.main.flash(150, 100, 255, 100);
    if (this.sound.get('Boton')) this.sound.play('Boton');

    // actualizar UI
    this.updatePowerupUI();

    return true;
  }

  // ----------------------
  // UI update helpers
  // ----------------------
  updateScoreUI() {
    // Consistencia con Opción A
    if (this.scorePlayer1) this.scorePlayer1.setText(`Pom: ${this.puntosPlayer1}`);
    if (this.scorePlayer2) this.scorePlayer2.setText(`Pin: ${this.puntosPlayer2}`);
  }

  updatePowerupUI() {
    if (this.powerupTextP1) this.powerupTextP1.setText(`P1 Powerups: ${this.powerupStoredP1}/${this.powerupMaxStored}`);
    if (this.powerupTextP2) this.powerupTextP2.setText(`P2 Powerups: ${this.powerupStoredP2}/${this.powerupMaxStored}`);
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
    if (this.isGameOver) return;

    // Manejo teclas 1-5: mover topo (solo si topo está disponible)
    if (this.topo) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.one)) this.topo.moveToHole(0);
      if (Phaser.Input.Keyboard.JustDown(this.keys.two)) this.topo.moveToHole(1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.three)) this.topo.moveToHole(2);
      if (Phaser.Input.Keyboard.JustDown(this.keys.four)) this.topo.moveToHole(3);
      if (Phaser.Input.Keyboard.JustDown(this.keys.five)) this.topo.moveToHole(4);
      if (Phaser.Input.Keyboard.JustDown(this.keys.six)) this.topo.moveToHole(5);
    }

    // ESC para pausar
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      if (!this.isGameOver) {
        this.scene.launch('PauseScene', { originalScene: 'GameScene' });
        this.scene.pause();
      }
    }

    // SPACE para usar powerup P2
    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      this.usePowerupByPlayer(2);
    }
  }

  // ----------------------
  // End round (pantalla final)
  // ----------------------
endRound() {
  this.isGameOver = true;
  this.sound.stopAll();
  //this.sound.play('Fin_partida', { volume: 0.5 });

  // Mostrar cursor
  if (this.game && this.game.canvas && this.game.canvas.style) {
    this.game.canvas.style.cursor = 'auto';
  }

  // Desactivar input general
  this.input.off('pointerdown');

  // Ocultar martillo
  if (this.martillo && this.martillo.setVisible) {
    this.martillo.setVisible(false);
  }

  // Detener timers
  if (this.topoTimer) this.topoTimer.remove(false);
  if (this.gameTimer) this.gameTimer.remove(false);

  if (this.topo && this.topo.sprite) {
    this.topo.sprite.disableInteractive();
    this.topo.hide();
  }

  // Coordenadas
  const cx = this.scale.width / 2;
  const cy = this.scale.height / 2;

  // Panel
  const panel = this.add.rectangle(cx, cy, 760, 420, 0x0b1220, 0.88)
    .setOrigin(0.5)
    .setDepth(200);
  panel.setStrokeStyle(4, 0x1f6feb);
  panel.scale = 0.85;

  this.tweens.add({
    targets: panel,
    scale: 1,
    duration: 220,
    ease: 'Back.Out'
  });

  // IMPORTANTE: el panel NO debe ser interactivo
  panel.disableInteractive();

  // Winner text
  let winnerText = 'Empate';
  if (this.puntosPlayer1 > this.puntosPlayer2) winnerText = '🏆   Gana Jugador 1 (Pom)';
  else if (this.puntosPlayer2 > this.puntosPlayer1) winnerText = '🏆   Gana Jugador 2 (Pin)';

  this.add.text(cx, cy - 130, winnerText, {
    fontSize: '42px',
    fontStyle: 'bold',
    color: '#ffffff',
    fontFamily: 'Arial'
  }).setOrigin(0.5).setDepth(250);

  this.add.rectangle(cx, cy - 90, 420, 3, 0x1f6feb)
    .setOrigin(0.5)
    .setDepth(250);

  // Stats
  this.add.text(cx, cy - 20, `P1 (Pom): ${this.puntosPlayer1}`, {
    fontSize: '26px',
    color: '#6c8bff',
    fontFamily: 'Arial'
  }).setOrigin(0.5).setDepth(250);

  this.add.text(cx, cy + 20, `P2 (Pin): ${this.puntosPlayer2}`, {
    fontSize: '26px',
    color: '#ff6b6b',
    fontFamily: 'Arial'
  }).setOrigin(0.5).setDepth(250);

 

  const btnW = 240;
  const btnH = 62;

  const createBtn = (x, y, text, baseColor, hoverColor, callback) => {
    // fondo visible
    const bg = this.add.rectangle(0, 0, btnW, btnH, baseColor)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x0a2740)
      .setDepth(305);

    const label = this.add.text(0, 0, text, {
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#00131d',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(306);

    // Zona interactiva transparente EXACTAMENTE del mismo tamaño que el bg
    const hit = this.add.rectangle(0, 0, btnW, btnH, 0x000000, 0)
      .setOrigin(0.5)
      .setDepth(307)
      .setInteractive(new Phaser.Geom.Rectangle(-btnW/2, -btnH/2, btnW, btnH), Phaser.Geom.Rectangle.Contains);

    const container = this.add.container(x, y, [bg, label, hit]);
    container.setSize(btnW, btnH);
    container.setInteractive();
    container.setDepth(300);

    // Hover usando el hitbox (coincide siempre con la apariencia)
    hit.on('pointerover', () => {
        bg.setFillStyle(hoverColor);
        label.setColor('#ffffff');

        this.tweens.killTweensOf(bg);
        this.tweens.add({
          targets: bg,
          scaleX: 1.06,
          scaleY: 1.06,
          duration: 120,
          ease: 'Power2'
        });

        this.game.canvas.style.cursor = 'pointer';
      });

      hit.on('pointerout', () => {
        bg.setFillStyle(baseColor);
        label.setColor('#00131d');

        this.tweens.killTweensOf(bg);
        this.tweens.add({
          targets: bg,
          scaleX: 1,
          scaleY: 1,
          duration: 120,
          ease: 'Power2'
        });

        this.game.canvas.style.cursor = 'auto';
      });

      hit.on('pointerdown', () => {
        if (this.sound.get('Boton')) this.sound.play('Boton', { volume: 0.5 });
        callback();
      });

      return container;
  };

  const btnY = cy + 120;

  createBtn(
    cx - 150, 
    btnY,
    "Repetir",
    0x88e1ff,    // base
    0x4fb0ff,    // hover
    () => this.scene.restart(),
    
  );

  createBtn(
    cx + 150,
    btnY,
    "Menú Principal",
    0xffdba8,   // base
    0xffb57a,   // hover
    () => this.scene.start('MenuScene')
  );
}


  // ----------------------
  // Resume handler 
  // ----------------------
  onResume() {
    if (this.game && this.game.canvas && this.game.canvas.style) {
      this.game.canvas.style.cursor = 'none';
    }
    // reactivar input pointer
    this.input.on('pointerdown', (pointer) => this.handlePointerDown(pointer));
  }
}
