import * as THREE from 'three';

export class PongCabinet {
    constructor(scene, multiplayerManager, wallet) {
        this.scene = scene;
        this.multiplayerManager = multiplayerManager;
        this.wallet = wallet;
        this.modelGroup = new THREE.Group();
        
        // Set up interaction properties
        this.modelGroup.userData = {
            id: 'pong',
            name: 'Pong',
            description: 'Classic arcade Pong game',
            interactive: true,
            number: 12,
            handleClick: this.handleClick.bind(this)
        };
        
        // Create the complete cabinet structure
        this.createCabinetBody();
        this.createControlPanel();
        this.createBackPanel();
        this.createHeader();
        this.createScreen();
        
        // Initialize game state
        this.initializeGameState();
        
        // Start the text flashing
        setInterval(() => this.flashScreen(), 500);
        
        // Position the cabinet between the front and back rows
        this.modelGroup.position.set(-0.5, 0, -4.0); // Keep current position
        this.modelGroup.rotation.y = 0; // Rotate to face north (z = 10)
        
        // Add to scene
        this.scene.add(this.modelGroup);
        
        // Add to global arrays if they exist
        if (window.cabinets) {
            window.cabinets.push(this.modelGroup);
        }
        if (window.cabinetBoxes && window.createCabinetBox) {
            window.cabinetBoxes.push(window.createCabinetBox(this.modelGroup));
        }
    }

    createCabinetBody() {
        // Create basic cabinet body
        const cabinetGeometry = new THREE.BoxGeometry(1.0, 2.1, 0.88);
        const cabinetMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const cabinet = new THREE.Mesh(cabinetGeometry, cabinetMaterial);
        this.modelGroup.add(cabinet);
    }

    createControlPanel() {
        // Create control panel wedge shape
        const wedgeShape = new THREE.Shape();
        wedgeShape.moveTo(-0.5, 0);        // Start at bottom left
        wedgeShape.lineTo(0.5, 0);         // Bottom right
        wedgeShape.lineTo(0.5, 0.4);       // Top right
        wedgeShape.lineTo(-0.5, 0.8);      // Top left (higher to create slope)
        wedgeShape.lineTo(-0.5, 0);        // Back to start

        const extrudeSettings = {
            depth: 1.0,           // Match cabinet width
            bevelEnabled: false
        };

        const wedgeGeometry = new THREE.ExtrudeGeometry(wedgeShape, extrudeSettings);
        const wedgeMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const wedge = new THREE.Mesh(wedgeGeometry, wedgeMaterial);
        
        // Position and rotate wedge
        wedge.position.set(-0.5, 1.5, -0.35);    // Centered position, moved forward
        wedge.rotation.set(Math.PI / 2, Math.PI / 2, 0);  // Rotate 90° around X axis to position angled side behind screen
        this.modelGroup.add(wedge);
    }

    createBackPanel() {
        // Create back panel (cube)
        const backPanelGeometry = new THREE.BoxGeometry(1.0, 0.6, 0.3);  // Reduced depth for back section
        const backPanelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const backPanel = new THREE.Mesh(backPanelGeometry, backPanelMaterial);
        
        // Position back panel behind wedge
        backPanel.position.set(0, 1.7, -0.15);
        this.modelGroup.add(backPanel);
    }

    createHeader() {
        // Create header with "PONG" text
        const headerCanvas = document.createElement('canvas');
        headerCanvas.width = 256;
        headerCanvas.height = 64;
        const headerCtx = headerCanvas.getContext('2d');
        
        // Draw black background
        headerCtx.fillStyle = '#000000';
        headerCtx.fillRect(0, 0, 256, 64);
        
        // Draw text with neon effect
        headerCtx.shadowColor = '#ff0000';
        headerCtx.shadowBlur = 15;
        headerCtx.fillStyle = '#ff0000';
        headerCtx.font = 'bold 40px "Press Start 2P", monospace';
        headerCtx.textAlign = 'center';
        headerCtx.textBaseline = 'middle';
        headerCtx.fillText('PONG', 128, 32);
        
        const headerTexture = new THREE.CanvasTexture(headerCanvas);
        const headerGeometry = new THREE.PlaneGeometry(0.8, 0.2);
        const headerMaterial = new THREE.MeshBasicMaterial({
            map: headerTexture,
            emissive: 0xffffff,
            emissiveMap: headerTexture,
            transparent: true
        });
        const headerText = new THREE.Mesh(headerGeometry, headerMaterial);
        
        // Position header text
        headerText.position.set(0, 2.1, 0);  // Place at the top of the cabinet
        headerText.rotation.x = -0.2;  // Slight tilt for better visibility
        this.modelGroup.add(headerText);
        
        // Create header background shape
        const headerShape = new THREE.Shape();
        headerShape.moveTo(-0.5, 0);      // Bottom left
        headerShape.lineTo(0.5, 0);       // Bottom right
        headerShape.lineTo(0.4, 0.3);     // Top right
        headerShape.lineTo(-0.4, 0.3);    // Top left
        headerShape.lineTo(-0.5, 0);      // Back to start
        
        const headerExtrudeSettings = {
            depth: 0.2,
            bevelEnabled: false
        };
        
        const headerGeometry3D = new THREE.ExtrudeGeometry(headerShape, headerExtrudeSettings);
        const headerMaterial3D = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const header = new THREE.Mesh(headerGeometry3D, headerMaterial3D);
        
        // Position and rotate header
        header.position.set(0, 2.0, -0.04);
        header.rotation.set(0, Math.PI, 0);  // Rotated 180 degrees to face forward
        this.modelGroup.add(header);
    }

