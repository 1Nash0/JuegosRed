import Phaser from 'phaser';

export class CreditScene extends Phaser.Scene {
    constructor() {
        super('CreditScene');
    }

    preload() {

         this.load.image('Creditos', 'assets/fondoCreditos.png'); // fondo(titulo) 
        // SOLO SONIDOS (opcional)
        this.load.audio('Musica_menu', 'assets/Sonidos para_red/Its Safe Now.mp3');
        this.load.audio('Boton', 'assets/Sonidos para_red/Boton.mp3');  
    }

    create() {
        
         const bg = this.add.image(0, 0, 'Creditos').setOrigin(0, 0);  //fondo(titulo)
        bg.setDisplaySize(this.scale.width, this.scale.height);


        // SONIDOS
        this.sound.add('Musica_menu').play({ loop: true, volume: 0.5 });

        // TÍTULO
        this.add.text(400, 50, 'Créditos', {
            fontSize: '48px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // TEXTO DE CRÉDITOS
        const creditsText = `
Desarrolladores:
- Cristian Boabes
- Nasreddin El Khiyat Imusatin
- Jaime Alonso del Real
- David Martínez García
Arte: 
- David Martínez García
Sonidos y Música: 
- Jaime Alonso del Real
Testeo: 
- Cristian Boabes
- Nasreddin El Khiyat Imusatin


Gracias por jugar
        `;

        this.credits = this.add.text(400, 280, creditsText, {
            fontSize: '24px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 700 }
        }).setOrigin(0.5);

        // Tween: pequeño movimiento de 'flotación' (bobbing)
        // mueve los créditos unos pocos píxeles arriba/abajo en bucle
        this.tweens.add({
            targets: this.credits,
            y: this.credits.y - 15,
            duration: 1000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
            // ligera variación de inicio para no sincronizar exactamente si hay otros objetos
            delay: 200,
        });

        // BOTÓN PARA VOLVER
        this.localBtn = this.add.text(400, 500, 'Volver', {
            fontSize: '24px',
            color: '#e18fa1ff',
        }).setOrigin(0.5)
        .setInteractive({useHandCursor: true})
        .on('pointerover', () => this.localBtn.setColor('#ffffffff'))
        .on('pointerout', () => this.localBtn.setColor('#e18fa1ff'))
        .on('pointerdown', () => {
            this.sound.add('Boton').play();
            this.sound.stopAll();
            this.scene.start('MenuScene');
        });
    }


    update() {
        // El movimiento de los créditos lo gestiona el tween creado en create()
    }
}
