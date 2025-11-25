export class Pin {

    constructor(scene, id, x, y) {
        this.id = id;
        this.scene = scene;
        this.isActive = false;
        this.popUpDuration = 1000; // ms que aparece el topo
        this.hideDuration = 2000; // ms que desaparece antes de salir
        this.health = 1;

        // Crear sprite del topo (círculo simple)
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0x8B4513); // Color marrón
        graphics.fillCircle(25, 25, 25);
        graphics.generateTexture(`topo-${id}`, 50, 50);
        graphics.destroy();

        this.sprite = this.scene.physics.add.sprite(x, y, `topo-${id}`);
        this.sprite.setImmovable(true);
        this.sprite.body.allowGravity = false;
        this.sprite.setVisible(false);

        // Hacer clickeable para golpear
        this.sprite.setInteractive({ useHandCursor: true });
        this.sprite.on('pointerdown', () => this.hit());
    }

    // El topo sale del agujero
    popUp() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.health = 1;
        this.sprite.setVisible(true);

        // El topo se esconde después de cierto tiempo
        this.scene.time.delayedCall(this.popUpDuration, () => {
            this.hide();
        });
    }

    // El topo se esconde en el agujero
    hide() {
        this.isActive = false;
        this.sprite.setVisible(false);
    }

    // Cuando se golpea al topo
    hit() {
        if (!this.isActive) return;

        this.health -= 1;
        this.sprite.setTint(0xff0000); // Parpadea rojo
        
        this.scene.time.delayedCall(100, () => {
            this.sprite.clearTint();
        });

        if (this.health <= 0) {
            this.hide();
            return true; // Indicar que fue golpeado
        }
        return false;
    }

    // Resetear el topo
    reset() {
        this.health = 1;
        this.isActive = false;
        this.sprite.setVisible(false);
        this.sprite.clearTint();
    }
}