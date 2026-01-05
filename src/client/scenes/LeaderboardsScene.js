import Phaser from 'phaser';

export class LeaderboardsScene extends Phaser.Scene {
    constructor() {
        super('LeaderboardsScene');
    }

    preload() {
        // Cargar sonidos si es necesario
        this.load.audio('Boton', 'assets/Sonidos para_red/Boton.mp3');
    }

    create() {
        // Fondo
        this.add.rectangle(500, 300, 1000, 600, 0x1a1a2e);

        // Título
        this.add.text(500, 50, 'LEADERBOARDS', {
            fontSize: '48px',
            color: '#ffffff',
            fontStyle: 'bold',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Texto de carga
        this.loadingText = this.add.text(500, 150, 'Cargando rankings...', {
            fontSize: '24px',
            color: '#ffff00',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Contador/debug de entradas
        this.countText = this.add.text(500, 120, '', {
            fontSize: '18px',
            color: '#00ffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Contenedor para la lista
        this.rankingsContainer = this.add.container(500, 200);


        // Botón de volver
        const backBtn = this.add.text(500, 550, 'Volver al Menú', {
            fontSize: '24px',
            color: '#00ff00',
            fontFamily: 'Arial'
        }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => backBtn.setColor('#ffffff'))
        .on('pointerout', () => backBtn.setColor('#e18fa1ff'))
        .on('pointerdown', () => {
            this.sound.add('Boton').play();
            this.scene.start('MenuScene');
        });

        // Cargar rankings
        this.loadRankings();
    }

    async loadRankings() {
        try {
            // Fetch users and build a leaderboard by maxScore
            const response = await fetch('/api/users');
            if (!response.ok) {
                throw new Error('Error al cargar usuarios');
            }
            const users = await response.json();
            console.log('[LeaderboardsScene] fetched users:', users);

            // Filtrar usuarios con maxScore > 0 y ordenar por maxScore descendente
            const rankedUsers = users
                .filter(u => typeof u.maxScore === 'number' && u.maxScore > 0)
                .sort((a, b) => b.maxScore - a.maxScore)
                .slice(0, 10); // Top 10

            // Limpiar contenedor
            this.rankingsContainer.removeAll();

            // Mostrar número de entradas
            this.countText.setText(`Jugadores: ${rankedUsers.length}`);

            if (rankedUsers.length === 0) {
                this.loadingText.setText('No hay puntuaciones registradas');
                this.loadingText.setColor('#ffff00');
                return;
            }

            // Ocultar texto de carga
            this.loadingText.setVisible(false);

            // Mostrar rankings (maxScore por usuario)
            rankedUsers.forEach((user, index) => {
                const y = index * 30;
                const rank = index + 1;
                const text = this.add.text(0, y, `${rank}. ${user.name} - ${user.maxScore}`, {
                    fontSize: '18px',
                    color: '#ffffff',
                    fontFamily: 'Arial'
                }).setOrigin(0.5, 0);
                this.rankingsContainer.add(text);
            });

        } catch (error) {
            console.error('Error loading leaderboards:', error);
            this.loadingText.setText('Error al cargar rankings');
            this.loadingText.setColor('#ff0000');
        }
    }
}