    createScreen() {
        // Create screen canvas and context
        const screenCanvas = document.createElement('canvas');
        screenCanvas.width = 512;
        screenCanvas.height = 512;
        const screenContext = screenCanvas.getContext('2d');
        
        // Store canvas and context for later use
        this.screenCanvas = screenCanvas;
        this.screenContext = screenContext;
        
        // Create initial screen texture
        const screenTexture = new THREE.CanvasTexture(screenCanvas);
        const screenGeometry = new THREE.PlaneGeometry(0.8, 0.6);
        const screenMaterial = new THREE.MeshBasicMaterial({
            map: screenTexture,
            emissive: 0xffffff,
            emissiveMap: screenTexture
        });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        
        // Position and rotate screen
        screen.position.set(0, 1.5, 0.27);
        screen.rotation.x = -0.4;
        this.modelGroup.add(screen);
        
        // Store texture reference for updates
        this.screenTexture = screenTexture;
        
        // Draw initial screen content
        this.drawInitialScreen();
    }

    drawInitialScreen() {
        // Clear screen with black background
        this.screenContext.fillStyle = '#000000';
        this.screenContext.fillRect(0, 0, 512, 512);
        
        // Add retro green text with glow effect (common settings)
        this.screenContext.shadowColor = '#00ff00';
        this.screenContext.shadowBlur = 20;
        this.screenContext.fillStyle = '#00ff00';
        this.screenContext.textAlign = 'center';
        this.screenContext.textBaseline = 'middle';
        
        // Draw initial main message with flashing effect
        if (this.modelGroup.userData.isTextVisible) {
            this.screenContext.font = 'bold 28px "Press Start 2P", monospace';
            this.screenContext.fillText('CLICK TO START', 256, 100);
            
            // Draw initial AI text on two lines
            this.screenContext.font = 'bold 20px "Press Start 2P", monospace';
            this.screenContext.fillText('CLICK TO PLAY', 256, 380);
            this.screenContext.fillText('AGAINST AI', 256, 420);
        }
        
        // Update the texture
        this.screenTexture.needsUpdate = true;
    }

    initializeGameState() {
        // Preserve existing userData properties and add game state
        const existingData = { ...this.modelGroup.userData };
        
        // Initialize game state in modelGroup.userData
        this.modelGroup.userData = {
            ...existingData,
            screenContext: this.screenContext,
            screenTexture: this.screenTexture,
            lastFlashTime: 0,
            isTextVisible: true,
            currentMessage: 'CLICK TO START',
            gameState: 'title',
            
            // Initialize audio context
            audioContext: new (window.AudioContext || window.webkitAudioContext)(),
            
            // Add score tracking
            leftScore: 0,
            rightScore: 0,
            gameOverStartTime: 0,
            
            // Add paddle state
            leftPaddleY: 216,
            rightPaddleY: 216,
            paddleSpeed: 8,
            paddleHeight: 80,
            
            // Add ball state with constant speed
            ballX: 256,
            ballY: 256,
            ballSize: 8,
            BALL_BASE_SPEED: 8,
            ballSpeedX: 8,
            ballSpeedY: 0,
            lastPaddleY: 216,
            
            // Add scoring state
            scoreFlashCount: 0,
            scoreFlashTime: 0,
            scoringState: null,
            
            // Add multiplayer state
            isMultiplayer: false,
            player1Id: null,
            player2Id: null,
            lastUpdateTime: 0,
            updateInterval: 50,
            targetLeftPaddleY: 256,
            targetRightPaddleY: 256,
            lastLeftPaddleY: 256,
            lastRightPaddleY: 256,
            
            // Add AI state
            rightPaddleSpeed: 4,
            aiDifficultyFactor: 0.92,
            
            // Add explosion state
            explosionParticles: [],
            
            // Add reset state
            resetStartTime: 0,
            resetState: 'waiting'
        };

        // Bind methods to userData
        this.bindGameMethods();
    }

