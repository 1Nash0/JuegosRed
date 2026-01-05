import Phaser from 'phaser';

export class Pom extends Phaser.GameObjects.Image {

    constructor(scene, id, x, y) {
        super(scene, x, y, 'Martillo');

        this.scene = scene;
        this.id = id;

     this.setOrigin(0.5, 0.35);

        this.setScale(1.0);
        this.setDepth(5);

        scene.add.existing(this);

        // Estado
        this.isHitting = false;
        this.hitOffset = 45;

        // El martillo sigue al ratón (pero se bloquea si thermometerEffectActive está activo)
        scene.input.on('pointermove', (pointer) => {
            if (!this.isHitting && !this.scene.thermometerEffectActive) {
                this.x = pointer.x;
                this.y = pointer.y;
            }
        });
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
