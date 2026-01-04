import Phaser from 'phaser';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  create(data = {}) {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // De dónde se abrió este menú ("menu" por defecto). Si viene desde pausa, guardamos la escena original también.
    this._returnTo = data.from || 'menu';
    this._originalScene = data.originalScene || null;

    // Fondo oscuro
    this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.6);

    // Panel (rounded with shadow + gradient)
    const panelWidth = Math.min(520, this.scale.width - 80);
    const panelHeight = 420;
    const panelX = cx - panelWidth / 2;
    const panelY = cy - panelHeight / 2;
    const panelRadius = 16;

    const panelBg = this.add.graphics();
    // shadow
    panelBg.fillStyle(0x000000, 0.36);
    panelBg.fillRoundedRect(panelX + 6, panelY + 8, panelWidth, panelHeight, panelRadius);
    // main gradient (top->bottom)
    panelBg.fillGradientStyle(0x0b1220, 0x0b1220, 0x0f2438, 0x0f2438, 1);
    panelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, panelRadius);
    // stroke
    panelBg.lineStyle(2, 0x1f6feb, 0.9);
    panelBg.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, panelRadius);

    panelBg.alpha = 0;
    this.tweens.add({ targets: panelBg, alpha: 1, duration: 500, ease: 'Cubic.Out' });

    const title = this.add.text(cx, cy - 175, 'AJUSTES', {
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#dff4ff',
      letterSpacing: 3,
      align: 'center'
    }).setOrigin(0.5);
    title.setStroke('#7fd0ff', 4);
    title.setShadow(2, 2, '#000000', 6, false, true);
    title.setScale(0.95);
    this.tweens.add({ targets: title, scale: 1, duration: 420, ease: 'Back.Out' });


    // --- VOLUMEN ---
    this.add.text(cx - 180, cy - 90, 'Volumen', {
      fontSize: '22px',
      color: '#dff4ff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.createVolumeSlider(cx - 120, cy - 50, 260); // Controls music volume when possible (affects menu/game music instances)

    // --- CONTROLES ---
    this.add.text(cx, cy + 20,
      'CONTROLES\n\n' +
      '🖱 Click izquierdo: Golpear\n' +
      '🖱 Click derecho: Powerup P1\n' +
      '␣ Espacio: Powerup P2\n' +
      '1-6: Mover topo\n' +
      'ESC: Pausa',
      {
        fontSize: '18px',
        color: '#cfe7ff',
        align: 'center',
        fontStyle: 'bold',
        lineSpacing: 6
      }
    ).setOrigin(0.5, 0);



    // BOTÓN PARA VOLVER (estilo texto solicitado)
    const backLabel = this._returnTo === 'pause' ? 'Volver a Pausa' : 'Volver';
    this.localBtn = this.add.text(500, 500, backLabel, {
      fontSize: '24px',
      color: '#e18fa1ff',
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.localBtn.setColor('#ffffffff'))
      .on('pointerout', () => this.localBtn.setColor('#e18fa1ff'))
      .on('pointerdown', () => {
        // pequeña animación de fade-out antes de cambiar de escena
        this.cameras.main.fadeOut(180, 10, 10, 10);
        this.time.delayedCall(200, () => {
          if (this._returnTo === 'pause') {
            this.scene.start('PauseScene', { originalScene: this._originalScene });
          } else {
            this.scene.start('MenuScene');
          }
        });
      });
        
  }

  // ------------------------
  // Slider de volumen 
  // ------------------------
  createVolumeSlider(x, y, width) {
    const barHeight = 8;
    const bgBar = this.add.rectangle(x + width / 2, y, width, barHeight, 0x25354f).setOrigin(0.5);

    // Prefer music instance volume if available (menu or level), else fallback to global
    // @ts-ignore - properties may be attached to the game instance at runtime
    const { musicaMenu, musicaNivel } = (this.game || {});
    const musicInstances = [musicaMenu, musicaNivel].filter(Boolean);
    const initialVol = Phaser.Math.Clamp((musicInstances[0] && musicInstances[0].volume) ?? this.sound.volume ?? 1, 0, 1);

    const fillBar = this.add.rectangle(x, y, width * initialVol, barHeight, 0x4fb0ff).setOrigin(0, 0.5);

    const handle = this.add.circle(x + width * initialVol, y, 12, 0xffffff)
      .setStrokeStyle(3, 0x25354f)
      .setInteractive({ draggable: true });

    const percentText = this.add.text(x + width + 14, y, Math.round(initialVol * 100) + '%', {
      fontSize: '18px',
      color: '#dff4ff'
    }).setOrigin(0, 0.5);

    this.input.setDraggable(handle);

    const updateVolume = (volume) => {
      this.sound.volume = volume;
      // Apply to known music instances so the menu/music volume updates in real time
      musicInstances.forEach(m => {
        if (m && typeof m.setVolume === 'function') m.setVolume(volume);
      });
      // Also update any music currently stored on game object dynamically
      if (musicaMenu && typeof musicaMenu.setVolume === 'function') musicaMenu.setVolume(volume);
      if (musicaNivel && typeof musicaNivel.setVolume === 'function') musicaNivel.setVolume(volume);
      fillBar.width = width * volume;
      percentText.setText(Math.round(volume * 100) + '%');
    };

    this.input.on('drag', (pointer, obj, dragX) => {
      if (obj !== handle) return;
      dragX = Phaser.Math.Clamp(dragX, x, x + width);
      obj.x = dragX;
      const volume = (dragX - x) / width;
      updateVolume(volume);
    });

    // Allow clicking on bgBar to set volume quickly
    bgBar.setInteractive({ useHandCursor: true });
    bgBar.on('pointerdown', (pointer) => {
      const localX = Phaser.Math.Clamp(pointer.worldX - (x), 0, width);
      const vol = localX / width;
      handle.x = x + localX;
      updateVolume(vol);
    });

    handle.on('pointerover', () => this.tweens.add({ targets: handle, scale: 1.08, duration: 120 }));
    handle.on('pointerout', () => this.tweens.add({ targets: handle, scale: 1, duration: 120 }));
  }

  // ------------------------
  // Botón simple reutilizable (configurable y animado)
  // ------------------------
  createButton(x, y, text, callback, opts = {}) {
    const width = opts.width || 200;
    const height = opts.height || 50;
    const bgColor = opts.bgColor || 0x88e1ff;
    const textColor = opts.textColor || '#00131d';

    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, width, height, bgColor)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    bg.setStrokeStyle(2, 0xffffff, 0.08);

    const label = this.add.text(0, 0, text, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: textColor
    }).setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerover', () => {
      this.tweens.add({ targets: container, scale: 1.04, duration: 140, ease: 'Power2' });
      this.tweens.add({ targets: bg, alpha: 0.95, duration: 140 });
    });
    bg.on('pointerout', () => {
      this.tweens.add({ targets: container, scale: 1, duration: 120, ease: 'Power2' });
      this.tweens.add({ targets: bg, alpha: 1, duration: 120 });
    });
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: container, scale: 0.96, duration: 80, yoyo: true });
      if (typeof callback === 'function') callback();
    });

    return container;
  }
}
