import * as THREE from 'three';
import config from '../config.json';

/**
 * Creates the arcade environment with walls, floor, and ceiling
 * Designed to resemble the Palace Arcade from Stranger Things
 */
export const createArcade = (scene, textureLoader) => {
  if (!scene) {
    console.error('Scene is not initialized');
    return null;
  }

  // Ensure THREE.js is loaded
  if (typeof THREE === 'undefined') {
    console.error('THREE.js is not loaded');
    return null;
  }

  console.log('Initializing arcade environment...');

  // Create placeholder texture using canvas
  const createPlaceholderTexture = (text, color) => {
    try {
      console.log(`Creating placeholder texture: ${text} with color: ${color}`);
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) {
        console.error('Failed to get 2D context');
        return null;
      }
      context.fillStyle = color;
      context.fillRect(0, 0, size, size);
      context.fillStyle = 'white';
      context.font = '48px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, size / 2, size / 2);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      console.log(`Successfully created texture for: ${text}`);
      return texture;
    } catch (error) {
      console.error('Error creating placeholder texture:', error);
      return null;
    }
  };

  // Create a custom floor texture with neon six-pointed stars
  const createFloorTexture = () => {
    console.log('Creating floor texture with neon six-pointed stars...');
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    // Fill background
    context.fillStyle = '#050008'; // Even darker black/purple
    context.fillRect(0, 0, size, size);
    
    // Draw neon six-pointed stars
    const drawStar = (cx, cy, spikes, outerRadius, innerRadius, color) => {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;
      
      context.beginPath();
      context.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        context.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        context.lineTo(x, y);
        rot += step;
      }
      context.lineTo(cx, cy - outerRadius);
      context.closePath();
      context.lineWidth = 2;
      context.strokeStyle = color;
      context.stroke();
    };
    
    const starColors = ['#ff00ff', '#00ffff', '#ff0000', '#00ff00', '#ffff00'];
    const starCount = 20;
    
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const color = starColors[Math.floor(Math.random() * starColors.length)];
      drawStar(x, y, 6, 5, 2.5, color);
    }
    
    return new THREE.CanvasTexture(canvas);
  };

  console.log('Loading textures...');
  // Load textures
  const floorTexture = createPlaceholderTexture('Floor', 'black');
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(8, 8);
  
  const wallTexture = createPlaceholderTexture('', '#5D3FD3');
  wallTexture.wrapS = THREE.RepeatWrapping;
  wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(4, 2);
  
  // Create ceiling texture function
  const createCeilingTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Fill background white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw black grid lines
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    
    // Calculate grid size (2ft tiles)
    // If room is 30x20 ft and we want 2ft tiles, we need 15x10 tiles
    const tileCountX = 15;
    const tileCountY = 10;
    const tileWidth = canvas.width / tileCountX;
    const tileHeight = canvas.height / tileCountY;
    
    // Draw vertical lines
    for (let x = 0; x <= canvas.width; x += tileWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= canvas.height; y += tileHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
  };

  console.log('Creating floor...');
  // Create floor - extended to cover nook
  const floorGeometry = new THREE.PlaneGeometry(32, 20); // Extended from 30 to 32 to cover nook
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    map: createFloorTexture(),
    roughness: 0.8,
    metalness: 0.2
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.position.x = -1; // Shifted 1 unit left to center the extended floor
  floor.receiveShadow = true;
  
  // Fix texture stretching by adjusting repeat and center alignment
  floorMaterial.map.wrapS = THREE.RepeatWrapping;
  floorMaterial.map.wrapT = THREE.RepeatWrapping;
  floorMaterial.map.repeat.set(6.4, 4); // Adjusted from 6 to 6.4 to maintain consistent tile size (32/30 * 6)
  floorMaterial.map.center.set(0.5, 0.5); // Center the texture
  
  scene.add(floor);
  
  console.log('Creating ceiling...');
  // Create ceiling with tiled pattern - extended to cover deeper nook
  const ceilingGeometry = new THREE.PlaneGeometry(33, 20); // Extended from 32 to 33 to cover deeper nook
  const ceilingTexture = createCeilingTexture();
  ceilingTexture.wrapS = THREE.RepeatWrapping;
  ceilingTexture.wrapT = THREE.RepeatWrapping;
  
  const ceilingMaterial = new THREE.MeshStandardMaterial({ 
    map: ceilingTexture,
    roughness: 0.8,
    metalness: 0.2
  });
  
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 4.5;
  ceiling.position.x = -1.5; // Shifted further left to center the extended ceiling
  ceiling.receiveShadow = true;
  scene.add(ceiling);
  
  console.log('Creating walls...');
  // Create walls
  const wallMaterial = new THREE.MeshStandardMaterial({ 
    map: wallTexture,
    roughness: 0.8,
    metalness: 0.2
  });

  // Create neon line materials (reusable for all lines)
  const neonYellowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 3.0
  });

  const neonBlueMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    emissive: 0x0000ff,
    emissiveIntensity: 3.0
  });

  // New continuous line materials
  const continuousYellowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 3.0
  });

  const continuousOrangeMaterial = new THREE.MeshBasicMaterial({
    color: 0xff8c00,
    emissive: 0xff8c00,
    emissiveIntensity: 3.0
  });

  // Function to create continuous lines for a wall
  const createLowerContinuousLines = (width, position, rotation) => {
    // Upper line (yellow)
    const upperLineGeometry = new THREE.BoxGeometry(width, 0.2, 0.2);
    const upperLine = new THREE.Mesh(upperLineGeometry, continuousYellowMaterial);
    upperLine.position.copy(position);
    upperLine.position.y = 1.1; // Adjusted height between original and previous position
    if (rotation) upperLine.rotation.copy(rotation);
    scene.add(upperLine);

    // Lower line (orange)
    const lowerLineGeometry = new THREE.BoxGeometry(width, 0.2, 0.2);
    const lowerLine = new THREE.Mesh(lowerLineGeometry, continuousOrangeMaterial);
    lowerLine.position.copy(position);
    lowerLine.position.y = 0.9; // Adjusted height between original and previous position
    if (rotation) lowerLine.rotation.copy(rotation);
    scene.add(lowerLine);

    return { upperLine, lowerLine };
  };

  // Function to create neon lines for a wall
  const createNeonLines = (width, position, rotation) => {
    // Upper line (yellow)
    const upperLineGeometry = new THREE.BoxGeometry(width, 0.1, 0.1);
    const upperLine = new THREE.Mesh(upperLineGeometry, neonYellowMaterial);
    upperLine.position.copy(position);
    upperLine.position.y = 4.0;
    if (rotation) upperLine.rotation.copy(rotation);
    scene.add(upperLine);

    // Lower line (blue)
    const lowerLineGeometry = new THREE.BoxGeometry(width, 0.1, 0.1);
    const lowerLine = new THREE.Mesh(lowerLineGeometry, neonBlueMaterial);
    lowerLine.position.copy(position);
    lowerLine.position.y = 3.8;
    if (rotation) lowerLine.rotation.copy(rotation);
    scene.add(lowerLine);

    return { upperLine, lowerLine };
  };
  
  // Back wall
  const backWallGeometry = new THREE.PlaneGeometry(30, 4.5);
  const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
  backWall.position.z = -10;
  backWall.position.y = 2.25;
  backWall.receiveShadow = true;
  scene.add(backWall);
  createLowerContinuousLines(30, new THREE.Vector3(0, 0, -10), new THREE.Euler(0, 0, 0));
  
  // Front wall with entrance
  const frontWallLeftGeometry = new THREE.PlaneGeometry(12, 4.5);
  const frontWallLeft = new THREE.Mesh(frontWallLeftGeometry, wallMaterial);
  frontWallLeft.position.z = 10;
  frontWallLeft.position.x = -9;
  frontWallLeft.position.y = 2.25;
  frontWallLeft.rotation.y = Math.PI;
  frontWallLeft.receiveShadow = true;
  scene.add(frontWallLeft);
  createNeonLines(12, new THREE.Vector3(-9, 0, 10), new THREE.Euler(0, Math.PI, 0));
  createLowerContinuousLines(12, new THREE.Vector3(-9, 0, 10), new THREE.Euler(0, Math.PI, 0));
  
  const frontWallRightGeometry = new THREE.PlaneGeometry(12, 4.5);
  const frontWallRight = new THREE.Mesh(frontWallRightGeometry, wallMaterial);
  frontWallRight.position.z = 10;
  frontWallRight.position.x = 15; // Moved from x = 12 to x = 15 to create 12-unit wide gap
  frontWallRight.position.y = 2.25;
  frontWallRight.rotation.y = Math.PI;
  frontWallRight.receiveShadow = true;
  scene.add(frontWallRight);
  createNeonLines(12, new THREE.Vector3(15, 0, 10), new THREE.Euler(0, Math.PI, 0));
  createLowerContinuousLines(12, new THREE.Vector3(15, 0, 10), new THREE.Euler(0, Math.PI, 0));
  
  // Left wall (split into two sections for the nook)
  // Lower section of left wall
  const leftWallLowerGeometry = new THREE.PlaneGeometry(10, 4.5);
  const leftWallLower = new THREE.Mesh(leftWallLowerGeometry, wallMaterial);
  leftWallLower.position.x = -15;
  leftWallLower.position.y = 2.25;
  leftWallLower.position.z = -5; // Positioned towards the south
  leftWallLower.rotation.y = Math.PI / 2;
  leftWallLower.receiveShadow = true;
  scene.add(leftWallLower);
  createNeonLines(10, new THREE.Vector3(-15, 0, -5), new THREE.Euler(0, Math.PI / 2, 0));
  createLowerContinuousLines(10, new THREE.Vector3(-15, 0, -5), new THREE.Euler(0, Math.PI / 2, 0));

  // Upper section of left wall
  const leftWallUpperGeometry = new THREE.PlaneGeometry(2, 4.5);
  const leftWallUpper = new THREE.Mesh(leftWallUpperGeometry, wallMaterial);
  leftWallUpper.position.x = -15;
  leftWallUpper.position.y = 2.25;
  leftWallUpper.position.z = 9; // Positioned near the north wall
  leftWallUpper.rotation.y = Math.PI / 2;
  leftWallUpper.receiveShadow = true;
  scene.add(leftWallUpper);
  createNeonLines(2, new THREE.Vector3(-15, 0, 9), new THREE.Euler(0, Math.PI / 2, 0));
  createLowerContinuousLines(2, new THREE.Vector3(-15, 0, 9), new THREE.Euler(0, Math.PI / 2, 0));

  // Create nook walls
  // Back wall of nook
  const nookBackWallGeometry = new THREE.PlaneGeometry(8, 4.5);
  const nookBackWall = new THREE.Mesh(nookBackWallGeometry, wallMaterial);
  nookBackWall.position.x = -17.5;
  nookBackWall.position.y = 2.25;
  nookBackWall.position.z = 4;
  nookBackWall.rotation.y = Math.PI / 2;
  nookBackWall.receiveShadow = true;
  scene.add(nookBackWall);
  createNeonLines(8, new THREE.Vector3(-17.5, 0, 4), new THREE.Euler(0, Math.PI / 2, 0));
  createLowerContinuousLines(8, new THREE.Vector3(-17.5, 0, 4), new THREE.Euler(0, Math.PI / 2, 0));

  // South wall of nook
  const nookSouthWallGeometry = new THREE.PlaneGeometry(2.5, 4.5); // Extended width from 2 to 2.5
  const nookSouthWall = new THREE.Mesh(nookSouthWallGeometry, wallMaterial);
  nookSouthWall.position.x = -16.25; // Moved east to center of extended width
  nookSouthWall.position.y = 2.25;
  nookSouthWall.position.z = 0;
  nookSouthWall.receiveShadow = true;
  scene.add(nookSouthWall);
  createNeonLines(2.5, new THREE.Vector3(-16.25, 0, 0), new THREE.Euler(0, 0, 0));
  createLowerContinuousLines(2.5, new THREE.Vector3(-16.25, 0, 0), new THREE.Euler(0, 0, 0));

  // North wall of nook
  const nookNorthWallGeometry = new THREE.PlaneGeometry(2.5, 4.5); // Extended width from 2 to 2.5
  const nookNorthWall = new THREE.Mesh(nookNorthWallGeometry, wallMaterial);
  nookNorthWall.position.x = -16.25; // Moved east to center of extended width
  nookNorthWall.position.y = 2.25;
  nookNorthWall.position.z = 8;
  nookNorthWall.rotation.y = Math.PI;
  nookNorthWall.receiveShadow = true;
  scene.add(nookNorthWall);
  createNeonLines(2.5, new THREE.Vector3(-16.25, 0, 8), new THREE.Euler(0, Math.PI, 0));
  createLowerContinuousLines(2.5, new THREE.Vector3(-16.25, 0, 8), new THREE.Euler(0, Math.PI, 0));

  // Create prize counter in nook
  const createPrizeCounter = () => {
    // Create main counter body
    const counterGeometry = new THREE.BoxGeometry(1.2, 0.8, 5.5); // Shortened more to avoid overlap with orange countertop
    const counter = new THREE.Mesh(counterGeometry, wallMaterial);
    counter.position.set(-15.4, 0.4, 5.25); // Lowered slightly to avoid overlap
    counter.castShadow = true;
    counter.receiveShadow = true;
    scene.add(counter);

    // Create yellow countertop matching the upper continuous line
    const yellowCountertopGeometry = new THREE.BoxGeometry(1.2, 0.2, 5.5);
    const yellowCountertopMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 3.0
    });
    const yellowCountertop = new THREE.Mesh(yellowCountertopGeometry, yellowCountertopMaterial);
    yellowCountertop.position.set(-15.4, 1.1, 5.25); // Height matches upper continuous line
    yellowCountertop.castShadow = true;
    yellowCountertop.receiveShadow = true;
    scene.add(yellowCountertop);

    // Create orange countertop matching the lower continuous line
    const orangeCountertopGeometry = new THREE.BoxGeometry(1.2, 0.2, 5.5);
    const orangeCountertopMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8c00,
      emissive: 0xff8c00,
      emissiveIntensity: 3.0
    });
    const orangeCountertop = new THREE.Mesh(orangeCountertopGeometry, orangeCountertopMaterial);
    orangeCountertop.position.set(-15.4, 0.9, 5.25); // Height matches lower continuous line
    orangeCountertop.castShadow = true;
    orangeCountertop.receiveShadow = true;
    scene.add(orangeCountertop);

    // Create "PRIZES" text
    const canvas = document.createElement('canvas');
    canvas.width = 1024; // Doubled from 512 to give more horizontal space
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Clear background
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.fillStyle = '#ffff00'; // Yellow to match upper countertop
    ctx.font = 'bold 120px "Press Start 2P"'; // Increased from 96px to 120px
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PRIZES', canvas.width / 2, canvas.height / 2);

    const textTexture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
      side: THREE.DoubleSide,
      emissive: 0xffff00,
      emissiveIntensity: 2.0
    });

    const textGeometry = new THREE.PlaneGeometry(2.5, 0.5); // Increased size to match larger font
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(-14.7, 0.4, 4.25); // Moved south (z decreased by 1.0 from 5.25 to 4.25)
    textMesh.rotation.y = Math.PI / 2; // Rotate to face west
    scene.add(textMesh);

    // Add a soft point light above the counter matching wall lighting
    const light = new THREE.PointLight(0x5D3FD3, 0.5, 3);
    light.position.set(-15.4, 2, 5.25);
    scene.add(light);
  };
  
  const prizeCounter = createPrizeCounter();

  // Right wall
  const rightWallGeometry = new THREE.PlaneGeometry(20, 4.5);
  const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
  rightWall.position.x = 15;
  rightWall.position.y = 2.25;
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.receiveShadow = true;
  scene.add(rightWall);
  createNeonLines(20, new THREE.Vector3(15, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0));
  createLowerContinuousLines(20, new THREE.Vector3(15, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0));
  
  console.log('Creating neon sign...');
  // Create neon sign for "VIBECADE"
  const createNeonSign = () => {
    const signGroup = new THREE.Group();
    
    // Create text texture for the sign
    const createNeonTextTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1024;
      const context = canvas.getContext('2d');
      
      // Clear canvas
      context.fillStyle = 'rgba(0,0,0,0)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Text settings
      const text = 'VIBECADE';
      const fontSize = 200;
      
      // Set up text style with the correct font
      context.font = `bold ${fontSize}px "Press Start 2P", "Courier New", monospace`;
      context.textAlign = 'center';
      context.textBaseline = 'top';
      
      // Get text metrics
      const metrics = context.measureText(text);
      const textWidth = metrics.width;
      
      // Save state
      context.save();
      
      // Move to center
      const centerX = canvas.width/2;
      const centerY = canvas.height/3;
      context.translate(centerX, centerY);
      
      // Apply the perspective transform
      context.transform(
        1,     // Horizontal scale
        0,     // Horizontal skewing
        0,     // Vertical skewing
        1.5,   // Vertical stretch
        0,     // Horizontal translation
        0      // Vertical translation
      );
      
      // Apply the shrinking transform
      context.transform(
        1,     // Keep horizontal scale
        0,     // No skew
        -0.4,  // Pull in from left
        1,     // Keep vertical scale
        0,     // No move
        0      // No move
      );
      
      // Move back
      context.translate(-centerX, -centerY);
      
      // Add glow and draw the text
      context.shadowColor = '#ff00ff';
      context.shadowBlur = 40;
      context.fillStyle = '#ffffff';
      context.fillText(text, centerX, centerY);
      
      // Restore context
      context.restore();
      
      return new THREE.CanvasTexture(canvas);
    };

    // Create the sign with adjusted material settings
    const signGeometry = new THREE.PlaneGeometry(10, 5);
    const signMaterial = new THREE.MeshBasicMaterial({
      map: createNeonTextTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(-8, 2.8, -9.85);  // Moved further left and down
    signGroup.add(sign);
    
    // Create gap in neon lines for the sign and apply it to the back wall
    const createNeonLinesWithGap = (width, position, rotation) => {
      const gapWidth = 24;
      const gapStart = -8 - gapWidth/2;
      const gapEnd = -8 + gapWidth/2;
      
      // Left section of upper line (yellow)
      const upperLineLeftGeometry = new THREE.BoxGeometry((width + gapStart) / 2, 0.1, 0.1);
      const upperLineLeft = new THREE.Mesh(upperLineLeftGeometry, neonYellowMaterial);
      upperLineLeft.position.copy(position);
      upperLineLeft.position.x = (gapStart - width) / 4;
      upperLineLeft.position.y = 4.0;
      if (rotation) upperLineLeft.rotation.copy(rotation);
      scene.add(upperLineLeft);

      // Right section of upper line (yellow)
      const upperLineRightGeometry = new THREE.BoxGeometry((width - gapEnd) / 2, 0.1, 0.1);
      const upperLineRight = new THREE.Mesh(upperLineRightGeometry, neonYellowMaterial);
      upperLineRight.position.copy(position);
      upperLineRight.position.x = (width + gapEnd) / 4;
      upperLineRight.position.y = 4.0;
      if (rotation) upperLineRight.rotation.copy(rotation);
      scene.add(upperLineRight);

      // Left section of lower line (blue)
      const lowerLineLeftGeometry = new THREE.BoxGeometry((width + gapStart) / 2, 0.1, 0.1);
      const lowerLineLeft = new THREE.Mesh(lowerLineLeftGeometry, neonBlueMaterial);
      lowerLineLeft.position.copy(position);
      lowerLineLeft.position.x = (gapStart - width) / 4;
      lowerLineLeft.position.y = 3.8;
      if (rotation) lowerLineLeft.rotation.copy(rotation);
      scene.add(lowerLineLeft);

      // Right section of lower line (blue)
      const lowerLineRightGeometry = new THREE.BoxGeometry((width - gapEnd) / 2, 0.1, 0.1);
      const lowerLineRight = new THREE.Mesh(lowerLineRightGeometry, neonBlueMaterial);
      lowerLineRight.position.copy(position);
      lowerLineRight.position.x = (width + gapEnd) / 4;
      lowerLineRight.position.y = 3.8;
      if (rotation) lowerLineRight.rotation.copy(rotation);
      scene.add(lowerLineRight);

      // Left section of continuous upper line (yellow)
      const contUpperLineLeftGeometry = new THREE.BoxGeometry((width + gapStart) / 2, 0.2, 0.2);
      const contUpperLineLeft = new THREE.Mesh(contUpperLineLeftGeometry, continuousYellowMaterial);
      contUpperLineLeft.position.copy(position);
      contUpperLineLeft.position.x = (gapStart - width) / 4;
      contUpperLineLeft.position.y = 1.1; // Adjusted height between original and previous position
      if (rotation) contUpperLineLeft.rotation.copy(rotation);
      scene.add(contUpperLineLeft);

      // Right section of continuous upper line (yellow)
      const contUpperLineRightGeometry = new THREE.BoxGeometry((width - gapEnd) / 2, 0.2, 0.2);
      const contUpperLineRight = new THREE.Mesh(contUpperLineRightGeometry, continuousYellowMaterial);
      contUpperLineRight.position.copy(position);
      contUpperLineRight.position.x = (width + gapEnd) / 4;
      contUpperLineRight.position.y = 1.1; // Adjusted height between original and previous position
      if (rotation) contUpperLineRight.rotation.copy(rotation);
      scene.add(contUpperLineRight);

      // Left section of continuous lower line (orange)
      const contLowerLineLeftGeometry = new THREE.BoxGeometry((width + gapStart) / 2, 0.2, 0.2);
      const contLowerLineLeft = new THREE.Mesh(contLowerLineLeftGeometry, continuousOrangeMaterial);
      contLowerLineLeft.position.copy(position);
      contLowerLineLeft.position.x = (gapStart - width) / 4;
      contLowerLineLeft.position.y = 0.9; // Adjusted height between original and previous position
      if (rotation) contLowerLineLeft.rotation.copy(rotation);
      scene.add(contLowerLineLeft);

      // Right section of continuous lower line (orange)
      const contLowerLineRightGeometry = new THREE.BoxGeometry((width - gapEnd) / 2, 0.2, 0.2);
      const contLowerLineRight = new THREE.Mesh(contLowerLineRightGeometry, continuousOrangeMaterial);
      contLowerLineRight.position.copy(position);
      contLowerLineRight.position.x = (width + gapEnd) / 4;
      contLowerLineRight.position.y = 0.9; // Adjusted height between original and previous position
      if (rotation) contLowerLineRight.rotation.copy(rotation);
      scene.add(contLowerLineRight);

      return { 
        upperLineLeft, 
        upperLineRight, 
        lowerLineLeft, 
        lowerLineRight,
        contUpperLineLeft,
        contUpperLineRight,
        contLowerLineLeft,
        contLowerLineRight
      };
    };

    // Create the gapped lines for the back wall
    createNeonLinesWithGap(30, new THREE.Vector3(0, 0, -10), new THREE.Euler(0, 0, 0));
    
    scene.add(signGroup);
    return signGroup;
  };
  
  const neonSign = createNeonSign();
  
  console.log('Creating arcade elements...');
  // Create arcade elements
  const createArcadeElements = () => {
    console.log('Creating arcade elements...');

    // Create Claude monument
    const createClaudeMonument = () => {
      // Create base/pedestal
      const baseGeometry = new THREE.BoxGeometry(2, 0.5, 2);
      const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444,
        metalness: 0.7,
        roughness: 0.2
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.set(10, 0.25, -9); // Moved further right and slightly forward
      base.castShadow = true;
      base.receiveShadow = true;
      scene.add(base);

      // Create holographic display
      const displayGeometry = new THREE.CylinderGeometry(0.8, 0.8, 3, 32, 1, true);
      const displayMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.1,
        metalness: 1,
        roughness: 0,
        transmission: 0.9,
        side: THREE.DoubleSide
      });
      const display = new THREE.Mesh(displayGeometry, displayMaterial);
      display.position.set(10, 2, -9); // Moved to match base position
      scene.add(display);

      // Create Claude text
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      // Clear background
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, 512, 128);

      // Draw text
      ctx.fillStyle = '#00ffff';
      ctx.font = 'bold 64px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CLAUDE', 256, 64);

      const textTexture = new THREE.CanvasTexture(canvas);
      const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        side: THREE.DoubleSide
      });

      const textGeometry = new THREE.PlaneGeometry(2, 0.5);
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(10, 0.6, -7.9); // Moved to match new base position
      textMesh.rotation.x = -Math.PI / 8; // Tilt up slightly
      scene.add(textMesh);

      // Add pulsing light effect
      const light = new THREE.PointLight(0x00ffff, 2, 5);
      light.position.set(10, 2, -9); // Moved to match new position
      scene.add(light);

      // Animate the light and display
      const animate = () => {
        const time = Date.now() * 0.001;
        light.intensity = 1 + Math.sin(time * 2) * 0.5;
        displayMaterial.opacity = 0.1 + Math.sin(time * 2) * 0.05;
        requestAnimationFrame(animate);
      };
      animate();
    };

    // Create the monument
    createClaudeMonument();

    // Create the advertise poster
    createStripeButtonPoster(scene);
    createDefaultAdvertisePoster(scene);

    // Create a retro-style poster texture
    const createRetroArcadePoster = (index) => {
      // Special case for HIGH SCORE poster (index 2)
      if (index === 2) {
        // Load the therube.jpg image
        const texture = textureLoader.load('/vibe/assets/images/therube.jpg');
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      }
      // Special case for LEVEL UP poster (index 1)
      if (index === 1) {
        // Load the therube2.jpg image
        const texture = textureLoader.load('/vibe/assets/images/therube2.jpg');
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      // Background gradient
      const gradients = [
        ['#ff0080', '#7700ff'], // Pink to Purple
        ['#00ff88', '#0066ff'], // Cyan to Blue
        ['#ff3300', '#ff9900'], // Red to Orange
        ['#ff00ff', '#00ffff']  // Magenta to Cyan
      ];
      const [color1, color2] = gradients[index % gradients.length];
      
      const gradient = ctx.createLinearGradient(0, 0, 512, 512);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      // Grid effect
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 512; i += 64) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
      }

      // Add some retro shapes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      const shapes = ['△', '○', '□', '★'];
      ctx.font = 'bold 80px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(shapes[index % shapes.length], 256, 200);

      // Add retro text
      const texts = ['GAME ON', 'LEVEL UP', 'HIGH SCORE', 'PLAYER 1'];
      ctx.font = 'bold 60px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 10;
      ctx.fillText(texts[index % texts.length], 256, 350);

      return new THREE.CanvasTexture(canvas);
    };

    // Create shorter posters with new dimensions
    const posterGeometry = new THREE.PlaneGeometry(1.8, 2.2); // Reduced height from 3 to 2.2
    const posters = [];

    config.posters.forEach(({ x, y, z, rotationY }, index) => {
      console.log(`Adding poster at position: (${x}, ${y}, ${z}) with rotationY: ${rotationY}`);
      
      // For index 0, create a duplicate of Slot 1 poster (purple to teal with rotating beams)
      if (index === 0) {
        // Create canvas for dynamic texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Create dynamic texture
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create poster geometry (using same dimensions as other posters)
        const posterGeometry = new THREE.PlaneGeometry(1.8, 2.2);
        const posterMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          blending: THREE.AdditiveBlending
        });
        
        const poster = new THREE.Mesh(posterGeometry, posterMaterial);
        poster.position.set(x, 2.4, z);
        poster.rotation.y = rotationY;
        
        // Add pulsing point light (purple)
        const light = new THREE.PointLight(0x9933ff, 1, 3);
        light.position.copy(poster.position);
        light.position.z += 0.1; // Move slightly away from wall
        scene.add(light);
        
        // Animation function
        const animate = () => {
          const time = Date.now() * 0.001;
          
          // Clear canvas
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 512, 512);
          
          // Purple to teal gradient background
          const gradient = ctx.createLinearGradient(0, 0, 512, 512);
          gradient.addColorStop(0, '#9933ff');  // Purple
          gradient.addColorStop(1, '#00ffcc');  // Teal
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 512, 512);
          
          // Add grid effect
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 512; i += 64) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(512, i);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 512);
            ctx.stroke();
          }
          
          // Add main text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 48px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#00ffcc';  // Teal shadow to match gradient
          ctx.shadowBlur = 20;
          ctx.fillText('YOUR AD', 256, 140);
          ctx.fillText('HERE', 256, 200);
          
          // Add rotating light beams
          ctx.save();
          ctx.translate(256, 256);
          ctx.rotate(time * 0.5);
          
          const gradient1 = ctx.createLinearGradient(-256, 0, 256, 0);
          gradient1.addColorStop(0, 'rgba(153, 51, 255, 0)');  // Purple
          gradient1.addColorStop(0.5, 'rgba(153, 51, 255, 0.2)');
          gradient1.addColorStop(1, 'rgba(153, 51, 255, 0)');
          
          ctx.fillStyle = gradient1;
          ctx.fillRect(-256, -10, 512, 20);
          
          ctx.rotate(Math.PI / 2);
          ctx.fillRect(-256, -10, 512, 20);
          ctx.restore();
          
          // Add pulsing border
          const borderWidth = 10;
          const borderPulse = Math.sin(time * 2) * 0.5 + 0.5;
          ctx.strokeStyle = `rgba(255, 255, 255, ${borderPulse * 0.5})`;
          ctx.lineWidth = borderWidth;
          ctx.strokeRect(borderWidth/2, borderWidth/2, 512-borderWidth, 512-borderWidth);
          
          // Update texture
          texture.needsUpdate = true;
          
          // Animate light
          light.intensity = 1 + Math.sin(time * 2) * 0.5;
          
          requestAnimationFrame(animate);
        };
        
        animate();
        scene.add(poster);
        posters.push(poster);
        return;
      }
      
      const posterTexture = createRetroArcadePoster(index);
      
      // Check if this is the therube.jpg poster (HIGH SCORE, index 2)
      // or therube2.jpg poster (LEVEL UP, index 1)
      // and create a geometry that maintains its aspect ratio
      let currentPosterGeometry = posterGeometry;
      if (index === 2) {
        // Set aspect ratio for therube.jpg (can be adjusted based on the actual image)
        const imageWidth = 1.8; // Keep same width as other posters
        const imageHeight = 2.2 * (3/4); // Adjust height based on image aspect ratio
        currentPosterGeometry = new THREE.PlaneGeometry(imageWidth, imageHeight);
      } else if (index === 1) {
        // Set aspect ratio for therube2.jpg (wider than tall)
        const imageWidth = 1.8; // Keep same width as other posters
        const imageHeight = 1.8 * (2/3); // Adjust height to be shorter for wide image
        currentPosterGeometry = new THREE.PlaneGeometry(imageWidth, imageHeight);
      }
      
      const posterMaterial = new THREE.MeshBasicMaterial({
        map: posterTexture,
        transparent: true,
      });
      const poster = new THREE.Mesh(currentPosterGeometry, posterMaterial);
      // Adjust Y position for therube.jpg to be between the neon lines
      if (index === 2) {
        poster.position.set(x, 2.4, z); // Centered between upper and lower lines
      } else {
        poster.position.set(x, 2.4, z); // Original position for other posters
      }
      poster.rotation.y = rotationY;
      scene.add(poster);
      posters.push(poster);
    });

    // Create Poster Slot 3 (similar to Slot 1 but different colors)
    const posterGeometry3 = new THREE.PlaneGeometry(1.8, 2.2); // Match dimensions of other posters
    const canvas3 = document.createElement('canvas');
    canvas3.width = 512;
    canvas3.height = 512;
    const ctx3 = canvas3.getContext('2d');
    
    // Create gradient with different colors (purple to teal)
    const gradient3 = ctx3.createLinearGradient(0, 0, canvas3.width, canvas3.height);
    gradient3.addColorStop(0, '#9933ff');  // Purple
    gradient3.addColorStop(1, '#00ffcc');  // Teal
    
    ctx3.fillStyle = gradient3;
    ctx3.fillRect(0, 0, canvas3.width, canvas3.height);
    
    // Add grid effect (matching Poster Slot 1)
    ctx3.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx3.lineWidth = 2;
    for (let i = 0; i < 512; i += 64) {
      ctx3.beginPath();
      ctx3.moveTo(0, i);
      ctx3.lineTo(512, i);
      ctx3.stroke();
      ctx3.beginPath();
      ctx3.moveTo(i, 0);
      ctx3.lineTo(i, 512);
      ctx3.stroke();
    }
    
    // Add main text with same style as Poster Slot 1
    ctx3.fillStyle = '#ffffff';
    ctx3.font = 'bold 48px "Press Start 2P", monospace';
    ctx3.textAlign = 'center';
    ctx3.textBaseline = 'middle';
    ctx3.shadowColor = '#00ffcc';  // Teal shadow to match gradient
    ctx3.shadowBlur = 20;
    ctx3.fillText('YOUR AD', 256, 140);
    ctx3.fillText('HERE', 256, 200);
    
    // Add decorative elements - two crossing light beams (matching Poster Slot 1)
    ctx3.save();
    ctx3.translate(256, 256);
    
    const gradient1 = ctx3.createLinearGradient(-256, 0, 256, 0);
    gradient1.addColorStop(0, 'rgba(153, 51, 255, 0)');  // Purple
    gradient1.addColorStop(0.5, 'rgba(153, 51, 255, 0.2)');
    gradient1.addColorStop(1, 'rgba(153, 51, 255, 0)');
    
    ctx3.fillStyle = gradient1;
    ctx3.fillRect(-256, -10, 512, 20);
    
    ctx3.rotate(Math.PI / 2);
    ctx3.fillRect(-256, -10, 512, 20);
    ctx3.restore();
    
    // Add subtle pulsing border (matching Poster Slot 1)
    const borderWidth = 10;
    ctx3.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx3.lineWidth = borderWidth;
    ctx3.strokeRect(borderWidth/2, borderWidth/2, 512-borderWidth, 512-borderWidth);
    
    const texture3 = new THREE.CanvasTexture(canvas3);
    const posterMaterial3 = new THREE.MeshBasicMaterial({ 
      map: texture3,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    const poster3 = new THREE.Mesh(posterGeometry3, posterMaterial3);
    // Position on east wall, with more padding from therube2.jpg
    poster3.position.set(14.9, 2.5, 3); // Moved up to 2.5 units height
    poster3.rotation.y = -Math.PI / 2; // Face west (into arcade)
    scene.add(poster3);
    
    // Add point light for visibility
    const posterLight3 = new THREE.PointLight(0x00ffcc, 1, 3); // Teal light to match gradient
    posterLight3.position.set(14.4, 2.5, 3); // Adjusted light height to match poster
    scene.add(posterLight3);

    return { posters };
  };
  
  const arcadeElements = createArcadeElements();
  console.log('Arcade elements created:', arcadeElements);
  
  // Add version label
  const createVersionLabel = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Clear background
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw version text
    ctx.fillStyle = '#ff00ff';  // Changed to match VIBECADE logo's magenta color
    ctx.font = '36px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff00ff';  // Added shadow to match logo glow
    ctx.shadowBlur = 40;  // Match logo's glow effect
    ctx.fillText('1.0.4', canvas.width/2, canvas.height/2);  // Updated to 1.0.4

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });

    const geometry = new THREE.PlaneGeometry(1.2, 0.3);
    const versionMesh = new THREE.Mesh(geometry, material);
    
    // Position under VIBECADE logo - moved even further left
    versionMesh.position.set(-11.2, 2.0, -9.75);  // Moved further left (x: -10.2 to -11.2)
    versionMesh.rotation.y = 0;
    
    return versionMesh;
  };

  // Add version label to scene (add this near where other elements are added to scene)
  const versionLabel = createVersionLabel();
  scene.add(versionLabel);

  return {
    floor,
    ceiling,
    walls: {
      backWall,
      frontWallLeft,
      frontWallRight,
      leftWallLower,
      leftWallUpper,
      rightWall
    },
    neonSign,
    arcadeElements
  };
};

