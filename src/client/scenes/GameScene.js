// src/scenes/GameScene.js
import Phaser from 'phaser';
import { Pom } from '../entities/Pom';
import { Pin } from '../entities/Pin';

const POWERUP_CLOCK = 'clock';
const POWERUP_THERMOMETER = 'thermometer';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init() {
    // Game state
    this.timeLeft = 6; // segundos
    this.isGameOver = false;

    // Scores
    this.puntosPlayer1 = 0; // Pom
    this.puntosPlayer2 = 0; // Pin

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
    this.load.image('fondo', 'assets/fondo_game.png');
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

    // Evento topo missed: cuando el topo desaparece sin ser golpeado, punto para P2
    this.events.off('topoMissed'); // aseguramos que no haya duplicados
    this.events.on('topoMissed', (_data = {}) => {
      if (this.isGameOver) return;
      if (!this.pinBlocked) {
        this.puntosPlayer2 += 1;
        this.updateScoreUI();
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
          this.pickupPowerupByPlayer(1); // Pin recoge con LMB
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

    // Si se hace RMB en otro sitio: usar powerup P1 (Pom)
    if (isRight) {
      this.usePowerupByPlayer(1);
      return;
    }

    // Si LMB: intentar golpear topo (si está activo) — si fallas, punto para jugador 2 (Pom)
    if (isLeft) {

  // animación del martillo SIEMPRE que se golpea
  if (this.martillo) {
    this.martillo.hit();
  }

  if (!this.topo || !this.topo.sprite) return;

  const bounds = this.topo.sprite.getBounds();
  const smallerBounds = new Phaser.Geom.Rectangle(
    bounds.x + bounds.width * 0.25,
    bounds.y + bounds.height * 0.25,
    bounds.width * 0.5,
    bounds.height * 0.5
  );
  const clickedTopo = smallerBounds.contains(pointer.x, pointer.y);

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
    if (!this.pinBlocked) {
      this.puntosPlayer2 += 1;
      this.updateScoreUI();
      this.sound.play('Sonido_martillo');
    }
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
    this.topo.sprite.on('pointerdown', (pointer, localX, localY, event) => {
      // Evitar que el evento burbujee al input global
      try { if (event && event.stopPropagation) event.stopPropagation(); } catch (err) { console.warn('stopPropagation failed', err); }
      if (this.isGameOver) return;
      if (this.topo.isActive && !this.pinBlocked) {
        // Golpe exitoso -> punto para jugador 1 (Pom)
        this.puntosPlayer1 += 1;
        this.updateScoreUI();

        // Animar el martillo cuando golpea
        if (this.martillo) {
          this.martillo.hit();
        }

        // Marcar el topo como golpeado y procesar el golpe
        if (typeof this.topo.hit === 'function') {
          this.topo.hit();
        } else {
          this.topo.hide();
        }

        // Sonidos y efecto
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
    if (this.powerupMaxStoredP1 <= 0) return;
    if (this.powerupMaxStoredP2 <= 0) return;

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

    // Elegir tipo aleatoriamente
    const powerupTypes = [POWERUP_CLOCK, POWERUP_THERMOMETER];
    this.currentPowerupType = powerupTypes[Phaser.Math.Between(0, powerupTypes.length - 1)];

    let spriteKey;
    let scale = 0.45; // escala por defecto para reloj
    if (this.currentPowerupType === POWERUP_CLOCK) {
      spriteKey = 'reloj';
    } else if (this.currentPowerupType === POWERUP_THERMOMETER) {
      spriteKey = 'termometro';
      scale = 0.30; // escala más grande para termómetro
    }

    this.powerup = this.add.image(pos.x, pos.y - 10, spriteKey).setScale(scale).setDepth(8);

    this.powerupHoleIndex = index;
    this.powerup.setInteractive({ useHandCursor: true });

    // Evento click en powerup: Jugador 1 (Pin) (LMB) recoge
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

  usePowerupByPlayer(playerId) {
    if (this.isGameOver) return false;

    let powerupType;
    if (playerId === 1) {
      if (this.powerupStoredP1.length <= 0) return false;
      powerupType = this.powerupStoredP1.pop();
      if(this.powerupMaxStoredP1>0)
        this.powerupMaxStoredP1--
    } else {
      if (this.powerupStoredP2.length <= 0) return false;
      powerupType = this.powerupStoredP2.pop();
      if(this.powerupMaxStoredP2>0)
        this.powerupMaxStoredP2--;
    }

    // Apply effect based on type
    if (powerupType === POWERUP_CLOCK) {
      // Aumentar tiempo
      this.timeLeft += this.powerupAmount;
      this.timerText.setText(this.formatTime(this.timeLeft));
    } else if (powerupType === POWERUP_THERMOMETER) {
      // Activar efecto del termómetro
      this.thermometerEffectActive = true;
      this.pinBlocked = true;
      //detener el tiempo
      this.gameTimer.paused = true;

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
      
      this.thermometerTimer = this.time.addEvent({
        delay: 1000,
        repeat: 3, // 4 ticks: 0,1,2,3
        callback: () => {
          this.puntosPlayer2 += 2;
          this.updateScoreUI();
        }
      });
      this.time.delayedCall(4000, () => {
        this.thermometerEffectActive = false;
        this.pinBlocked = false;
        this.gameTimer.paused = false;
        if (this.thermometerTimer) {
          this.thermometerTimer.destroy();
          this.thermometerTimer = null;
        }
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
    if (this.isGameOver) return;

    // Manejo teclas 1-6: mover topo (solo si topo está disponible)
    if (this.topo) {
      if (this.keys.one.isDown) this.topo.moveToHole(0);
      if (this.keys.two.isDown) this.topo.moveToHole(1);
      if (this.keys.three.isDown) this.topo.moveToHole(2);
      if (this.keys.four.isDown) this.topo.moveToHole(3);
      if (this.keys.five.isDown) this.topo.moveToHole(4);
      if (this.keys.six.isDown) this.topo.moveToHole(5);
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

 endRound() {
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

  this.updateUserScore();

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
    cx - 130,
    btnY,
    'Repetir',
    0x88e1ff,
    0x4fb0ff,
    () => this.scene.restart()
  );

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

  // ----------------------
  // Update user score
  // ----------------------
  async updateUserScore() {
    try {
      const raw = localStorage.getItem('playerUser');
      if (!raw) return;
      const user = JSON.parse(raw);
      const score = Math.max(this.puntosPlayer1, this.puntosPlayer2);
      const character = this.puntosPlayer1 > this.puntosPlayer2 ? 'Pom' : 'Pin';
      const updateData = { bestCharacter: character };
      if (score > user.maxScore) {
        updateData.maxScore = score;
      }
      await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      // También guardar la puntuación con el carácter en el historial
      if (score > 0) {
        await fetch(`/api/users/${user.id}/scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score: score,
            opponent: 'computer',
            character: character
          })
        });
      }
    } catch (error) {
      console.error('Error updating user score:', error);
    }
  }

}