    bindGameMethods() {
        // Bind all game methods to userData
        this.modelGroup.userData.playPaddleHitSound = this.playPaddleHitSound.bind(this);
        this.modelGroup.userData.playScoreSound = this.playScoreSound.bind(this);
        this.modelGroup.userData.resetBall = this.resetBall.bind(this);
        this.modelGroup.userData.createExplosion = this.createExplosion.bind(this);
        this.modelGroup.userData.updateExplosion = this.updateExplosion.bind(this);
        this.modelGroup.userData.handleClick = this.handleClick.bind(this);
        this.modelGroup.userData.updatePaddle = this.updatePaddle.bind(this);
        this.modelGroup.userData.updateBall = this.updateBall.bind(this);
        this.modelGroup.userData.updateScreen = this.updateScreen.bind(this);
        this.modelGroup.userData.flashScreen = this.flashScreen.bind(this);
        this.modelGroup.userData.updateAIPaddle = this.updateAIPaddle.bind(this);
    }

    playPaddleHitSound() {
        const oscillator = this.modelGroup.userData.audioContext.createOscillator();
        const gainNode = this.modelGroup.userData.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.modelGroup.userData.audioContext.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(440, this.modelGroup.userData.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, this.modelGroup.userData.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, this.modelGroup.userData.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.modelGroup.userData.audioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(this.modelGroup.userData.audioContext.currentTime + 0.1);
    }

    playScoreSound() {
        const oscillator = this.modelGroup.userData.audioContext.createOscillator();
        const gainNode = this.modelGroup.userData.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.modelGroup.userData.audioContext.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(880, this.modelGroup.userData.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(220, this.modelGroup.userData.audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.1, this.modelGroup.userData.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.modelGroup.userData.audioContext.currentTime + 0.3);
        
        oscillator.start();
        oscillator.stop(this.modelGroup.userData.audioContext.currentTime + 0.3);
    }

    resetBall() {
        // Stop the ball and set up reset sequence
        this.modelGroup.userData.ballSpeedX = 0;
        this.modelGroup.userData.ballSpeedY = 0;
        this.modelGroup.userData.resetStartTime = Date.now();
        this.modelGroup.userData.resetState = 'waiting'; // States: waiting -> resetting -> launching -> playing
    }

    createExplosion(x, y) {
        // Create 8 particles in different directions
        this.modelGroup.userData.explosionParticles = [];
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            this.modelGroup.userData.explosionParticles.push({
                x: x,
                y: y,
                speedX: Math.cos(angle) * 4,
                speedY: Math.sin(angle) * 4,
                size: 6,
                life: 1.0 // Life from 1.0 to 0.0
            });
        }
    }

    updateExplosion() {
        // Update each particle
        for (let i = this.modelGroup.userData.explosionParticles.length - 1; i >= 0; i--) {
            const particle = this.modelGroup.userData.explosionParticles[i];
            
            // Move particle
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Decrease life
            particle.life -= 0.05;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.modelGroup.userData.explosionParticles.splice(i, 1);
            }
        }
    }

