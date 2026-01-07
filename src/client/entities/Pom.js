import Phaser from 'phaser';

export class Pom extends Phaser.GameObjects.Image {

    // opts: { followPointer: boolean }
    constructor(scene, id, x, y, opts = {}) {
        super(scene, x, y, 'Martillo');

        this.scene = scene;
        this.id = id;

        this.setOrigin(0.5, 0.35);

        this.setScale(1.0);
        this.setDepth(1000);

        scene.add.existing(this);

        // Estado
        this.isHitting = false;
        this.hitOffset = 45;

        // El martillo puede opcionalmente seguir al ratón
        const follow = opts.followPointer !== undefined ? opts.followPointer : true;
        if (follow) {
            this._pointerMoveHandler = (pointer) => {
                if (!this.isHitting && !this.scene.thermometerEffectActive) {
                    this.x = pointer.x;
                    this.y = pointer.y;
                }
            };
            scene.input.on('pointermove', this._pointerMoveHandler);
        }
    }

    destroy(fromScene) {
        // Remove pointermove handler if registered
        try {
            if (this._pointerMoveHandler && this.scene && this.scene.input) {
                this.scene.input.off('pointermove', this._pointerMoveHandler);
                this._pointerMoveHandler = null;
            }
        } catch (e) {
            // ignore
        }

        super.destroy(fromScene);
    }

   hit() {
    if (this.isHitting) return;

    this.isHitting = true;

    const startX = this.x;
    const startY = this.y;
    const startAngle = this.angle;

    // Dirección del golpe según el ángulo del mazo
    const radians = Phaser.Math.DegToRad(startAngle + 90);
    const distance = this.hitOffset;

    const dx = Math.cos(radians) * distance;
    const dy = Math.sin(radians) * distance;

    this.scene.tweens.add({
        targets: this,
        x: startX + dx,
        y: startY + dy,
        angle: startAngle + 18,
        duration: 80,
        ease: 'Power2.In',
        onComplete: () => {
            this.scene.tweens.add({
                targets: this,
                x: startX,
                y: startY,
                angle: startAngle,
                duration: 140,
                ease: 'Back.Out',
                onComplete: () => {
                    this.isHitting = false;
                }
            });
        }
    });
}



}
