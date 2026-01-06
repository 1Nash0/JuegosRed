import Phaser from 'phaser';
import { connectionManager } from '../services/ConnectionManager';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {

        // IMÁGENES
    this.load.image('Titulo', 'assets/Bocetos/FondoJuego.png'); // fondo(titulo)
    this.load.image('Menu', 'assets/titulopng.png'); //titulo 

        // SONIDOS
    this.load.audio('Musica_menu', 'assets/Sonidos para_red/Its Safe Now.mp3');
    this.load.audio('Boton', 'assets/Sonidos para_red/Boton.mp3');  
}

    create() {
        // SONIDOS - Si ya hay música de menú sonando, reutilizarla; si no, detener y crearla
        // @ts-ignore - propiedad adjunta al objeto game en tiempo de ejecución
        const existingMusic = this.game && this.game.musicaMenu;
        if (existingMusic && existingMusic.isPlaying) {
            this.musicaMenu = existingMusic;
        } else {
            this.sound.stopAll();
            this.musicaMenu = this.sound.add('Musica_menu');
            this.musicaMenu.play({ loop: true, volume: 0.5 });
            // @ts-ignore - añadimos propiedad al objeto game en tiempo de ejecución
            this.game.musicaMenu = this.musicaMenu;
        }

        const titleImage = this.add.image(this.scale.width / 2, 100, 'Menu');
        titleImage.setOrigin(0.5);
        titleImage.setScale(0.6);

        const bg = this.add.image(0, 0, 'Titulo').setOrigin(0, 0);  //fondo(titulo)
        bg.setDisplaySize(this.scale.width, this.scale.height);

        const titleImg = this.add.image(490, 200, 'Menu');
        titleImg.setOrigin(0.5);
        titleImg.setScale(0.7);

        const localBtn = this.add.text(500, 320, 'Local 2 Jugadores', {
            fontSize: '30px',
            fontStyle: 'bold',
            fontFamily: 'roboto',
            color: '#892327',
        }).setOrigin(0.5)
        .setInteractive({useHandCursor: true})
        .on('pointerover', () => localBtn.setColor('#00fff7ff'))
        .on('pointerout', () => localBtn.setColor('#892327'))
        .on('pointerdown', () => {
            this.sound.add('Boton').play();
            this.sound.stopAll();
            this.scene.start('GameScene');

        });
         const creditBtn = this.add.text(500, 420, 'Créditos', {
            fontSize: '30px',
            fontStyle: 'bold',
            fontFamily: 'roboto',
            color: '#892327',
        }).setOrigin(0.5)
        .setInteractive({useHandCursor: true})
        .on('pointerover', () => creditBtn.setColor('#00fff7ff'))
        .on('pointerout', () => creditBtn.setColor('#892327'))
        .on('pointerdown', () => {
            this.sound.add('Boton').play();
            this.sound.stopAll();
            this.scene.start('CreditScene');

        });

         const settingsBtn = this.add.text(500, 470, 'Ajustes', {
            fontSize: '30px',
            fontStyle: 'bold',
            fontFamily: 'roboto',
            color: '#892327',
        }).setOrigin(0.5)
        .setInteractive({useHandCursor: true})
        .on('pointerover', () => settingsBtn.setColor('#00fff7ff'))
        .on('pointerout', () => settingsBtn.setColor('#892327'))
        .on('pointerdown', () => {
            this.scene.start('SettingsScene', { from: 'menu' });

        });

         const leaderboardsBtn = this.add.text(500, 520, 'Leaderboards', {
            fontSize: '30px',
            fontStyle: 'bold',
            fontFamily: 'roboto',
            color: '#892327',
        }).setOrigin(0.5)
        .setInteractive({useHandCursor: true})
        .on('pointerover', () => leaderboardsBtn.setColor('#00fff7ff'))
        .on('pointerout', () => leaderboardsBtn.setColor('#892327'))
        .on('pointerdown', () => {
            this.scene.start('LeaderboardsScene');
        });

        // --- LOGIN / NICKNAME ---
        // Area to show logged-in user or a login button
        this.playerInfoText = this.add.text(850, 30, '', {
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(1, 0);

        this.loginBtn = this.add.text(850, 60, 'Iniciar sesión', {
            fontSize: '16px',
            color: '#ffd27f'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.loginBtn.setColor('#fff'))
        .on('pointerout', () => this.loginBtn.setColor('#ffd27f'))
        .on('pointerdown', () => this.openLoginModal());

        // Cargar usuario guardado (si existe)
        this.loadStoredUser();

        /*const onlineBtn = this.add.text(500, 390, 'Multijugador online (no disponible)', {
            fontSize: '24px',
            color: '#ff6666',
        }).setOrigin(0.5);*/


        //ONLINE

        const onlineBtn = this.add.text(500, 370, 'Multijugador en Línea', {
                    fontSize: '30px',
                    fontStyle: 'bold',
                    fontFamily: 'roboto',
                    color: '#892327',
                }).setOrigin(0.5)
                .setInteractive({useHandCursor: true})
                .on('pointerover', () => onlineBtn.setColor('#00fff7ff'))
                .on('pointerout', () => onlineBtn.setColor('#892327'))
                .on('pointerdown', () => {
                    // Require login before going online
                    if (!localStorage.getItem('playerUser')) {
                        alert('Necesitas iniciar sesión para jugar en línea');
                        this.openLoginModal();
                        return;
                    }

                    this.scene.start('LobbyScene');
                });
        
                // Indicador de conexión al servidor
                this.connectionText = this.add.text(500, 580, 'Servidor: Comprobando...', {
                    fontSize: '18px',
                    color: '#ffff00'
                }).setOrigin(0.5);
        
                // Listener para cambios de conexión
                this.connectionListener = (data) => {
                    this.updateConnectionDisplay(data);
                };
                connectionManager.addListener(this.connectionListener);

                // Cerrar modal si la escena se apaga
                this.events.once('shutdown', () => this.closeLoginModal());
            }

            updateConnectionDisplay(data) {
                // Solo actualizar si el texto existe (la escena está creada)
                if (!this.connectionText || !this.scene || !this.scene.isActive('MenuScene')) {
                    return;
                }

                try {
                    if (data.connected) {
                        this.connectionText.setText(`Servidor: ${data.count} usuario(s) conectado(s)`);
                        this.connectionText.setColor('#0d3533ff');
                    } else {
                        this.connectionText.setText('Servidor: Desconectado');
                        this.connectionText.setColor('#ff0000');
                    }
                } catch (error) {
                    console.error('[MenuScene] Error updating connection display:', error);
                }
            }

            // -------------------------
            // Login modal helpers
            // -------------------------
            loadStoredUser() {
                try {
                    const raw = localStorage.getItem('playerUser');
                    if (!raw) return;
                    const user = JSON.parse(raw);
                    this.showUser(user);
                } catch (err) {
                    console.warn('[MenuScene] Error loading stored user:', err);
                }
            }

            showUser(user) {
                this.player = user;
                this.playerInfoText.setText(`Jugador: ${user.name}`);
                this.loginBtn.setText('Cerrar sesión');
                this.loginBtn.off('pointerdown');
                this.loginBtn.on('pointerdown', () => this.logout());
            }

            logout() {
                localStorage.removeItem('playerUser');
                this.player = null;
                this.playerInfoText.setText('');
                this.loginBtn.setText('Iniciar sesión');
                this.loginBtn.off('pointerdown');
                this.loginBtn.on('pointerdown', () => this.openLoginModal());
            }

            openLoginModal() {
                // Prevent multiple modals
                if (this._loginModalOpen) return;
                this._loginModalOpen = true;

                // Disable scene input so clicks don't pass through to the game
                try {
                    this.input.enabled = false;
                } catch (err) {
                    console.warn('[MenuScene] failed to disable input', err);
                }

                // Create DOM modal overlay so user can type properly
                const overlay = document.createElement('div');
                Object.assign(overlay.style, {
                    position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '99999', pointerEvents: 'auto'
                });

                // Prevent clicks from bubbling to canvas or other elements
                // Only intercept clicks on the overlay background (not inside the panel)
                const stopPointer = (e) => {
                    if (e.target === overlay) {
                        // Click on background - prevent interaction with game
                        e.stopPropagation();
                        e.preventDefault();
                    }
                };
                overlay.addEventListener('pointerdown', stopPointer, true);
                overlay.addEventListener('mousedown', stopPointer, true);
                // Also allow clicking the background to close modal
                const backgroundClickHandler = (e) => {
                    if (e.target === overlay) {
                        this.closeLoginModal();
                    }
                };
                overlay.addEventListener('click', backgroundClickHandler, true);

                // Save background click handler so we can remove it later
                this._domBackgroundClickHandler = backgroundClickHandler;

                const panel = document.createElement('div');
                Object.assign(panel.style, {
                    width: '420px', padding: '18px', background: '#0b1220', border: '2px solid #1f6feb', borderRadius: '8px', color: '#dff4ff', fontFamily: 'sans-serif', boxSizing: 'border-box', overflow: 'hidden'
                });

                const title = document.createElement('div');
                title.textContent = 'Login / Nickname';
                Object.assign(title.style, { fontSize: '20px', marginBottom: '8px', textAlign: 'center' });

                const createLabelAndInput = (labelText, type = 'text') => {
                    const wrapper = document.createElement('div');
                    wrapper.style.margin = '8px 0';
                    const label = document.createElement('div');
                    label.textContent = labelText;
                    label.style.marginBottom = '6px';
                    label.style.color = '#dff4ff';
                    const input = document.createElement('input');
                    input.type = type;
                    Object.assign(input.style, {
                        width: '100%', padding: '8px 10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #234', background: '#123', color: '#ffffff', boxSizing: 'border-box', outline: 'none'
                    });
                    wrapper.appendChild(label);
                    wrapper.appendChild(input);
                    return { wrapper, input };
                };

                const emailPair = createLabelAndInput('Email:', 'email');
                const namePair = createLabelAndInput('Nickname:', 'text');

                const feedback = document.createElement('div');
                Object.assign(feedback.style, { color: '#ff8888', minHeight: '18px', marginTop: '6px' });

                const btnRow = document.createElement('div');
                btnRow.style.display = 'flex';
                btnRow.style.justifyContent = 'space-between';
                btnRow.style.marginTop = '12px';

                const enterBtn = document.createElement('button');
                enterBtn.textContent = 'Entrar';
                Object.assign(enterBtn.style, { padding: '8px 14px', background: '#00ff00', border: 'none', borderRadius: '6px', cursor: 'pointer' });

                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Cancelar';
                Object.assign(cancelBtn.style, { padding: '8px 14px', background: '#ff8888', border: 'none', borderRadius: '6px', cursor: 'pointer' });

                btnRow.appendChild(enterBtn);
                btnRow.appendChild(cancelBtn);

                panel.appendChild(title);
                panel.appendChild(emailPair.wrapper);
                panel.appendChild(namePair.wrapper);
                panel.appendChild(feedback);
                panel.appendChild(btnRow);
                overlay.appendChild(panel);
                document.body.appendChild(overlay);

                this._domModal = overlay;
                this._domEmailInput = emailPair.input;
                this._domNameInput = namePair.input;
                this._domFeedback = feedback;

                // Focus email
                this._domEmailInput.focus();

                // Handlers (store references so we can remove them cleanly on close)
                const submitHandler = async () => { await this.submitLoginDom(); };
                const cancelHandler = () => { this.closeLoginModal(); };
                const keyHandler = (e) => { if (e.key === 'Enter') submitHandler(); if (e.key === 'Escape') cancelHandler(); };

                this._domSubmitHandler = submitHandler;
                this._domCancelHandler = cancelHandler;
                this._domKeyHandler = keyHandler;
                this._domStopPointer = stopPointer;

                enterBtn.addEventListener('click', submitHandler);
                cancelBtn.addEventListener('click', cancelHandler);
                document.addEventListener('keydown', keyHandler);

                // Save button refs so we can remove listeners on close
                this._domEnterBtn = enterBtn;
                this._domCancelBtn = cancelBtn;
            }

            closeLoginModal() {
                if (!this._loginModalOpen) return;
                this._loginModalOpen = false;

                // Re-enable scene input
                try { this.input.enabled = true; } catch (err) { console.warn('MenuScene: failed to re-enable input', err); }

                // Remove DOM modal and listeners
                try { if (this._domEnterBtn && this._domSubmitHandler) this._domEnterBtn.removeEventListener('click', this._domSubmitHandler); } catch (err) { console.warn('MenuScene: failed to remove enter button listener', err); }
                try { if (this._domCancelBtn && this._domCancelHandler) this._domCancelBtn.removeEventListener('click', this._domCancelHandler); } catch (err) { console.warn('MenuScene: failed to remove cancel button listener', err); }
                try { if (this._domKeyHandler) document.removeEventListener('keydown', this._domKeyHandler); } catch (err) { console.warn('MenuScene: failed to remove keydown listener', err); }
                try { if (this._domModal && this._domStopPointer) { this._domModal.removeEventListener('pointerdown', this._domStopPointer, true); this._domModal.removeEventListener('mousedown', this._domStopPointer, true); } } catch (err) { console.warn('MenuScene: failed to remove pointer/mousedown listeners', err); }
                try { if (this._domModal && this._domBackgroundClickHandler) { this._domModal.removeEventListener('click', this._domBackgroundClickHandler, true); } } catch (err) { console.warn('MenuScene: failed to remove background click handler', err); }

                if (this._domModal && this._domModal.parentNode) {
                    this._domModal.parentNode.removeChild(this._domModal);
                }

                this._domModal = null;
                this._domEmailInput = null;
                this._domNameInput = null;
                this._domFeedback = null;
                this._domEnterBtn = null;
                this._domCancelBtn = null;
                this._domKeyHandler = null;
                this._domSubmitHandler = null;
                this._domCancelHandler = null;
                this._domStopPointer = null;
            }

            async submitLoginDom() {
                if (!this._domEmailInput || !this._domNameInput || !this._domFeedback) return;

                const email = this._domEmailInput.value.trim();
                const name = this._domNameInput.value.trim();

                if (!email || !name) {
                    this._domFeedback.textContent = 'Email y nickname son requeridos';
                    return;
                }

                try {
                    this._domFeedback.textContent = 'Enviando...';
                    const res = await fetch('/api/users/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, name })
                    });

                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        this._domFeedback.textContent = err.error || 'Error al loguear';
                        return;
                    }

                    const user = await res.json();
                    localStorage.setItem('playerUser', JSON.stringify(user));
                    this.showUser(user);
                    this._domFeedback.textContent = '¡Bienvenido!';

                    setTimeout(() => this.closeLoginModal(), 600);
                } catch (err) {
                    console.error('[MenuScene] Error en login DOM:', err);
                    this._domFeedback.textContent = 'Error de red';
                }
            }

            shutdown() {
                // Remover el listener
                if (this.connectionListener) {
                    connectionManager.removeListener(this.connectionListener);
                }
                // Nota: no detener la música aquí para que siga sonando cuando vayamos a Ajustes
                // Si quieres detener la música al cerrar el menú de forma definitiva, deténla antes de iniciar la nueva escena (ej. GameScene).
            }
    }