    updatePaddle() {
        if (this.modelGroup.userData.gameState === 'playing') {
            // Store previous paddle position
            this.modelGroup.userData.lastPaddleY = this.modelGroup.userData.leftPaddleY;
            
            // Get arrow key states
            const upPressed = window.getKey('ArrowUp');
            const downPressed = window.getKey('ArrowDown');
            
            // Handle paddle movement based on game mode
            if (this.modelGroup.userData.isMultiplayer) {
                // In multiplayer mode, each player controls their own paddle
                if (this.multiplayerManager.socket.id === this.modelGroup.userData.player2Id) {
                    // Player 2 controls right paddle
                    if (upPressed) {
                        this.modelGroup.userData.rightPaddleY = Math.max(
                            0, 
                            this.modelGroup.userData.rightPaddleY - this.modelGroup.userData.paddleSpeed
                        );
                    }
                    if (downPressed) {
                        this.modelGroup.userData.rightPaddleY = Math.min(
                            512 - this.modelGroup.userData.paddleHeight,
                            this.modelGroup.userData.rightPaddleY + this.modelGroup.userData.paddleSpeed
                        );
                    }
                    
                    // Rate limit paddle position updates
                    const now = Date.now();
                    if (now - this.modelGroup.userData.lastUpdateTime > this.modelGroup.userData.updateInterval) {
                        if (upPressed || downPressed) {
                            this.multiplayerManager.socket.emit('pongPaddleMove', {
                                cabinetId: this.modelGroup.userData.id,
                                paddleY: this.modelGroup.userData.rightPaddleY,
                                playerId: this.multiplayerManager.socket.id
                            });
                        }
                        this.modelGroup.userData.lastUpdateTime = now;
                    }
                } else {
                    // Player 1 controls left paddle
                    if (upPressed) {
                        this.modelGroup.userData.leftPaddleY = Math.max(
                            0, 
                            this.modelGroup.userData.leftPaddleY - this.modelGroup.userData.paddleSpeed
                        );
                    }
                    if (downPressed) {
                        this.modelGroup.userData.leftPaddleY = Math.min(
                            512 - this.modelGroup.userData.paddleHeight,
                            this.modelGroup.userData.leftPaddleY + this.modelGroup.userData.paddleSpeed
                        );
                    }
                    
                    // Rate limit paddle position updates
                    const now = Date.now();
                    if (now - this.modelGroup.userData.lastUpdateTime > this.modelGroup.userData.updateInterval) {
                        if (upPressed || downPressed) {
                            this.multiplayerManager.socket.emit('pongPaddleMove', {
                                cabinetId: this.modelGroup.userData.id,
                                paddleY: this.modelGroup.userData.leftPaddleY,
                                playerId: this.multiplayerManager.socket.id
                            });
                        }
                        this.modelGroup.userData.lastUpdateTime = now;
                    }
                }
            } else {
                // Single player mode - player controls left paddle only
                if (upPressed) {
                    this.modelGroup.userData.leftPaddleY = Math.max(
                        0, 
                        this.modelGroup.userData.leftPaddleY - this.modelGroup.userData.paddleSpeed
                    );
                }
                if (downPressed) {
                    this.modelGroup.userData.leftPaddleY = Math.min(
                        512 - this.modelGroup.userData.paddleHeight,
                        this.modelGroup.userData.leftPaddleY + this.modelGroup.userData.paddleSpeed
                    );
                }
                
                // Update AI paddle in single player mode
                this.updateAIPaddle();
            }
            
            // Always update the screen after any movement
            this.updateScreen();
        }
    }

    updateAIPaddle() {
        if (this.modelGroup.userData.gameState === 'playing') {
            // Predict where ball will intersect with paddle's x position
            const distanceToAI = 452 - this.modelGroup.userData.ballX; // x distance to AI paddle
            const timeToIntercept = distanceToAI / Math.abs(this.modelGroup.userData.ballSpeedX);
            const predictedY = this.modelGroup.userData.ballY + (this.modelGroup.userData.ballSpeedY * timeToIntercept);
            
            // Add some randomness to make AI imperfect
            const targetY = predictedY * this.modelGroup.userData.aiDifficultyFactor;
            
            // Move paddle towards predicted position
            const paddleCenter = this.modelGroup.userData.rightPaddleY + 40; // Center of paddle
            
            if (paddleCenter < targetY - 10) {
                // Move down
                this.modelGroup.userData.rightPaddleY = Math.min(
                    512 - 80,
                    this.modelGroup.userData.rightPaddleY + this.modelGroup.userData.rightPaddleSpeed
                );
            } else if (paddleCenter > targetY + 10) {
                // Move up
                this.modelGroup.userData.rightPaddleY = Math.max(
                    0,
                    this.modelGroup.userData.rightPaddleY - this.modelGroup.userData.rightPaddleSpeed
                );
            }
        }
    }

    handleClick() {
        console.log('PongCabinet handleClick called', {
            gameState: this.modelGroup.userData.gameState,
            socketId: this.multiplayerManager.socket.id
        });
        
        if (this.modelGroup.userData.gameState === 'title') {
            this.modelGroup.userData.gameState = 'waiting';
            this.modelGroup.userData.currentMessage = '';
            this.modelGroup.userData.player1Id = this.multiplayerManager.socket.id;
            this.updateScreen();
            
            // Emit game state change
            this.multiplayerManager.socket.emit('pongStateChange', {
                cabinetId: this.modelGroup.userData.id,
                state: 'waiting',
                player1Id: this.multiplayerManager.socket.id
            });
        } else if (this.modelGroup.userData.gameState === 'waiting') {
            // Check if this is player 1 clicking again (for AI mode) or a different player (for multiplayer)
            if (this.multiplayerManager.socket.id === this.modelGroup.userData.player1Id) {
                // Player 1 clicked again - start AI mode
                this.modelGroup.userData.gameState = 'playing';
                this.modelGroup.userData.isMultiplayer = false;
                this.modelGroup.userData.currentMessage = '';
                this.modelGroup.userData.leftScore = 0;
                this.modelGroup.userData.rightScore = 0;
                this.resetBall();
                this.updateScreen();
                
                // Emit game state change for AI mode
                this.multiplayerManager.socket.emit('pongStateChange', {
                    cabinetId: this.modelGroup.userData.id,
                    state: 'playing',
                    isMultiplayer: false,
                    player1Id: this.multiplayerManager.socket.id
                });
            } else {
                // Different player clicked - start multiplayer mode
                this.modelGroup.userData.gameState = 'playing';
                this.modelGroup.userData.isMultiplayer = true;
                this.modelGroup.userData.player2Id = this.multiplayerManager.socket.id;
                this.modelGroup.userData.currentMessage = '';
                this.modelGroup.userData.leftScore = 0;
                this.modelGroup.userData.rightScore = 0;
                this.resetBall();
                this.updateScreen();
                
                // Emit game state change for multiplayer mode
                this.multiplayerManager.socket.emit('pongStateChange', {
                    cabinetId: this.modelGroup.userData.id,
                    state: 'playing',
                    isMultiplayer: true,
                    player1Id: this.modelGroup.userData.player1Id,
                    player2Id: this.multiplayerManager.socket.id
                });
            }
        }
    }

