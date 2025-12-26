export class Pom extends Phaser.GameObjects.Image {

    constructor(scene, id, x, y) {
        super(scene, x, y, 'Martillo');

        this.scene = scene;
        this.id = id;

        this.setOrigin(0.5);
        this.setScale(1.0);
        this.setDepth(5);

        scene.add.existing(this);

        // Estado
        this.isHitting = false;
        this.hitOffset = 45;

        // El martillo sigue al ratón
        scene.input.on('pointermove', (pointer) => {
            if (!this.isHitting) {
                this.x = pointer.x;
                this.y = pointer.y;
            }
        });
    }

    hit() {
        if (this.isHitting) return;

        this.isHitting = true;

        const startY = this.y;

        this.scene.tweens.add({
            targets: this,
            y: startY + this.hitOffset,
            duration: 80,
            ease: 'Power3',
            yoyo: true,
            onComplete: () => {
                this.isHitting = false;
            }
        });
    }
}
