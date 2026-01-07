import Phaser from 'phaser';

export class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
    }

    create(data = {}) {
        const w = this.scale.width;
        const h = this.scale.height;
        const cx = w / 2;
        const cy = h / 2;

        this._prevCursor = (this.game && this.game.canvas && this.game.canvas.style) ? this.game.canvas.style.cursor : '';
        if (this.game && this.game.canvas && this.game.canvas.style) {
            this.game.canvas.style.cursor = 'auto';
        }

        // If an original scene key was provided, pause it explicitly to ensure timers/events stop
        if (data.originalScene) {
            try {
                this.scene.pause(data.originalScene);
            } catch (e) {
                console.warn('[PauseScene] Could not pause original scene', e);
            }
        }

        const outerBlocker = this.add.rectangle(cx, cy, w, h, 0x000000, 0.6).setOrigin(0.5);
        outerBlocker.setInteractive();
        outerBlocker.setDepth(1000);

        const panel = this.add.rectangle(cx, cy, 540, 460, 0x11121a).setStrokeStyle(3, 0x00cc66).setOrigin(0.5);
        panel.setDepth(1001);

        panel.scale = 0.9;
        this.tweens.add({ targets: panel, scale: 1, duration: 180, ease: 'Back.Out' });

        this.add.text(cx, cy - 180, 'PAUSADO', {
            fontSize: '40px',
            fontStyle: 'bold',
            color: '#00cc66',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(1002);

        this.add.rectangle(cx, cy - 140, 340, 3, 0x00cc66).setOrigin(0.5).setDepth(1002);

        const resumeBtn = this.createButton(cx, cy - 40, 'REANUDAR', 0x00cc66, 0x66ffb2);
        const menuBtn = this.createButton(cx, cy + 40, 'MENÚ PRINCIPAL', 0xff6b6b, 0xff9a9a);
        const settingsBtn = this.createButton(cx, cy + 120, 'AJUSTES', 0xffffff, 0xcccccc);

        resumeBtn.setDepth(1003);
        menuBtn.setDepth(1003);
        settingsBtn.setDepth(1003);
        resumeBtn.on('pointerdown', () => {
            // If coming from multiplayer, notify server so the opponent can resume as well
            if (data.originalScene === 'MultiplayerGameScene') {
                try {
                    const ms = this.scene.get('MultiplayerGameScene');
                    if (ms && typeof ms.sendMessage === 'function') {
                        ms.sendMessage({ type: 'resume' });
                    }
                } catch (err) {
                    console.warn('Failed to send resume to server:', err);
                }
            }

            if (this.game && this.game.canvas && this.game.canvas.style) {
                this.game.canvas.style.cursor = this._prevCursor || 'auto';
            }

            if (data.originalScene) {
                this.scene.resume(data.originalScene);
            }

            this.scene.stop();
        });

        menuBtn.on('pointerdown', () => {
            if (data.originalScene) this.scene.stop(data.originalScene);
            this.scene.start('MenuScene');
            this.sound.stopAll();
        });

        settingsBtn.on('pointerdown', () => {
             // Indicar que venimos del menú de pausa y pasar la escena original para poder reanudarla al volver
             this.scene.start('SettingsScene', { from: 'pause', originalScene: data.originalScene });
        });

        this._escHandler = () => resumeBtn.emit('pointerdown');
        this.input.keyboard.on('keydown-ESC', this._escHandler);

        this.events.once('shutdown', () => {
            if (this.game && this.game.canvas && this.game.canvas.style) {
                this.game.canvas.style.cursor = this._prevCursor || 'auto';
            }
            if (this._escHandler) {
                this.input.keyboard.off('keydown-ESC', this._escHandler);
                this._escHandler = null;
            }
        });
    }

    createButton(x, y, text, normalHex, hoverHex) {
    const width = 360;
    const height = 64;
    const normalColor = `#${normalHex.toString(16).padStart(6, '0')}`;
    const hoverColor = `#${hoverHex.toString(16).padStart(6, '0')}`;

    const bg = this.add.rectangle(0, 0, width, height, 0x1f2340)
        .setStrokeStyle(2, normalHex)
        .setOrigin(0.5);

    const label = this.add.text(0, 0, text, {
        fontSize: '22px',
        fontStyle: 'bold',
        color: normalColor,
        fontFamily: 'Arial'
    }).setOrigin(0.5);

    const btn = this.add.container(x, y, [bg, label]);

    // Establece el tamaño del botón
    btn.setSize(width, height);

    // HITBOX PERFECTO sin offsets raros
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
        bg.setFillStyle(0x2f3458);
        bg.setStrokeStyle(3, hoverHex);
        label.setColor(hoverColor);
        label.setScale(1.05);
    });

    btn.on('pointerout', () => {
        bg.setFillStyle(0x1f2340);
        bg.setStrokeStyle(2, normalHex);
        label.setColor(normalColor);
        label.setScale(1);
    });

    const clickHandler = () => {
        this.tweens.add({ targets: btn, scaleX: 0.98, scaleY: 0.98, duration: 80, yoyo: true });
        btn.emit('pointerdown');
    };

    btn.on('pointerdown', () => {
        this.tweens.add({ targets: btn, scaleX: 0.98, scaleY: 0.98, duration: 80, yoyo: true });
    });

    // Also forward clicks from child elements to container to improve hit reliability
    try {
        bg.setInteractive();
        bg.on('pointerdown', clickHandler);
    } catch (e) {}
    try {
        label.setInteractive();
        label.on('pointerdown', clickHandler);
    } catch (e) {}

    return btn;
}
}