    flashScreen() {
        const currentTime = Date.now();
        
        // Always update screen in game over state to ensure flashing works
        if (this.modelGroup.userData.gameState === 'gameover') {
            this.updateScreen();
            return;
        }
        
        // Handle normal flashing for other states
        if (currentTime - this.modelGroup.userData.lastFlashTime > 500) {
            this.modelGroup.userData.isTextVisible = !this.modelGroup.userData.isTextVisible;
            this.modelGroup.userData.lastFlashTime = currentTime;
            this.updateScreen();
        }
    }

    updateBall() {
        if (this.modelGroup.userData.gameState === 'playing') {
            // Handle reset sequence if active
            if (this.modelGroup.userData.resetState !== 'playing') {
                const currentTime = Date.now();
                const timeSinceReset = currentTime - this.modelGroup.userData.resetStartTime;

                if (timeSinceReset >= 2000 && this.modelGroup.userData.resetState === 'waiting') {
                    // Reset paddles and ball position after 2 seconds
                    this.modelGroup.userData.leftPaddleY = 216;
                    this.modelGroup.userData.rightPaddleY = 216;
                    this.modelGroup.userData.ballX = 256;
                    this.modelGroup.userData.ballY = 256;
                    
                    // Emit paddle positions in multiplayer
                    if (this.modelGroup.userData.isMultiplayer) {
                        this.multiplayerManager.socket.emit('pongPaddleMove', {
                            cabinetId: this.modelGroup.userData.id,
                            paddleY: this.multiplayerManager.socket.id === this.modelGroup.userData.player2Id ? 
                                this.modelGroup.userData.rightPaddleY : this.modelGroup.userData.leftPaddleY,
                            playerId: this.multiplayerManager.socket.id
                        });
                    }
                    
                    this.modelGroup.userData.resetState = 'resetting';
                } else if (timeSinceReset >= 3000 && this.modelGroup.userData.resetState === 'resetting') {
                    // Launch ball after 3 seconds
                    this.modelGroup.userData.ballSpeedX = this.modelGroup.userData.BALL_BASE_SPEED * (Math.random() < 0.5 ? -1 : 1);
                    this.modelGroup.userData.ballSpeedY = 0;
                    
                    // Emit ball update in multiplayer
                    if (this.modelGroup.userData.isMultiplayer) {
                        this.multiplayerManager.socket.emit('pongBallUpdate', {
                            cabinetId: this.modelGroup.userData.id,
                            x: this.modelGroup.userData.ballX,
                            y: this.modelGroup.userData.ballY,
                            speedX: this.modelGroup.userData.ballSpeedX,
                            speedY: this.modelGroup.userData.ballSpeedY
                        });
                    }
                    
                    this.modelGroup.userData.resetState = 'playing';
                }
                
                this.updateScreen();
                return;
            }

            // If we're in scoring state, handle score animation
            if (this.modelGroup.userData.scoringState) {
                const currentTime = Date.now();
                const flashDuration = currentTime - this.modelGroup.userData.scoreFlashTime;
                
                // Update explosion if it exists
                if (this.modelGroup.userData.explosionParticles.length > 0) {
                    this.updateExplosion();
                }
                
                // Each flash cycle is 400ms (200ms on, 200ms off)
                if (flashDuration >= 1200) { // 3 flashes = 1200ms
                    // Reset scoring state and reset ball
                    this.modelGroup.userData.scoringState = null;
                    this.modelGroup.userData.explosionParticles = []; // Clear any remaining particles
                    this.resetBall();
                    
                    // Emit ball reset
                    this.multiplayerManager.socket.emit('pongBallUpdate', {
                        cabinetId: this.modelGroup.userData.id,
                        x: this.modelGroup.userData.ballX,
                        y: this.modelGroup.userData.ballY,
                        speedX: this.modelGroup.userData.ballSpeedX,
                        speedY: this.modelGroup.userData.ballSpeedY
                    });
                }
                
                // Update screen to show flash animation and explosion
                this.updateScreen();
                return;
            }
            
            // Move ball
            this.modelGroup.userData.ballX += this.modelGroup.userData.ballSpeedX;
            this.modelGroup.userData.ballY += this.modelGroup.userData.ballSpeedY;
            
            // Ball collision with top and bottom walls
            if (this.modelGroup.userData.ballY < 0 || this.modelGroup.userData.ballY > 512) {
                this.modelGroup.userData.ballSpeedY = -this.modelGroup.userData.ballSpeedY;
            }
            
            // Check for paddle collisions and scoring
            if (this.modelGroup.userData.ballX < 0) { // Past left edge
                // Create explosion at impact point
                this.createExplosion(this.modelGroup.userData.ballX, this.modelGroup.userData.ballY);
                
                // Point for right side (Player Two)
                this.modelGroup.userData.rightScore++;
                
                // Check for game over
                if (this.modelGroup.userData.rightScore >= 3) {
                    // Clear ALL visual effects first
                    this.modelGroup.userData.explosionParticles = [];
                    this.screenContext.shadowBlur = 0;  // Clear any lingering glow effects
                    this.screenContext.fillStyle = '#000000';
                    this.screenContext.fillRect(0, 0, 512, 512);  // Clear the entire screen
                    
                    // Then set game over state
                    this.modelGroup.userData.gameState = 'gameover';
                    this.modelGroup.userData.gameOverStartTime = Date.now();
                    this.modelGroup.userData.isTextVisible = true;
                    this.modelGroup.userData.scoringState = null;
                    
                    // Don't reset ball position yet - keep it at the scoring position
                    // Only reset paddles
                    this.modelGroup.userData.leftPaddleY = 216;
                    this.modelGroup.userData.rightPaddleY = 216;
                    this.modelGroup.userData.ballSpeedX = 0;
                    this.modelGroup.userData.ballSpeedY = 0;
                    
                    // Emit game over
                    this.multiplayerManager.socket.emit('pongGameOver', {
                        cabinetId: this.modelGroup.userData.id,
                        leftScore: this.modelGroup.userData.leftScore,
                        rightScore: this.modelGroup.userData.rightScore
                    });
                    
                    this.updateScreen(); // Force immediate update
                    return;
                }
                
                // If not game over, proceed with normal scoring sequence
                this.modelGroup.userData.scoringState = 'right';
                this.modelGroup.userData.scoreFlashTime = Date.now();
                this.playScoreSound();
                
                // Emit score update
                this.multiplayerManager.socket.emit('pongScoreUpdate', {
                    cabinetId: this.modelGroup.userData.id,
                    leftScore: this.modelGroup.userData.leftScore,
                    rightScore: this.modelGroup.userData.rightScore,
                    scoringState: this.modelGroup.userData.scoringState
                });
            } else if (this.modelGroup.userData.ballX > 512) { // Past right edge
                // Create explosion at impact point
                this.createExplosion(this.modelGroup.userData.ballX, this.modelGroup.userData.ballY);
                
                // Point for left side (Player One)
                this.modelGroup.userData.leftScore++;
                
                // Check for game over
                if (this.modelGroup.userData.leftScore >= 10) {
                    // Clear ALL visual effects first
                    this.modelGroup.userData.explosionParticles = [];
                    this.screenContext.shadowBlur = 0;  // Clear any lingering glow effects
                    this.screenContext.fillStyle = '#000000';
                    this.screenContext.fillRect(0, 0, 512, 512);  // Clear the entire screen
                    
                    // Then set game over state
                    this.modelGroup.userData.gameState = 'gameover';
                    this.modelGroup.userData.gameOverStartTime = Date.now();
                    this.modelGroup.userData.isTextVisible = true;
                    this.modelGroup.userData.scoringState = null;
                    
                    // Don't reset ball position yet - keep it at the scoring position
                    // Only reset paddles
                    this.modelGroup.userData.leftPaddleY = 216;
                    this.modelGroup.userData.rightPaddleY = 216;
                    this.modelGroup.userData.ballSpeedX = 0;
                    this.modelGroup.userData.ballSpeedY = 0;
                    
                    // Add coin reward for winning against AI
                    if (!this.modelGroup.userData.isMultiplayer) {
                        this.wallet.addCoins(1);
                    }
                    
                    // Emit game over
                    this.multiplayerManager.socket.emit('pongGameOver', {
                        cabinetId: this.modelGroup.userData.id,
                        leftScore: this.modelGroup.userData.leftScore,
                        rightScore: this.modelGroup.userData.rightScore
                    });
                    
                    this.updateScreen(); // Force immediate update
                    return;
                }
                
                // If not game over, proceed with normal scoring sequence
                this.modelGroup.userData.scoringState = 'left';
                this.modelGroup.userData.scoreFlashTime = Date.now();
                this.playScoreSound();
                
                // Emit score update
                this.multiplayerManager.socket.emit('pongScoreUpdate', {
                    cabinetId: this.modelGroup.userData.id,
                    leftScore: this.modelGroup.userData.leftScore,
                    rightScore: this.modelGroup.userData.rightScore,
                    scoringState: this.modelGroup.userData.scoringState
                });
            }
            
            // Check for paddle hits
            const leftPaddleRight = 60;
            const rightPaddleLeft = 452;
            
            // Left paddle collision
            if (this.modelGroup.userData.ballX <= leftPaddleRight && 
                this.modelGroup.userData.ballX > leftPaddleRight - Math.abs(this.modelGroup.userData.ballSpeedX) &&
                this.modelGroup.userData.ballY >= this.modelGroup.userData.leftPaddleY && 
                this.modelGroup.userData.ballY <= this.modelGroup.userData.leftPaddleY + 80) {
                
                // Play paddle hit sound
                this.playPaddleHitSound();
                
                // Set ball position to just right of paddle to ensure visual contact
                this.modelGroup.userData.ballX = leftPaddleRight + this.modelGroup.userData.ballSize/2;
                
                // Calculate relative hit position (-0.5 to 0.5)
                const relativeHitPos = (this.modelGroup.userData.ballY - (this.modelGroup.userData.leftPaddleY + 40)) / 80;
                
                // Calculate angle based on hit position (maximum ±36° or ±0.2π)
                const angle = relativeHitPos * 0.4 * Math.PI;
                
                // Set ball velocity using consistent speed and angle
                this.modelGroup.userData.ballSpeedX = this.modelGroup.userData.BALL_BASE_SPEED * Math.cos(angle);
                this.modelGroup.userData.ballSpeedY = this.modelGroup.userData.BALL_BASE_SPEED * Math.sin(angle);
            }
            
            // Right paddle collision
            if (this.modelGroup.userData.ballX >= rightPaddleLeft && 
                this.modelGroup.userData.ballX < rightPaddleLeft + Math.abs(this.modelGroup.userData.ballSpeedX) &&
                this.modelGroup.userData.ballY >= this.modelGroup.userData.rightPaddleY && 
                this.modelGroup.userData.ballY <= this.modelGroup.userData.rightPaddleY + 80) {
                
                // Play paddle hit sound
                this.playPaddleHitSound();
                
                // Set ball position to just left of paddle to ensure visual contact
                this.modelGroup.userData.ballX = rightPaddleLeft - this.modelGroup.userData.ballSize/2;
                
                // Calculate relative hit position (-0.5 to 0.5)
                const relativeHitPos = (this.modelGroup.userData.ballY - (this.modelGroup.userData.rightPaddleY + 40)) / 80;
                
                // Calculate angle based on hit position (maximum ±36° or ±0.2π)
                const angle = relativeHitPos * 0.4 * Math.PI;
                
                // Set ball velocity using consistent speed and angle
                this.modelGroup.userData.ballSpeedX = -this.modelGroup.userData.BALL_BASE_SPEED * Math.cos(angle);
                this.modelGroup.userData.ballSpeedY = this.modelGroup.userData.BALL_BASE_SPEED * Math.sin(angle);
            }
            
            // Emit ball position update
            this.multiplayerManager.socket.emit('pongBallUpdate', {
                cabinetId: this.modelGroup.userData.id,
                x: this.modelGroup.userData.ballX,
                y: this.modelGroup.userData.ballY,
                speedX: this.modelGroup.userData.ballSpeedX,
                speedY: this.modelGroup.userData.ballSpeedY
            });
            
            // Update the screen
            this.updateScreen();
        }
    }

