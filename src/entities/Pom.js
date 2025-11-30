export class Pom extends Phaser.GameObjects.Image{

    
     constructor(scene, id, x, y) {
        super(scene, x, y, 'Martillo');
        this.setOrigin(0.5);
        this.setScale(1.0);  // Ajusta el tamaño si es necesario
        this.setDepth(5);    // Asegura que esté por encima de otros elementos
       
        // Añadir al scene
        scene.add.existing(this);

        // El martillo "escucha" al ratón
        scene.input.on('pointermove', (pointer) => {
            this.x = pointer.x;
            this.y = pointer.y;
        });
    }

}