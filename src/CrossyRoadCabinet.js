import * as THREE from 'three';

export class CrossyRoadCabinet {
    constructor(scene, multiplayerManager, wallet) {
        this.scene = scene;
        this.multiplayerManager = multiplayerManager;
        this.wallet = wallet;
        this.modelGroup = new THREE.Group();
        
        // Create the complete cabinet structure
        this.createCabinetBody();
        this.createControlPanel();
        this.createBackPanel();
        this.createHeader();
        this.createScreen();
        
        // Initialize game state
        this.initializeGameState();
        
        // Position the cabinet
        this.modelGroup.position.set(1.0, 0, 0.5);
        this.modelGroup.rotation.y = 0; // No rotation - facing north
        
        // Add to scene
        this.scene.add(this.modelGroup);
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
        wedge.position.set(-0.5, 1.5, -0.35);
        wedge.rotation.set(Math.PI / 2, Math.PI / 2, 0);
        this.modelGroup.add(wedge);
    }

    createBackPanel() {
        // Create back panel (cube)
        const backPanelGeometry = new THREE.BoxGeometry(1.0, 0.6, 0.3);
        const backPanelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const backPanel = new THREE.Mesh(backPanelGeometry, backPanelMaterial);
        
        // Position back panel behind wedge
        backPanel.position.set(0, 1.7, -0.15);
        this.modelGroup.add(backPanel);
    }

    createHeader() {
        // Create header with "CROSSY ROAD" text
        const headerCanvas = document.createElement('canvas');
        headerCanvas.width = 256;
        headerCanvas.height = 64;
        const headerCtx = headerCanvas.getContext('2d');
        
        // Draw black background
        headerCtx.fillStyle = '#000000';
        headerCtx.fillRect(0, 0, 256, 64);
        
        // Draw text with neon effect
        headerCtx.shadowColor = '#00ff88';
        headerCtx.shadowBlur = 15;
        headerCtx.fillStyle = '#00ff88';
        headerCtx.font = 'bold 32px "Arial Black", sans-serif';
        headerCtx.textAlign = 'center';
        headerCtx.textBaseline = 'middle';
        headerCtx.fillText('CROSSY', 128, 22);
        headerCtx.fillText('ROAD', 128, 42);
        
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
        headerText.position.set(0, 2.1, 0);
        headerText.rotation.x = -0.2;
        this.modelGroup.add(headerText);
        
        // Create header background shape
        const headerShape = new THREE.Shape();
        headerShape.moveTo(-0.5, 0);
        headerShape.lineTo(0.5, 0);
        headerShape.lineTo(0.4, 0.3);
        headerShape.lineTo(-0.4, 0.3);
        headerShape.lineTo(-0.5, 0);
        
        const headerExtrudeSettings = {
            depth: 0.2,
            bevelEnabled: false
        };
        
        const headerGeometry3D = new THREE.ExtrudeGeometry(headerShape, headerExtrudeSettings);
        const headerMaterial3D = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const header = new THREE.Mesh(headerGeometry3D, headerMaterial3D);
        
        // Position and rotate header
        header.position.set(0, 2.0, -0.04);
        header.rotation.set(0, Math.PI, 0);
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
        
        // Add retro green text with glow effect
        this.screenContext.shadowColor = '#00ff00';
        this.screenContext.shadowBlur = 20;
        this.screenContext.fillStyle = '#00ff00';
        this.screenContext.textAlign = 'center';
        this.screenContext.textBaseline = 'middle';
        
        // Draw initial message
        this.screenContext.font = 'bold 28px "Press Start 2P", monospace';
        this.screenContext.fillText('CLICK TO START', 256, 256);
        
        // Update the texture
        this.screenTexture.needsUpdate = true;
    }

    initializeGameState() {
        // Initialize game state in modelGroup.userData
        this.modelGroup.userData = {
            id: 'crossy_road',
            name: 'Crossy Road',
            description: '3D road crossing adventure',
            interactive: true,
            screenContext: this.screenContext,
            screenTexture: this.screenTexture,
            lastFlashTime: 0,
            isTextVisible: true,
            currentMessage: 'CLICK TO START',
            gameState: 'title',
            
            // Initialize audio context
            audioContext: new (window.AudioContext || window.webkitAudioContext)()
        };

        // Bind methods to userData
        this.bindGameMethods();
    }

    bindGameMethods() {
        // Bind basic methods to userData
        this.modelGroup.userData.handleClick = this.handleClick.bind(this);
        this.modelGroup.userData.updateScreen = this.updateScreen.bind(this);
        this.modelGroup.userData.flashScreen = this.flashScreen.bind(this);
    }

    handleClick() {
        // To be implemented with Crossy Road game logic
        console.log('Click handled in Crossy Road cabinet');
    }

    updateScreen() {
        // To be implemented with Crossy Road rendering logic
        this.screenTexture.needsUpdate = true;
    }

    flashScreen() {
        // Basic screen flashing logic
        const currentTime = Date.now();
        if (currentTime - this.modelGroup.userData.lastFlashTime > 500) {
            this.modelGroup.userData.isTextVisible = !this.modelGroup.userData.isTextVisible;
            this.modelGroup.userData.lastFlashTime = currentTime;
            this.drawInitialScreen();
        }
    }
} 