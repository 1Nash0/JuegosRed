import Phaser from 'phaser';


export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {
    this.load.image('Titulo', 'assets/Bocetos/Inicio.png'); // fondo(titulo) 
}

    create() {
        const bg = this.add.image(0, 0, 'Titulo').setOrigin(0, 0);  //fondo(titulo)
        bg.setDisplaySize(this.scale.width, this.scale.height);


        this.add.text(500, 200, 'MOLE HOLE', {
            fontSize: '64px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const localBtn = this.add.text(500, 320, 'Local 2 Jugadores', {
            fontSize: '24px',
            color: '#00ff00',
        }).setOrigin(0.5)
        .setInteractive({useHandCursor: true})
        .on('pointerover', () => localBtn.setColor('#00ff88'))
        .on('pointerout', () => localBtn.setColor('#00ff00'))
        .on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        const onlineBtn = this.add.text(500, 390, 'Multijugador online (no disponible)', {
            fontSize: '24px',
            color: '#ff6666',
        }).setOrigin(0.5);
    }
}