    updateScreen() {
        // Clear the canvas with no glow effect
        this.screenContext.shadowBlur = 0;
        this.screenContext.fillStyle = '#000000';
        this.screenContext.fillRect(0, 0, 512, 512);
        
        if (this.modelGroup.userData.gameState === 'playing') {
            // Add glow effect for gameplay elements
            this.screenContext.shadowColor = '#00ff00';
            this.screenContext.shadowBlur = 20;
            this.screenContext.fillStyle = '#00ff00';
            
            // Draw scores with flash effect if scoring
            this.screenContext.font = 'bold 32px "Press Start 2P", monospace';
            this.screenContext.textAlign = 'center';
            
            const currentTime = Date.now();
            if (this.modelGroup.userData.scoringState === 'left' && 
                Math.floor((currentTime - this.modelGroup.userData.scoreFlashTime) / 200) % 2 === 0) {
                this.screenContext.fillStyle = '#ffffff';
            }
            this.screenContext.fillText(this.modelGroup.userData.leftScore.toString(), 128, 64);
            this.screenContext.fillStyle = '#00ff00';
            
            if (this.modelGroup.userData.scoringState === 'right' && 
                Math.floor((currentTime - this.modelGroup.userData.scoreFlashTime) / 200) % 2 === 0) {
                this.screenContext.fillStyle = '#ffffff';
            }
            this.screenContext.fillText(this.modelGroup.userData.rightScore.toString(), 384, 64);
            this.screenContext.fillStyle = '#00ff00';
            
            // Draw left paddle
            this.screenContext.fillRect(50, this.modelGroup.userData.leftPaddleY, 10, this.modelGroup.userData.paddleHeight);
            
            // Draw right paddle
            this.screenContext.fillRect(452, this.modelGroup.userData.rightPaddleY, 10, 80);
            
            // Only draw ball if not in scoring state
            if (!this.modelGroup.userData.scoringState) {
                this.screenContext.fillRect(
                    this.modelGroup.userData.ballX - this.modelGroup.userData.ballSize/2,
                    this.modelGroup.userData.ballY - this.modelGroup.userData.ballSize/2,
                    this.modelGroup.userData.ballSize,
                    this.modelGroup.userData.ballSize
                );
            }
            
            // Draw explosion particles
            if (this.modelGroup.userData.explosionParticles.length > 0) {
                this.screenContext.fillStyle = '#ffa500'; // Orange color
                for (const particle of this.modelGroup.userData.explosionParticles) {
                    const size = particle.size * particle.life;
                    this.screenContext.fillRect(
                        particle.x - size/2,
                        particle.y - size/2,
                        size,
                        size
                    );
                }
            }
        } else if (this.modelGroup.userData.gameState === 'gameover') {
            // Game over display with dramatic flashing
            const currentTime = Date.now();
            const timeSinceGameOver = currentTime - this.modelGroup.userData.gameOverStartTime;
            
            // Only proceed to title screen after exactly 5 seconds
            if (timeSinceGameOver >= 5000) {
                this.modelGroup.userData.gameState = 'title';
                this.modelGroup.userData.currentMessage = 'CLICK TO START';
                this.modelGroup.userData.leftScore = 0;
                this.modelGroup.userData.rightScore = 0;
                this.modelGroup.userData.scoringState = null;
                this.modelGroup.userData.explosionParticles = [];
                // Now is when we reset the ball position to center for the next game
                this.modelGroup.userData.ballX = 256;
                this.modelGroup.userData.ballY = 256;
                this.updateScreen();
                return;
            }
            
            // Flash pattern: 0.7s on, 0.3s off
            const flashPhase = (timeSinceGameOver % 1000) / 1000;
            const isVisible = flashPhase < 0.7;
            
            if (isVisible) {
                // Only add glow effect for the game over text
                this.screenContext.shadowColor = '#00ff00';
                this.screenContext.shadowBlur = 30;
                this.screenContext.fillStyle = '#00ff00';
                this.screenContext.textAlign = 'center';
                this.screenContext.textBaseline = 'middle';
                this.screenContext.font = 'bold 32px "Press Start 2P", monospace';
                
                const winner = this.modelGroup.userData.leftScore > this.modelGroup.userData.rightScore ? 'ONE' : 'TWO';
                this.screenContext.fillText(`PLAYER ${winner} WINS`, 256, 256);
            }
        } else {
            // Title or waiting state display
            this.screenContext.shadowColor = '#00ff00';
            this.screenContext.shadowBlur = 20;
            this.screenContext.fillStyle = '#00ff00';
            this.screenContext.textAlign = 'center';
            this.screenContext.textBaseline = 'middle';
            
            // Draw text based on game state
            if (this.modelGroup.userData.gameState === 'title') {
                if (this.modelGroup.userData.isTextVisible) {
                    // Only show "CLICK TO START" in title state
                    this.screenContext.font = 'bold 28px "Press Start 2P", monospace';
                    this.screenContext.fillText('CLICK TO START', 256, 100);
                }
            } else if (this.modelGroup.userData.gameState === 'waiting') {
                if (this.modelGroup.userData.isTextVisible) {
                    // Flash "WAITING FOR PLAYER 2" in waiting state
                    this.screenContext.font = 'bold 28px "Press Start 2P", monospace';
                    this.screenContext.fillText('WAITING FOR', 256, 100);
                    this.screenContext.fillText('PLAYER 2', 256, 140);
                }
                
                // Always show AI option
                this.screenContext.font = 'bold 20px "Press Start 2P", monospace';
                this.screenContext.fillText('CLICK TO PLAY', 256, 380);
                this.screenContext.fillText('AGAINST AI', 256, 420);
            }
        }
        
        // Update the texture
        this.screenTexture.needsUpdate = true;
    }
} 