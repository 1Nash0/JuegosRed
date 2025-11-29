import Phaser from 'phaser';

export class PauseScene extends Phaser.Scene {

    constructor() {
        super('PauseScene');
    }

    create(data) {
        const w = this.scale.width;
        const h = this.scale.height;
        const cx = w / 2;
        const cy = h / 2;

        // Fondo oscuro semitransparente (absorbe input)
        this.add.rectangle(cx, cy, w, h, 0x000000, 0.6).setOrigin(0.5);

        // Bloqueador POR DEBAJO del panel (evita click-through fuera del panel)
        // Lo creamos antes del panel y con depth bajo.
        const outerBlocker = this.add.rectangle(cx, cy, w, h, 0x000000, 0).setOrigin(0.5);
        outerBlocker.setInteractive();
        outerBlocker.setDepth(0);

        // Panel central (por encima del blocker)
        const panel = this.add.rectangle(cx, cy, 520, 420, 0x1a1a2e).setStrokeStyle(4, 0x00ff00).setOrigin(0.5);
        panel.setDepth(1);

        // Título
        this.add.text(cx, cy - 160, 'JUEGO PAUSADO', {
            fontSize: '40px',
            fontStyle: 'bold',
            color: '#00ff00',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(2);

        // --- Crear botones con depth alto para asegurar interacción ---
        const resumeBtn = this.createButton(cx, cy - 30, 'REANUDAR', 0x00ff00, 0x00ff88);
        const menuBtn   = this.createButton(cx, cy + 50, 'MENÚ PRINCIPAL', 0xff6b6b, 0xff8888);
        const exitBtn   = this.createButton(cx, cy + 130, 'SALIR', 0xffffff, 0xcccccc);

        // Asegurar que botones estén por encima
        resumeBtn.setDepth(10);
        menuBtn.setDepth(10);
        exitBtn.setDepth(10);

        // Handlers de botones
        resumeBtn.on('pointerdown', () => {
            this.scene.stop();
            this.scene.resume(data.originalScene);
            this.scene.get(data.originalScene).resume();
        });

        menuBtn.on('pointerdown', () => {
            this.scene.stop(data.originalScene);
            this.scene.start('MenuScene');
        });

        exitBtn.on('pointerdown', () => {
            this.game.destroy(true);
        });

        // Cambiar cursor
        this.input.setDefaultCursor('url(assets/cursor.png), pointer');

        // Manejo de tecla ESC para pausar
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.stop();
            this.scene.resume(data.originalScene);
            this.scene.get(data.originalScene).resume();
        });
    }

    createButton(x, y, text, color, overColor) {
        const button = this.add.text(x, y, text, {
            fontSize: '32px',
            color: color,
        }).setOrigin(0.5)
        .setInteractive({useHandCursor: true})
        .on('pointerover', () => button.setColor(overColor))
        .on('pointerout', () => button.setColor(color));

        return button;
    }
}