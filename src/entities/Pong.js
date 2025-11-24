export class Pong extends Phaser.GameObjects.Image{

     constructor(scene, id, x, y) {
        super(scene, x, y, 'martillo');
        this.setOrigin(0.5);
       
        // Añadir al scene
        scene.add.existing(this);

        // El martillo "escucha" al ratón
        scene.input.on('pointermove', (pointer) => {
            this.x = pointer.x;
            this.y = pointer.y;
        });
    }

}