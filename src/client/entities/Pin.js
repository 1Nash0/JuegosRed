import Phaser from 'phaser';

// ...existing code...
export class Pin {

    constructor(scene, id, x, y) {
        this.id = id;
        this.scene = scene;
        this.isActive = false;
        this.popUpDuration = 1000; // ms que aparece el topo
        this.health = 1;

        this.holes = [];            // posiciones posibles
        this.currentHoleIndex = 0;  // índice actual

        // Control de cooldown entre movimientos
        this.moveCooldown = 700; // ms a esperar entre moves (ajusta aquí)
        this._lastMoveTime = 0;

        // Usar sprite de bojack
        this.sprite = this.scene.physics.add.sprite(x, y, 'bojack');
        this.sprite.setImmovable(true);
        this.sprite.body.allowGravity = false;
        this.sprite.setVisible(false);
        this.sprite.setScale(0.5);
        this.sprite.setOrigin(0.5);
        this.sprite.setDepth(2);


        // Preparar callback pero NO dejar el sprite interactivo mientras esté oculto
        this._onHitCallback = () => this.hit();
        this._pointerRegistered = false;
        this.sprite.disableInteractive(); // asegurar inicio no interactivo
    }

    // Establecer los agujeros (array de {x,y})
    setHoles(holes = []) {
        this.holes = holes;
        if (this.holes.length) {
            this.currentHoleIndex = 0;
            this.moveToHole(this.currentHoleIndex);
        }
    }

    // Mover al topo al agujero índice (con wrap)
    moveToHole(index) {
        if (!this.holes.length) return false;

        const now = (this.scene && this.scene.time && this.scene.time.now) ? this.scene.time.now : Date.now();
        if (now - this._lastMoveTime < this.moveCooldown) {
            // demasiada rapidez, ignorar movimiento
            return false;
        }
        this._lastMoveTime = now;

        this.currentHoleIndex = Phaser.Math.Wrap(index, 0, this.holes.length);
        const pos = this.holes[this.currentHoleIndex];
        this.sprite.setPosition(pos.x, pos.y);

        // Si el topo estaba visible al moverse, ocultarlo para penalizar cambio rápido
        if (this.isActive) {
            this.hide();
        }

        return true;
    }

    // Mover relativo (-1 / +1)
    moveIndex(delta) {
        if (!this.holes.length) return;
        this.moveToHole(this.currentHoleIndex + delta);
    }

    // El topo sale del agujero
    popUp() {
        if (this.isActive) return;
        
        // Asegurarse de estar en el agujero correcto al salir
        this.moveToHole(this.currentHoleIndex);

        this.isActive = true;
        this.health = 1;
        this._wasHit = false; // resetear: no ha sido golpeado aún
        this.sprite.setVisible(true);

        // Activar interacción solo cuando es visible
        this.sprite.setInteractive({ useHandCursor: true });
        if (!this._pointerRegistered) {
            this.sprite.on('pointerdown', this._onHitCallback);
            this._pointerRegistered = true;
        }

        // Emitir evento de "salida" para que la escena pueda reaccionar (ej. recoger powerup)
        try {
            this.scene.events.emit('topoPopped', {
                id: this.id,
                holeIndex: this.currentHoleIndex,
                x: this.sprite.x,
                y: this.sprite.y,
                timestamp: (this.scene.time) ? this.scene.time.now : Date.now()
            });
        } catch (e) {
            // defensivo: no romper si scene.events no existe
            console.warn('Emit topoPopped failed', e);
        }

        // El topo se esconde después de cierto tiempo
        this.scene.time.delayedCall(this.popUpDuration, () => {
            // hide() se encargará de emitir evento de "miss" si corresponde
            this.hide();
        });
    }

    // El topo se esconde en el agujero
    hide() {
        if (!this.isActive) return; // Si ya estaba inactivo, no hacer nada
        
        this.isActive = false;
        this.sprite.setVisible(false);
        // Desactivar interacción cuando está oculto
        this.sprite.disableInteractive();
        
        // Si no fue golpeado, emitir evento de "miss" (el jugador 2 gana punto)
        if (!this._wasHit) {
            try {
                this.scene.events.emit('topoMissed', {
                    id: this.id,
                    holeIndex: this.currentHoleIndex
                });
            } catch (e) {
                console.warn('Emit topoMissed failed', e);
            }
        }
    }

    // Cuando se golpea al topo - retorna true si fue golpeado
    hit() {
        if (!this.isActive) return false;

        this._wasHit = true; // Marcar que fue golpeado
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