const createStripeButtonPoster = (scene) => {
  // Create canvas for dynamic texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Create dynamic texture
  const texture = new THREE.CanvasTexture(canvas);
  
  // Create poster geometry (using same dimensions as other posters)
  const posterGeometry = new THREE.PlaneGeometry(1.8, 2.2);
  const posterMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending
  });
  
  const poster = new THREE.Mesh(posterGeometry, posterMaterial);
  // Position on east wall, spaced from therube2.jpg
  poster.position.set(14.9, 2.5, -6); // Moved up to 2.5 units height
  poster.rotation.y = -Math.PI / 2; // Face west like other east wall items
  
  // Add pulsing point light
  const light = new THREE.PointLight(0xff00ff, 1, 3);
  light.position.copy(poster.position);
  light.position.x -= 0.1; // Move slightly away from wall
  scene.add(light);
  
  // Animation function
  const animate = () => {
    const time = Date.now() * 0.001;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 512);
    
    // Animated gradient background
    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, `hsl(${(time * 30) % 360}, 100%, 50%)`);
    gradient.addColorStop(1, `hsl(${((time * 30) + 180) % 360}, 100%, 50%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add grid effect
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
    }
    
    // Add main text with better padding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 20 + Math.sin(time * 2) * 10;
    ctx.fillText('ADVERTISE', 256, 140);
    ctx.fillText('HERE', 256, 200);
    
    // Add decorative elements
    const triangleSize = 30;
    ctx.beginPath();
    ctx.moveTo(256 - triangleSize, 280);
    ctx.lineTo(256 + triangleSize, 280);
    ctx.lineTo(256, 280 - triangleSize);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // Add arcade-style decorative text
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.shadowBlur = 10;
    ctx.fillText('INSERT COIN', 256, 350);
    
    // Add flashing "FREE PLAY" text
    if (Math.sin(time * 4) > 0) { // Flash at 2Hz
      ctx.fillText('FREE PLAY', 256, 450);
    }
    
    // Update texture
    texture.needsUpdate = true;
    
    // Animate light
    light.intensity = 1 + Math.sin(time * 2) * 0.5;
    
    requestAnimationFrame(animate);
  };
  
  animate();
  scene.add(poster);
  
  return poster;
};

const createDefaultAdvertisePoster = (scene) => {
  // Create canvas for dynamic texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Create dynamic texture
  const texture = new THREE.CanvasTexture(canvas);
  
  // Create poster geometry (using same dimensions as other posters)
  const posterGeometry = new THREE.PlaneGeometry(1.8, 2.2);
  const posterMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending
  });
  
  const poster = new THREE.Mesh(posterGeometry, posterMaterial);
  // Position on north wall between Claude memorial and HIGH SCORE poster
  poster.position.set(6, 2.5, -9.9); // Moved up to 2.5 units height
  poster.rotation.y = 0; // Face south to be visible from entrance
  
  // Add pulsing point light
  const light = new THREE.PointLight(0x9933ff, 1, 3); // Purple light to match Slot 3's original colors
  light.position.copy(poster.position);
  light.position.z += 0.1; // Move slightly away from wall
  scene.add(light);
  
  // Animation function
  const animate = () => {
    const time = Date.now() * 0.001;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 512);
    
    // Animated gradient background with purple to teal colors (from Slot 3)
    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#9933ff');  // Purple
    gradient.addColorStop(1, '#00ffcc');  // Teal
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add grid effect
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
    }
    
    // Add main text with better padding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00ffcc';  // Teal shadow to match gradient
    ctx.shadowBlur = 20 + Math.sin(time * 2) * 10;
    ctx.fillText('YOUR AD', 256, 140);
    ctx.fillText('HERE', 256, 200);
    
    // Add decorative elements - two crossing light beams
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate(time * 0.5);
    
    const gradient1 = ctx.createLinearGradient(-256, 0, 256, 0);
    gradient1.addColorStop(0, 'rgba(153, 51, 255, 0)');  // Purple
    gradient1.addColorStop(0.5, 'rgba(153, 51, 255, 0.2)');
    gradient1.addColorStop(1, 'rgba(153, 51, 255, 0)');
    
    ctx.fillStyle = gradient1;
    ctx.fillRect(-256, -10, 512, 20);
    
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(-256, -10, 512, 20);
    ctx.restore();
    
    // Add subtle pulsing border
    const borderWidth = 10;
    const borderPulse = Math.sin(time * 2) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(255, 255, 255, ${borderPulse * 0.5})`;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(borderWidth/2, borderWidth/2, 512-borderWidth, 512-borderWidth);
    
    // Update texture
    texture.needsUpdate = true;
    
    // Animate light
    light.intensity = 1 + Math.sin(time * 2) * 0.5;
    
    requestAnimationFrame(animate);
  };
  
  animate();
  scene.add(poster);
  
  return poster;
}; 