import Phaser from 'phaser';

export class CreditScene extends Phaser.Scene {
    constructor() {
        super('CreditScene');
    }

    preload() {

         this.load.image('Creditos', 'assets/FondoCreditos.png'); // fondo(titulo) 
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

        this.credits = this.add.text(400, 400, creditsText, {
            fontSize: '24px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 700 }
        }).setOrigin(0.5);

        // BOTÓN PARA VOLVER
        this.localBtn = this.add.text(400, 500, 'Volver', {
            fontSize: '24px',
            color: '#00ff00',
        }).setOrigin(0.5)
        .setInteractive({useHandCursor: true})
        .on('pointerover', () => this.localBtn.setColor('#00ff88'))
        .on('pointerout', () => this.localBtn.setColor('#00ff00'))
        .on('pointerdown', () => {
            this.sound.add('Boton').play();
            this.sound.stopAll();
            this.scene.start('MenuScene');
        });
    }

    
    update() {
        // MOVER LOS CRÉDITOS HACIA ARRIBA
        if (this.credits) {
            this.credits.y -= 0.5;
        }
    }
}
