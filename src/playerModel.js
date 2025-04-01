import * as THREE from 'three';

export function createPlayerModel(bodyColor = 0x3366cc) {
    // Create a group for the player character
    const bodyGroup = new THREE.Group();
    
    // Create chat label
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    // Create texture from canvas
    const chatTexture = new THREE.CanvasTexture(canvas);
    chatTexture.minFilter = THREE.LinearFilter;
    chatTexture.magFilter = THREE.LinearFilter;
    
    // Create sprite material for chat label
    const chatMaterial = new THREE.SpriteMaterial({
        map: chatTexture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        opacity: 0.9
    });
    
    // Create sprite for chat label
    const chatSprite = new THREE.Sprite(chatMaterial);
    chatSprite.position.y = 2.5; // Position above head
    chatSprite.scale.set(2, 0.5, 1); // Scale to match desired size
    chatSprite.visible = false;
    bodyGroup.add(chatSprite);
    
    // Store timeout reference
    let chatTimeout = null;
    
    // Preload font
    let fontLoaded = false;
    const font = new FontFace('Press Start 2P', 'url(https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2)');
    font.load().then(() => {
        document.fonts.add(font);
        fontLoaded = true;
        console.log('Chat font loaded successfully');
    }).catch(err => {
        console.error('Failed to load chat font:', err);
        fontLoaded = true; // Set to true to use fallback font
    });
    
    // Add function to update chat text
    bodyGroup.updateChatText = (text) => {
        // Clear any existing timeout
        if (chatTimeout) {
            clearTimeout(chatTimeout);
            chatTimeout = null;
        }
        
        if (!text) {
            chatSprite.visible = false;
            return;
        }
        
        const updateCanvas = () => {
            // Clear canvas
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw background
            context.fillStyle = 'rgba(0, 0, 0, 0.8)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Calculate font size based on text length
            const maxWidth = canvas.width - 20; // Leave some padding
            let fontSize = 20; // Start with default size
            
            // Set up text style
            const fontFamily = fontLoaded ? '"Press Start 2P"' : 'monospace';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillStyle = 'white';
            
            // Reduce font size if text is too long
            do {
                context.font = `${fontSize}px ${fontFamily}`;
                const metrics = context.measureText(text);
                if (metrics.width <= maxWidth || fontSize <= 8) break;
                fontSize--;
            } while (true);
            
            // If text is still too long, wrap it
            if (context.measureText(text).width > maxWidth) {
                const words = text.split(' ');
                const lines = [];
                let currentLine = words[0];
                
                for (let i = 1; i < words.length; i++) {
                    const testLine = currentLine + ' ' + words[i];
                    const metrics = context.measureText(testLine);
                    
                    if (metrics.width <= maxWidth) {
                        currentLine = testLine;
                    } else {
                        lines.push(currentLine);
                        currentLine = words[i];
                    }
                }
                lines.push(currentLine);
                
                // Draw each line
                const lineHeight = fontSize * 1.2;
                const totalHeight = lines.length * lineHeight;
                const startY = (canvas.height - totalHeight) / 2;
                
                lines.forEach((line, index) => {
                    context.fillText(line, canvas.width / 2, startY + (index * lineHeight) + lineHeight / 2);
                });
            } else {
                // Draw single line
                context.fillText(text, canvas.width / 2, canvas.height / 2);
            }
            
            // Update texture and show sprite
            chatTexture.needsUpdate = true;
            chatSprite.visible = true;
            
            // Adjust sprite height based on text content
            const contentHeight = context.measureText('M').actualBoundingBoxAscent + context.measureText('M').actualBoundingBoxDescent;
            const scale = Math.max(0.5, Math.min(1.0, contentHeight / 32));
            chatSprite.scale.set(2, scale, 1);
            
            // Set timeout to hide message after 5 seconds
            chatTimeout = setTimeout(() => {
                chatSprite.visible = false;
                chatTimeout = null;
            }, 5000);
        };

        // If font isn't loaded yet, wait a bit
        if (!fontLoaded) {
            setTimeout(updateCanvas, 100);
        } else {
            updateCanvas();
        }
    };
    
    // Store chat sprite reference
    bodyGroup.chatSprite = chatSprite;
    
    // Materials
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: bodyColor
    });
    const skinMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffcc99
    });
    const hairMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513 // Brown color for hair
    });
    const shoeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333 // Dark color for shoes
    });
    
    // Head (box for Minecraft style)
    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMesh = new THREE.Mesh(headGeometry, skinMaterial);
    headMesh.position.y = 1.6; // Position head higher to allow for neck
    bodyGroup.add(headMesh);
    
    // Hair (helmet-like instead of just a top piece)
    const hairGeometry = new THREE.BoxGeometry(0.45, 0.2, 0.45);
    const hairMesh = new THREE.Mesh(hairGeometry, hairMaterial);
    hairMesh.position.y = 1.8; // Position on top of head
    bodyGroup.add(hairMesh);
    
    // Sides of helmet
    const leftHairGeometry = new THREE.BoxGeometry(0.05, 0.4, 0.45);
    const leftHairMesh = new THREE.Mesh(leftHairGeometry, hairMaterial);
    leftHairMesh.position.set(-0.225, 1.6, 0); // Left side of head
    bodyGroup.add(leftHairMesh);
    
    const rightHairGeometry = new THREE.BoxGeometry(0.05, 0.4, 0.45);
    const rightHairMesh = new THREE.Mesh(rightHairGeometry, hairMaterial);
    rightHairMesh.position.set(0.225, 1.6, 0); // Right side of head
    bodyGroup.add(rightHairMesh);
    
    // Back of hair (keeping the back covered)
    const backHairGeometry = new THREE.BoxGeometry(0.45, 0.4, 0.05);
    const backHairMesh = new THREE.Mesh(backHairGeometry, hairMaterial);
    backHairMesh.position.set(0, 1.6, 0.225); // Back of head (positive Z)
    bodyGroup.add(backHairMesh);
    
    // Add facial features
    // Eyes
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 }); // Dark color for eyes
    
    const leftEyeGeometry = new THREE.BoxGeometry(0.07, 0.07, 0.02);
    const leftEye = new THREE.Mesh(leftEyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 1.65, 0.21); // Left eye on face (positive Z)
    bodyGroup.add(leftEye);
    
    const rightEyeGeometry = new THREE.BoxGeometry(0.07, 0.07, 0.02);
    const rightEye = new THREE.Mesh(rightEyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 1.65, 0.21); // Right eye on face (positive Z)
    bodyGroup.add(rightEye);
    
    // Mouth
    const mouthGeometry = new THREE.BoxGeometry(0.15, 0.04, 0.02);
    const mouth = new THREE.Mesh(mouthGeometry, eyeMaterial);
    mouth.position.set(0, 1.5, 0.21); // Mouth on face (positive Z)
    bodyGroup.add(mouth);
    
    // Add neck
    const neckGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const neckMesh = new THREE.Mesh(neckGeometry, skinMaterial);
    neckMesh.position.y = 1.35; // Between head and body
    bodyGroup.add(neckMesh);
    
    // Body (box for torso) - taller and thinner
    const bodyGeometry = new THREE.BoxGeometry(0.35, 0.7, 0.2);
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 0.95; // Position torso below neck
    bodyGroup.add(bodyMesh);
    
    // Arms - thinner and longer
    const armGeometry = new THREE.BoxGeometry(0.12, 0.65, 0.12);
    
    // Left arm with pivot point
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.235, 1.25, 0);
    bodyGroup.add(leftArmPivot);
    
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.y = -0.325; // Center the arm around its pivot
    leftArmPivot.add(leftArm);
    
    // Left hand
    const leftHandGeometry = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const leftHand = new THREE.Mesh(leftHandGeometry, skinMaterial);
    leftHand.position.y = -0.65; // At the end of the arm
    leftArmPivot.add(leftHand);
    
    // Right arm with pivot point
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.235, 1.25, 0);
    bodyGroup.add(rightArmPivot);
    
    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.y = -0.325; // Center the arm around its pivot
    rightArmPivot.add(rightArm);
    
    // Right hand
    const rightHandGeometry = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const rightHand = new THREE.Mesh(rightHandGeometry, skinMaterial);
    rightHand.position.y = -0.65; // At the end of the arm
    rightArmPivot.add(rightHand);
    
    // Legs - thinner and longer
    const legGeometry = new THREE.BoxGeometry(0.12, 0.65, 0.12);
    
    // Left leg with pivot point
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.12, 0.6, 0);
    bodyGroup.add(leftLegPivot);
    
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.y = -0.325; // Center the leg around its pivot
    leftLegPivot.add(leftLeg);
    
    // Left shoe
    const leftShoeGeometry = new THREE.BoxGeometry(0.14, 0.1, 0.18);
    const leftShoe = new THREE.Mesh(leftShoeGeometry, shoeMaterial);
    leftShoe.position.set(0, -0.65, 0.03); // At the end of the leg, slightly forward
    leftLegPivot.add(leftShoe);
    
    // Right leg with pivot point
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.12, 0.6, 0);
    bodyGroup.add(rightLegPivot);
    
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.y = -0.325; // Center the leg around its pivot
    rightLegPivot.add(rightLeg);
    
    // Right shoe
    const rightShoeGeometry = new THREE.BoxGeometry(0.14, 0.1, 0.18);
    const rightShoe = new THREE.Mesh(rightShoeGeometry, shoeMaterial);
    rightShoe.position.set(0, -0.65, 0.03); // At the end of the leg, slightly forward
    rightLegPivot.add(rightShoe);
    
    // Store references to the limb pivots for animation
    bodyGroup.leftArmPivot = leftArmPivot;
    bodyGroup.rightArmPivot = rightArmPivot;
    bodyGroup.leftLegPivot = leftLegPivot;
    bodyGroup.rightLegPivot = rightLegPivot;
    
    // Animation properties
    bodyGroup.animationTime = 0;
    bodyGroup.isMoving = false;

    return bodyGroup;
} 