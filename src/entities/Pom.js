export class Pom extends Phaser.GameObjects.Image{

    
     constructor(scene, id, x, y) {
        super(scene, x, y, 'Martillo');
        this.setOrigin(0.5);
        this.setScale(0.25);  // Ajusta el tamaño si es necesario
       
        // Añadir al scene
        scene.add.existing(this);

        // El martillo "escucha" al ratón
        scene.input.on('pointermove', (pointer) => {
            this.x = pointer.x;
            this.y = pointer.y;
        });
    }

}