import Phaser from 'phaser';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  create(data) {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // Fondo oscuro
    this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.6);

    // Panel
    const panel = this.add.rectangle(cx, cy, 520, 420, 0x0b1220)
      .setStrokeStyle(3, 0x1f6feb);

    this.add.text(cx, cy - 170, 'AJUSTES', {
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // --- VOLUMEN ---
    this.add.text(cx - 180, cy - 90, 'Volumen', {
      fontSize: '22px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);

    this.createVolumeSlider(cx - 120, cy - 50, 240);

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
        color: '#dce3ff',
        align: 'center'
      }
    ).setOrigin(0.5, 0);

     // BOTÓN PARA VOLVER
        this.localBtn = this.add.text(500, 500, 'Volver', {
            fontSize: '24px',
            color: '#e18fa1ff',
        }).setOrigin(0.5)
        .setInteractive({useHandCursor: true})
        .on('pointerover', () => this.localBtn.setColor('#ffffffff'))
        .on('pointerout', () => this.localBtn.setColor('#e18fa1ff'))
        .on('pointerdown', () => {
            this.sound.add('Boton').play();
            this.sound.stopAll();
            this.scene.start('MenuScene');
        });
  }

  // ------------------------
  // Slider de volumen
  // ------------------------
  createVolumeSlider(x, y, width) {
    const bar = this.add.rectangle(x + width / 2, y, width, 6, 0x4455aa)
      .setOrigin(0.5);

    const handle = this.add.circle(
      x + width * this.sound.volume,
      y,
      10,
      0xffffff
    ).setInteractive({ draggable: true });

    this.input.setDraggable(handle);

    this.input.on('drag', (pointer, obj, dragX) => {
      if (obj !== handle) return;

      dragX = Phaser.Math.Clamp(dragX, x, x + width);
      obj.x = dragX;

      const volume = (dragX - x) / width;
      this.sound.volume = volume;
    });
  }

  // ------------------------
  // Botón simple reutilizable
  // ------------------------
  createButton(x, y, text, callback) {
    const bg = this.add.rectangle(x, y, 200, 50, 0x88e1ff)
      .setInteractive();

    const label = this.add.text(x, y, text, {
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#00131d'
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0x4fb0ff));
    bg.on('pointerout', () => bg.setFillStyle(0x88e1ff));
    bg.on('pointerdown', callback);
  }
}
