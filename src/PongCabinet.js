import * as THREE from 'three';

export class PongCabinet {
    constructor(scene, multiplayerManager) {
        this.scene = scene;
        this.multiplayerManager = multiplayerManager;
        this.players = new Map();
        this.state = 'IDLE';
        this.group = new THREE.Group();
        this.wasEKeyPressed = false;  // Track previous E key state
        
        // Cabinet dimensions (matching other cabinets)
        this.dimensions = {
            width: 1.0,
            height: 2.0,
            depth: 0.7
        };

        // Create basic cabinet structure
        this.setupCabinet();
        
        // Create collision box
        this.collisionBox = new THREE.Box3();
        this.updateCollisionBox();
        
        // Add user data for interaction system
        this.group.userData = {
            id: 'pong-cabinet',
            name: 'Pong',
            description: 'Classic multiplayer Pong game',
            interactive: true,
            number: 12
        };

        // Add canvas for dynamic screen content
        this.screenCanvas = document.createElement('canvas');
        this.screenCanvas.width = 512;
        this.screenCanvas.height = 512;
        this.screenContext = this.screenCanvas.getContext('2d');
        this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
        
        // Update screen material to use the canvas texture
        const screenGeometry = new THREE.PlaneGeometry(0.8, 0.6);
        const screenMaterial = new THREE.MeshBasicMaterial({
            map: this.screenTexture,
            emissive: 0xffffff,
            emissiveMap: this.screenTexture
        });
        this.screen = new THREE.Mesh(screenGeometry, screenMaterial);
        this.screen.position.z = this.dimensions.depth / 2 + 0.001;
        this.screen.position.y = 0.3;

        // Initial display state
        this.updateDisplay("CLICK TO PLAY");
    }

    setupCabinet() {
        // Basic cabinet body
        const cabinetGeometry = new THREE.BoxGeometry(
            this.dimensions.width,
            this.dimensions.height,
            this.dimensions.depth
        );
        const cabinetMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.cabinet = new THREE.Mesh(cabinetGeometry, cabinetMaterial);
        
        // Create number label
        this.createNumberLabel();

        // Add everything to the group
        this.group.add(this.cabinet);
        this.group.add(this.screen);

        // Position cabinet (next to cabinet 11)
        this.group.position.set(-0.0, 0, -9.5);
    }

    createNumberLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Clear background
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 128, 128);

        // Draw number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('12', 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        const labelGeometry = new THREE.PlaneGeometry(0.3, 0.3);
        const label = new THREE.Mesh(labelGeometry, material);
        
        // Position label on floor
        label.position.set(0, 0.01, 0);
        label.rotation.x = -Math.PI / 2;
        
        this.group.add(label);
    }

    updateCollisionBox() {
        this.collisionBox.setFromObject(this.cabinet);
    }

    handleInteraction(playerId) {
        switch (this.state) {
            case 'IDLE':
                this.addPlayer(playerId, 1);
                this.state = 'WAITING_P2';
                this.updateDisplay("Waiting for Player 2...");
                break;
                
            case 'WAITING_P2':
                if (!this.players.has(playerId)) {
                    this.addPlayer(playerId, 2);
                    this.state = 'ACTIVE';
                    this.updateDisplay("Game Starting...");
                    this.startGame();
                }
                break;
        }
    }

    addPlayer(playerId, playerNumber) {
        this.players.set(playerId, {
            number: playerNumber,
            score: 0
        });
        
        // Emit through multiplayer system
        this.multiplayerManager.socket.emit('pongPlayerJoined', {
            playerId,
            playerNumber,
            cabinetId: this.group.userData.id
        });
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        if (this.state !== 'IDLE') {
            this.state = 'IDLE';
            this.updateDisplay("CLICK TO PLAY");
        }
    }

    updateDisplay(message) {
        // Clear the canvas
        this.screenContext.fillStyle = '#000000';
        this.screenContext.fillRect(0, 0, 512, 512);
        
        // Add a retro green glow effect
        this.screenContext.shadowColor = '#00ff00';
        this.screenContext.shadowBlur = 20;
        
        // Set up text style
        this.screenContext.fillStyle = '#00ff00';
        this.screenContext.font = 'bold 36px "Press Start 2P", monospace';
        this.screenContext.textAlign = 'center';
        this.screenContext.textBaseline = 'middle';
        
        // Draw the message
        const lines = message.split('\n');
        lines.forEach((line, index) => {
            const yPos = 256 + (index - lines.length/2) * 50;
            this.screenContext.fillText(line, 256, yPos);
        });
        
        // Update the texture
        this.screenTexture.needsUpdate = true;
    }

    startGame() {
        this.updateDisplay("Game Starting...\nGet Ready!");
        // Will implement actual game logic later
        console.log("Starting Pong game");
    }

    update(renderer) {
        // Check for 'E' key press when cabinet is being interacted with
        const isEKeyPressed = window.getKey('KeyE');
        const isInteracting = this.isBeingInteractedWith();
        
        // Debug logging
        if (isEKeyPressed) {
            console.log('E key is pressed');
            console.log('Is being interacted with:', isInteracting);
            console.log('Previous E key state:', this.wasEKeyPressed);
            console.log('Current state:', this.state);
        }
        
        // Only trigger on the initial press, not while holding
        if (isEKeyPressed && !this.wasEKeyPressed && isInteracting) {
            console.log('Handling interaction!');
            this.handleInteraction(this.multiplayerManager.socket.id);
        }
        
        // Update previous key state
        this.wasEKeyPressed = isEKeyPressed;
        
        // Will implement game rendering later
    }

    isBeingInteractedWith() {
        // This method will be called by the interaction system to check if the cabinet is currently being looked at
        return this.group.userData.isBeingInteractedWith === true;
    }
} 