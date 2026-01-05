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
            color: '#e18fa1ff',
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

        // Auto-refresh cuando se reanuda la escena (por ejemplo al volver desde otra escena)
        this.events.on('resume', () => this.loadRankings());
    }

    async loadRankings() {
        try {
            this.loadingText.setText('Cargando rankings...');
            this.loadingText.setVisible(true);

            // Intentar obtener entradas detalladas desde /api/leaderboards (más precisa)
            let topEntries = [];
            try {
                const resp = await fetch('/api/leaderboards');
                if (resp.ok) {
                    const entries = await resp.json();
                    if (Array.isArray(entries) && entries.length > 0) {
                        // Normalizar entradas a { name, score, character }
                        topEntries = entries.map(e => ({
                            name: e.name || e.userId || 'unknown',
                            score: Number(e.score) || 0,
                            character: e.character || null,
                            timestamp: e.timestamp || null
                        })).sort((a, b) => b.score - a.score).slice(0, 10);
                    } else {
                        console.warn('[LeaderboardsScene] /api/leaderboards returned empty');
                    }
                } else {
                    console.warn('[LeaderboardsScene] /api/leaderboards returned', resp.status);
                }
            } catch (err) {
                console.warn('[LeaderboardsScene] /api/leaderboards fetch failed', err);
            }

            // Fallback: si no obtuvimos entradas, usar /api/users y ordenar por maxScore
            if (!topEntries || topEntries.length === 0) {
                const response = await fetch('/api/users');
                if (!response.ok) throw new Error('Error al cargar usuarios');
                const users = await response.json();
                topEntries = users
                    .filter(u => typeof u.maxScore === 'number' && u.maxScore > 0)
                    .sort((a, b) => b.maxScore - a.maxScore)
                    .slice(0, 10)
                    .map(u => ({ name: u.name, score: u.maxScore, character: u.bestCharacter || null }));
            }
            // Limpiar contenedor
            this.rankingsContainer.removeAll();

            // Mostrar número de entradas
            this.countText.setText(`Puntuaciones: ${topEntries.length}`);

            if (topEntries.length === 0) {
                this.loadingText.setText('No hay puntuaciones registradas');
                this.loadingText.setColor('#ffff00');
                return;
            }

            // Ocultar texto de carga
            this.loadingText.setVisible(false);

            // Mostrar rankings con el carácter
            topEntries.forEach((entry, index) => {
                const y = index * 30;
                const rank = index + 1;
                const character = entry.character ? ` (${entry.character})` : '';
                const text = this.add.text(0, y, `${rank}. ${entry.name} - ${entry.score}${character}`, {
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