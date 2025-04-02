import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { gsap } from 'gsap';

import { createArcade } from './arcade.js';
import { createLighting } from './lighting.js';
import { setupInteraction } from './interaction.js';
import { MultiplayerManager } from './multiplayer.js';
import { createPlayerModel } from './playerModel.js';

// Initialize music player
const musicPlayer = {
  currentTrack: 0,
  audio: new Audio(),
  playlist: [
    'Neon Dreams.mp3',
    'Fragmented Reverie.mp3',
    'Fragments of Tomorrow.mp3',
    'Neon Shadows 2.mp3',
    'Neon Shadows.mp3',
    'Neon Skyline.mp3'
  ],
  
  init() {
    // Setup audio properties
    this.audio.volume = 0.1;
    
    // Add event listener for when a song ends
    this.audio.addEventListener('ended', () => {
      console.log('Song ended, playing next...'); // Add logging
      this.playNext();
    });

    // Add error listener
    this.audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
    });

    // Add loadstart listener
    this.audio.addEventListener('loadstart', () => {
      console.log('Started loading audio file');
    });

    // Add canplay listener
    this.audio.addEventListener('canplay', () => {
      console.log('Audio can start playing');
    });
    
    // Start with the first song
    if (this.playlist.length > 0) {
      console.log('Initializing playlist with', this.playlist.length, 'songs');
      this.loadAndPlayTrack(0);
    }
  },
  
  loadAndPlayTrack(index) {
    if (index >= 0 && index < this.playlist.length) {
      this.currentTrack = index;
      const baseUrl = window.location.hostname === 'www.andrewos.com' ? 'https://www.andrewos.com' : 'https://andrewos.com';
      this.audio.src = `${baseUrl}/vibe/assets/music/${this.playlist[index]}`;
      this.audio.play().catch(error => {
        console.log('Audio playback failed:', error);
      });
      console.log('Now playing:', this.playlist[index]);
    }
  },
  
  playNext() {
    // Move to next track, or back to start if we're at the end
    const nextTrack = (this.currentTrack + 1) % this.playlist.length;
    this.loadAndPlayTrack(nextTrack);
  }
};

// Start playing when user first interacts with the page
document.addEventListener('click', () => {
  musicPlayer.init();
}, { once: true });

// Global input state tracking - will work even if the window doesn't have focus
(function() {
  // Map of key states - true if pressed, false if not
  const keys = {};
  
  // Handle keydown event
  window.addEventListener('keydown', function(e) {
    keys[e.code] = true;
  });
  
  // Handle keyup event
  window.addEventListener('keyup', function(e) {
    keys[e.code] = false;
  });
  
  // Make keys accessible globally
  window.getKey = function(code) {
    return keys[code] || false;
  };
})();

// Prevent default touch behaviors
document.addEventListener('touchmove', (e) => {
  // Skip prevention if the target is a D-pad button
  if (e.target.closest('.d-pad')) {
    return;
  }
  e.preventDefault();
}, { passive: false });

document.addEventListener('touchstart', (e) => {
  // Skip prevention if the target is a D-pad button
  if (e.target.closest('.d-pad')) {
    return;
  }
  e.preventDefault();
}, { passive: false });

document.addEventListener('touchend', (e) => {
  // Skip prevention if the target is a D-pad button
  if (e.target.closest('.d-pad')) {
    return;
  }
  e.preventDefault();
}, { passive: false });

// Keep the other event listeners unchanged
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

// Prevent canvas touch events from scrolling
const canvas = document.querySelector('canvas.webgl');
canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.Fog(0x050505, 10, 50);

// Texture loader
const textureLoader = new THREE.TextureLoader();

// GLTF loader with its own loading manager
const gltfLoadingManager = new THREE.LoadingManager();
const gltfLoader = new GLTFLoader(gltfLoadingManager);

// Initialize empty cabinets array for interaction
const cabinets = [];

// Setup camera
const fov = 75;
const aspect = window.innerWidth / window.innerHeight;
const near = 0.1;
const far = 100;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

// Generate random spawn point
const generateRandomSpawnPoint = () => {
  // Define spawn area boundaries (the central area of the arcade)
  const minX = -8;
  const maxX = -2;
  const minZ = -9;
  const maxZ = -7;
  
  // Generate random X and Z position within boundaries
  const x = minX + Math.random() * (maxX - minX);
  const z = minZ + Math.random() * (maxZ - minZ);
  
  // Add a small random offset to further distribute players
  return {
    x: x + (Math.random() - 0.5) * 0.5, // Small random offset
    y: 0, // Changed from 1.6 to 0 to place model on ground
    z: z + (Math.random() - 0.5) * 0.5  // Small random offset
  };
};

// Get a random spawn position
const spawnPoint = generateRandomSpawnPoint();
camera.position.set(spawnPoint.x, 1.6, spawnPoint.z); // Keep camera at eye level
camera.rotation.y = -Math.PI/2; // Rotate 90 degrees clockwise
scene.add(camera);

// Create an euler for camera rotation
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
euler.setFromQuaternion(camera.quaternion);

// Controls
const controls = new PointerLockControls(camera, canvas);
controls.getObject().rotation.y = -Math.PI/2; // Ensure controls match camera's initial rotation

// Movement
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
window.velocityY = 0; // Make velocityY global
const gravity = 9.8;
const jumpStrength = 5.0;

// Fallback keyboard state tracking
const keyState = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  Space: false
};

// Poll keyboard state for movement
const pollKeyboardState = () => {
  // Skip polling on mobile devices to prevent interference with D-pad controls
  if (isMobileDevice()) {
    return;
  }
  
  // Update movement flags based on global key state
  moveForward = window.getKey('KeyW');
  moveBackward = window.getKey('KeyS');
  moveLeft = window.getKey('KeyA');
  moveRight = window.getKey('KeyD');
  
  // Handle jumping through global key state
  if (window.getKey('Space') && canJump) {
    window.velocityY = jumpStrength;
    canJump = false;
  }
};

const onKeyDown = function (event) {
  // We'll rely solely on the global key state tracking
  // and not set movement flags directly here
  
  // Only handle jump here since it's a one-time action
  if (event.code === 'Space' && canJump) {
    window.velocityY = jumpStrength;
    canJump = false;
  }
};

const onKeyUp = function (event) {
  // No need to do anything here since the global key tracking handles keyup events
};

window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

// Create and style chat input field
const chatInput = document.createElement('input');
chatInput.type = 'text';
chatInput.id = 'chat-input';
chatInput.setAttribute('autocomplete', 'off');
chatInput.setAttribute('autocorrect', 'off');
chatInput.setAttribute('autocapitalize', 'off');
chatInput.setAttribute('spellcheck', 'false');
chatInput.setAttribute('enterkeyhint', 'send');
chatInput.setAttribute('inputmode', 'text');
chatInput.style.cssText = `
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  max-width: 600px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  display: none;
  z-index: 1000;
  -webkit-appearance: none;
  border-radius: 4px;
  pointer-events: auto;
`;
document.body.appendChild(chatInput);

// Get keyboard toggle button
const keyboardToggle = document.querySelector('.keyboard-toggle');
const perspectiveToggle = document.querySelector('.perspective-toggle');

// Handle chat input visibility
let isChatInputVisible = false;
let isKeyboardVisible = false;

// Function to adjust input position for mobile keyboard
const adjustForKeyboard = () => {
  if (isMobileDevice()) {
    // Move the input field up when keyboard is visible
    const keyboardHeight = window.innerHeight * 0.4; // Estimate keyboard height as 40% of screen
    chatInput.style.bottom = isKeyboardVisible ? `${keyboardHeight + 20}px` : '20px';
    
    // Scroll to make input visible
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
};

// Function to toggle chat input
const toggleChatInput = () => {
  if (!isChatInputVisible) {
    // Show input field
    chatInput.style.display = 'block';
    // Use a timeout to ensure the input is visible before focusing
    setTimeout(() => {
      chatInput.focus();
      if (isMobileDevice()) {
        // For mobile, we need to explicitly click the input and make it editable
        chatInput.readOnly = false;
        chatInput.click();
        isKeyboardVisible = true;
        adjustForKeyboard();
      }
    }, 50);
    isChatInputVisible = true;
  } else {
    // Hide and clear input field
    chatInput.style.display = 'none';
    const chatText = chatInput.value;
    chatInput.value = '';
    chatInput.blur();
    isChatInputVisible = false;
    isKeyboardVisible = false;
    adjustForKeyboard();
    
    // Update chat text if there was any
    if (chatText) {
      if (isThirdPerson) {
        bodyModel.updateChatText(chatText);
      } else {
        bodyModel.updateChatText(chatText);
      }
      // Emit chat message to other players
      multiplayerManager.socket.emit('chatMessage', { text: chatText });
    }
  }
};

// Handle Enter key for desktop
window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    toggleChatInput();
  }
});

// Handle keyboard toggle button click for mobile
if (keyboardToggle) {
  // Use touchend for better mobile response
  keyboardToggle.addEventListener('touchend', (event) => {
    event.preventDefault();
    toggleChatInput();
  }, { passive: false });
  
  // Keep click handler for fallback
  keyboardToggle.addEventListener('click', (event) => {
    event.preventDefault();
    toggleChatInput();
  });
}

// Make chat input interactive
chatInput.addEventListener('touchend', (event) => {
  event.stopPropagation();
  if (isMobileDevice()) {
    chatInput.readOnly = false;
    chatInput.focus();
    isKeyboardVisible = true;
    adjustForKeyboard();
  }
});

// Prevent movement keys from working while typing and handle Enter
chatInput.addEventListener('keydown', (event) => {
  event.stopPropagation();
  if (event.key === 'Enter') {
    toggleChatInput();
    event.preventDefault();
  }
});

// Handle focus events
chatInput.addEventListener('focus', () => {
  isChatInputVisible = true;
  if (isMobileDevice()) {
    // Scroll the input into view on mobile and ensure it's editable
    chatInput.readOnly = false;
    isKeyboardVisible = true;
    adjustForKeyboard();
  }
});

chatInput.addEventListener('blur', () => {
  if (isMobileDevice() && isChatInputVisible) {
    // On mobile, refocus if we're still in chat mode
    setTimeout(() => {
      chatInput.readOnly = false;
      chatInput.focus();
      isKeyboardVisible = true;
      adjustForKeyboard();
    }, 100);
  }
});

// Handle viewport changes (keyboard appearing/disappearing)
window.visualViewport.addEventListener('resize', () => {
  if (isMobileDevice() && isChatInputVisible) {
    isKeyboardVisible = window.visualViewport.height < window.innerHeight;
    adjustForKeyboard();
  }
});

// Check if the device is mobile - improved detection
const isMobileDevice = () => {
  // Primary detection methods
  const hasTouchScreen = (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0)
  );
  
  // Secondary detection via user agent (less reliable but helps with some devices)
  const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Combined check - either method can trigger mobile mode
  const result = hasTouchScreen || userAgentMobile;
  
  return result;
};

// Initialize mobile controls if needed
const initializeMobileControls = () => {
  const isMobile = isMobileDevice();
  console.log(`Initializing mobile controls: ${isMobile ? 'Yes' : 'No'}`);
  
  // Clear any existing handlers
  const joystickContainer = document.querySelector('.joystick-container');
  joystickContainer.style.display = 'none'; // Hide by default
  
  // Web mic button - commented out for now
  // const webMicButton = document.getElementById('web-mic-toggle');
  
  if (isMobile) {
    console.log("Mobile device detected! Setting up joystick controls");
    
    // Hide WASD instructions on mobile
    document.querySelector('.controls-info').style.display = 'none';
    
    // Show joystick
    joystickContainer.style.display = 'block';
    
    // Hide web mic button on mobile
    // if (webMicButton) {
    //   webMicButton.style.display = 'none';
    // }
    
    // Log that mobile controls are ready
    console.log('Mobile controls initialized successfully');
  } else {
    console.log("Desktop/laptop detected - using keyboard/mouse controls");
    // Show WASD instructions on desktop
    document.querySelector('.controls-info').style.display = 'block';
    
    // Show web mic button on desktop
    // if (webMicButton) {
    //   webMicButton.style.display = 'flex';
    // }
  }
};

// Function to update the log text
const updateLog = (message) => {
  const logText = document.getElementById('log-text');
  const logBox = document.querySelector('.log-box');
  
  if (logText && logBox) {
    if (!message || message.trim() === '') {
      // Hide the log box when there's no message
      logBox.style.display = 'none';
    } else {
      // Show the log box and update the text when there's a message
      logBox.style.display = 'block';
      logText.textContent = message;
    }
  }
};

// Make updateLog globally accessible
window.updateLog = updateLog;

// Handle D-pad touch events
const handleDPadTouch = (direction, isPressed) => {  
  switch (direction) {
    case 'up':
      moveForward = isPressed;
      break;
    case 'down':
      moveBackward = isPressed;
      break;
    case 'left':
      moveLeft = isPressed;
      break;
    case 'right':
      moveRight = isPressed;
      break;
  }
};

// Global function to handle D-pad button clicks - defined at global scope
window.handleDPadClick = function(direction, isPressed) {
  try {        
    // Update movement flags
    switch (direction) {
      case 'up':
        moveForward = isPressed;
        break;
      case 'down':
        moveBackward = isPressed;
        break;
      case 'left':
        moveLeft = isPressed;
        break;
      case 'right':
        moveRight = isPressed;
        break;
    }
  } catch (err) {
    console.error("Error in handleDPadClick:", err);
  }
  
  // Ensure the function returns false to prevent default browser behavior
  return false;
};

// Mic toggle function
window.toggleMic = function() {
  try {
    // Find both possible mic buttons
    // const mobileMicButton = document.getElementById('mobile-mic-toggle');
    // const webMicButton = document.getElementById('web-mic-toggle');
    
    // Toggle active state
    // const isActive = (webMicButton && webMicButton.getAttribute('data-active') === 'true') || 
    //                  (mobileMicButton && mobileMicButton.classList.contains('active'));
    
    // Update new state
    // const newState = !isActive;
    
    // console.log("Toggling mic:", newState ? "ON" : "OFF", "Mobile button:", mobileMicButton ? "found" : "not found");
    
    // Update mobile button if it exists
    // if (mobileMicButton) {
    //   if (newState) {
    //     mobileMicButton.classList.add('active');
    //     // Also apply inline styles as backup
    //     mobileMicButton.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
    //     mobileMicButton.style.borderColor = 'rgba(255, 255, 255, 0.8)';
    //     mobileMicButton.style.color = 'rgba(0, 0, 0, 0.8)';
    //   } else {
    //     mobileMicButton.classList.remove('active');
    //     // Reset inline styles
    //     mobileMicButton.style.backgroundColor = 'rgba(128, 128, 128, 0.3)';
    //     mobileMicButton.style.borderColor = 'rgba(255, 255, 255, 0.4)';
    //     mobileMicButton.style.color = 'rgba(255, 255, 255, 0.8)';
    //   }
    //   console.log("Mobile button updated, active:", newState);
    // }
    
    // Update web button if it exists
    // if (webMicButton) {
    //   if (newState) {
    //     // Apply active styles to web button
    //     webMicButton.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
    //     webMicButton.style.borderColor = 'rgba(255, 255, 255, 0.8)';
    //     webMicButton.style.color = 'rgba(0, 0, 0, 0.8)';
    //     webMicButton.setAttribute('data-active', 'true');
    //   } else {
    //     // Apply inactive styles to web button
    //     webMicButton.style.backgroundColor = 'rgba(128, 128, 128, 0.3)';
    //     webMicButton.style.borderColor = 'rgba(255, 255, 255, 0.4)';
    //     webMicButton.style.color = 'rgba(255, 255, 255, 0.8)';
    //     webMicButton.setAttribute('data-active', 'false');
    //   }
    // }
    
    // Update log text based on state
    // updateLog(newState ? 'Microphone activated' : 'Microphone deactivated');
    // console.log(newState ? 'Microphone activated' : 'Microphone deactivated');
    
  } catch (err) {
    console.error("Error in toggleMic:", err);
  }
  
  return false;
};

// Global function to test updateLog
window.testUpdateLog = function() {
  const timestamp = new Date().toLocaleTimeString();
  const message = `Test button clicked at ${timestamp}`;
  console.log(message);
  
  // Use the updateLog function
  updateLog(message);
  
  // Additional visual feedback for testing
  try {
    const logText = document.getElementById('log-text');
    const logBox = document.querySelector('.log-box');
    
    if (logText) {
      logText.style.color = '#ff00ff'; // Make it pink for visibility
      
      // Flash the log box to make it more visible
      if (logBox) {
        logBox.style.backgroundColor = 'rgba(255, 0, 255, 0.7)';
        setTimeout(() => {
          logBox.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        }, 500);
      }
    }
  } catch (err) {
    console.error('Error updating log:', err);
  }
};

// Initialize mobile controls
console.log('Initializing mobile controls - first attempt');
initializeMobileControls();

// Add event listener to make sure D-pad controls initialize properly after load
window.addEventListener('load', () => {
  console.log('Window loaded - reinitializing mobile controls');
  
  // Give a slight delay to ensure DOM is fully ready
  setTimeout(() => {
    console.log('Delayed mobile initialization');
    initializeMobileControls();
    
    // Force focus for keyboard controls
    canvas.focus();
    window.focus();
    
    // Force show web mic button on desktop
    // const webMicButton = document.getElementById('web-mic-toggle');
    // if (webMicButton && !isMobileDevice()) {
    //   webMicButton.style.display = 'block';
    //   console.log('Web mic button should be visible now');
    // }
  }, 500);
  
  // Test D-pad display on mobile
  if (isMobileDevice()) {
    document.querySelector('.d-pad').style.display = 'block';
    console.log('D-pad visibility forced for mobile device');
  }
});

// Focus the window immediately to capture keyboard events
window.focus();

// Add click handler for pointer lock
canvas.addEventListener('click', () => {
  controls.lock();
});

// Add automatic focus to the canvas to make WASD controls work immediately
window.addEventListener('load', () => {
  canvas.focus();
  window.focus();
});

// Modify pointer lock event handlers
controls.addEventListener('lock', () => {
  document.querySelector('.controls-info').style.display = 'none';
  // Ensure keyboard events are captured when pointer is locked
  canvas.focus();
  window.focus();
});

controls.addEventListener('unlock', () => {
  document.querySelector('.controls-info').style.display = 'block';
  // Ensure keyboard events are captured when pointer is unlocked
  canvas.focus();
  window.focus();
});

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Create arcade environment
const arcade = createArcade(scene, textureLoader);

// Create lighting
const { ambientLight, directionalLight, pointLights } = createLighting(scene);

// Setup interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const interaction = setupInteraction(scene, camera, raycaster, cabinets);

// Resize handler
window.addEventListener('resize', () => {
  // Update sizes
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Update camera
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Clock
const clock = new THREE.Clock();
let previousTime = 0;

// Create a Box3 for each cabinet
const cabinetBoxes = [];

// Function to create a Box3 for a cabinet
const createCabinetBox = (cabinet) => {
  const box = new THREE.Box3();
  const width = 1.0;  // Cabinet width
  const depth = 0.7;  // Cabinet depth
  const height = 2.0; // Cabinet height
  
  // Create box relative to cabinet position
  const min = new THREE.Vector3(
    cabinet.position.x - width/2,
    cabinet.position.y,
    cabinet.position.z - depth/2
  );
  const max = new THREE.Vector3(
    cabinet.position.x + width/2,
    cabinet.position.y + height,
    cabinet.position.z + depth/2
  );
  
  box.set(min, max);
  return box;
};

// Function to check cabinet and player collisions
const checkCabinetCollisions = () => {
  // Create player box
  const playerRadius = 0.3;
  const playerBox = new THREE.Box3();
  const playerPos = isThirdPerson ? bodyModel.position : camera.position;
  
  const playerMin = new THREE.Vector3(
    playerPos.x - playerRadius,
    playerPos.y - 1.6,
    playerPos.z - playerRadius
  );
  const playerMax = new THREE.Vector3(
    playerPos.x + playerRadius,
    playerPos.y,
    playerPos.z + playerRadius
  );
  playerBox.set(playerMin, playerMax);

  // Check collision with each cabinet
  for (const box of cabinetBoxes) {
    if (playerBox.intersectsBox(box)) {
      // On collision, find the push direction
      const pushDir = new THREE.Vector3();
      pushDir.subVectors(playerPos, box.getCenter(new THREE.Vector3()));
      pushDir.y = 0; // Only push horizontally
      pushDir.normalize();
      
      // Push player out by overlap amount
      const overlap = playerRadius + 0.1; // Small buffer
      if (isThirdPerson) {
        bodyModel.position.add(pushDir.multiplyScalar(overlap));
      } else {
        camera.position.add(pushDir.multiplyScalar(overlap));
      }
      return true;
    }
  }

  // Check collision with other players
  for (const [id, otherPlayer] of multiplayerManager.players) {
    if (!otherPlayer.currentPosition) continue;
    
    const otherPlayerBox = new THREE.Box3();
    const otherPlayerMin = new THREE.Vector3(
      otherPlayer.currentPosition.x - playerRadius,
      otherPlayer.currentPosition.y - 1.6,
      otherPlayer.currentPosition.z - playerRadius
    );
    const otherPlayerMax = new THREE.Vector3(
      otherPlayer.currentPosition.x + playerRadius,
      otherPlayer.currentPosition.y,
      otherPlayer.currentPosition.z + playerRadius
    );
    otherPlayerBox.set(otherPlayerMin, otherPlayerMax);

    if (playerBox.intersectsBox(otherPlayerBox)) {
      // On collision, find the push direction
      const pushDir = new THREE.Vector3();
      pushDir.subVectors(playerPos, otherPlayer.currentPosition);
      pushDir.y = 0; // Only push horizontally
      
      // If the distance is very small, add a more significant random offset to prevent getting stuck
      const distance = pushDir.length();
      if (distance < 0.2) {
        // Apply a stronger random offset for near-zero distances
        pushDir.x += (Math.random() - 0.5) * 0.5;
        pushDir.z += (Math.random() - 0.5) * 0.5;
        console.log("Players too close - adding strong random push");
      } else if (distance < 0.5) {
        // Apply a medium random offset for small distances
        pushDir.x += (Math.random() - 0.5) * 0.3;
        pushDir.z += (Math.random() - 0.5) * 0.3;
      }
      
      pushDir.normalize();
      
      // Increase the overlap amount to prevent getting stuck
      const overlap = playerRadius * 2 + 0.5; // Significantly increased buffer
      
      // Apply the push with varying force based on proximity
      const pushForce = distance < 0.2 ? overlap * 1.5 : overlap;
      
      if (isThirdPerson) {
        bodyModel.position.add(pushDir.multiplyScalar(pushForce));
      } else {
        camera.position.add(pushDir.multiplyScalar(pushForce));
      }
      return true;
    }
  }
  
  return false;
};

// Load GLTF model with interaction data
const loadCabinetModel = (path, position, cabinetData, rotation = 0, cabinetNumber) => {
  // Create a group to hold both the cabinet and its number
  const modelGroup = new THREE.Group();
  
  // Add interaction data to the group itself
  modelGroup.userData = {
    id: cabinetData.id,
    name: cabinetData.name,
    description: cabinetData.description,
    url: cabinetData.url,
    interactive: true,
    number: cabinetNumber
  };

  // Commented out GLTF loading for performance testing
  /*
  gltfLoader.load(
    path,
    (gltf) => {
      console.log('Cabinet model loaded successfully:', gltf);
      const model = gltf.scene;
      model.scale.set(0.00375, 0.00375, 0.00375);
      model.rotation.y = rotation;
      modelGroup.add(model);
  */
      
  // Create number label for this cabinet
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
  ctx.fillText(cabinetNumber.toString(), 64, 64);

  // Create texture
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });

  // Create label plane
  const labelGeometry = new THREE.PlaneGeometry(0.3, 0.3);
  const label = new THREE.Mesh(labelGeometry, material);
  
  // Position label relative to cabinet within the group
  const labelOffset = rotation === 0 ? 0 : 0;
  label.position.set(
    (rotation === 0 ? -0.8 : 0.8), // Keep the left/right offset
    0.01, // Almost directly on floor (slight offset to prevent z-fighting)
    0 // Aligned with cabinet center
  );
  label.rotation.x = -Math.PI / 2; // Lay flat on floor
  
  // Set rotation based on which row the cabinet belongs to
  if (cabinetNumber <= 3) { // Front row cabinets (1-3)
    label.rotation.z = Math.PI; // 180-degree rotation for front row numbers
  } else { // Back row cabinets (9-11)
    label.rotation.y = 0; // No rotation needed for back row
  }
  
  modelGroup.add(label);
  
  // Position the entire group
  modelGroup.position.set(position.x, position.y, position.z);
  
  scene.add(modelGroup);
  cabinets.push(modelGroup); // Push the entire modelGroup instead of just the model
  
  // Initialize cabinet boxes when loading cabinets
  cabinetBoxes.push(createCabinetBox(modelGroup));
  /*
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      const totalProgress = (loadedCabinets + (xhr.loaded / xhr.total)) / totalCabinets;
      document.querySelector('.loading-bar').style.width = `${totalProgress * 100}%`;
    },
    (error) => {
      console.error('Error loading cabinet model:', error);
    }
  );
  */
};

// Cabinet data for front row (cabinets 1-3)
const frontRowData = [
  {
    id: 'fly-pieter',
    name: 'Fly Pieter',
    description: 'The notorious flying game by @levelsio',
    url: 'https://fly.pieter.com/'
  },
  {
    id: 'garden-club',
    name: 'Garden Club',
    description: 'A peaceful gardening simulator',
    url: 'https://garden.club/'
  },
  {
    id: 'pizza-legends',
    name: 'Pizza Legends',
    description: 'A pizza-themed RPG adventure',
    url: 'https://pizza-legends.io/'
  }
];

// Cabinet data for back row (cabinets 9-11)
const backRowData = [
  {
    id: 'vibe-synth',
    name: 'Vibe Synth',
    description: 'Create chill music with this synth',
    url: 'https://vibe-synth.com/'
  },
  {
    id: 'pixel-paint',
    name: 'Pixel Paint',
    description: 'Create pixel art masterpieces',
    url: 'https://pixel-paint.app/'
  },
  {
    id: 'retro-racer',
    name: 'Retro Racer',
    description: 'A vaporwave racing experience',
    url: 'https://retro-racer.io/'
  }
];

// Clear existing cabinets array
cabinets.length = 0;

// Load front row cabinets (1-3)
frontRowData.forEach((data, index) => {
  const x = -10 + (index * 2.5);
  const z = -6.5;
  loadCabinetModel('assets/gameCabinet/scene.gltf', { x, y: 0, z }, data, Math.PI, index + 1);
});

// Load back row cabinets (9-11)
backRowData.forEach((data, index) => {
  const x = -10 + (index * 2.5);
  const z = -9.5;
  loadCabinetModel('assets/gameCabinet/scene.gltf', { x, y: 0, z }, data, 0, index + 9);
});

// Create Pong cabinet (cabinet 12)
const createPongCabinet = () => {
  const modelGroup = new THREE.Group();
  
  // Create cabinet body
  const cabinetGeometry = new THREE.BoxGeometry(1.0, 2.1, 0.88);
  const cabinetMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const cabinet = new THREE.Mesh(cabinetGeometry, cabinetMaterial);
  modelGroup.add(cabinet);
  
  // Create control panel wedge
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
  wedge.rotation.set(Math.PI / 2, Math.PI / 2, 0);  // Rotate 90 degrees around X axis to position angled side behind screen
  modelGroup.add(wedge);

  // Create back panel (cube)
  const backPanelGeometry = new THREE.BoxGeometry(1.0, 0.6, 0.3);  // Reduced depth for back section
  const backPanelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const backPanel = new THREE.Mesh(backPanelGeometry, backPanelMaterial);
  
  // Position back panel behind wedge
  backPanel.position.set(0, 1.7, -0.15);  // Lower height to sit on top of wedge
  modelGroup.add(backPanel);
  
  // Create header with "PING" text
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
  headerCtx.fillText('PING', 128, 32);
  
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
  modelGroup.add(headerText);
  
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
  header.position.set(0, 2.0, -0.04);  // Moved back to align with cabinet back
  header.rotation.set(0, Math.PI, 0);  // Rotated 180 degrees to face forward
  modelGroup.add(header);
  
  // Create screen canvas and context first
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 512;
  screenCanvas.height = 512;
  const screenContext = screenCanvas.getContext('2d');
  
  // Add user data including screen update function BEFORE creating the screen
  modelGroup.userData = {
    id: 'pong',
    name: 'Pong',
    description: 'Classic arcade Pong game',
    interactive: true,
    number: 12,
    screenContext: screenContext,
    lastFlashTime: 0,
    isTextVisible: true,
    currentMessage: 'CLICK TO START',
    gameState: 'title',
    // Add score tracking
    leftScore: 0,
    rightScore: 0,
    gameOverStartTime: 0,
    // Add paddle state
    leftPaddleY: 216,
    paddleSpeed: 8, // Increased from 5 to 8 for better responsiveness
    paddleHeight: 80,
    // Add ball state with constant speed
    ballX: 256,
    ballY: 256,
    ballSize: 8,
    BALL_BASE_SPEED: 3, // Constant base speed
    ballSpeedX: 4, // Initial speed
    ballSpeedY: 0,
    lastPaddleY: 216,
    scoreFlashCount: 0,
    scoreFlashTime: 0,
    scoringState: null,
    // Add explosion state
    explosionParticles: [],
    resetBall: function() {
      this.ballX = 256; // Center of screen
      this.ballY = 256;
      // Random direction (left or right) but constant speed
      this.ballSpeedX = this.BALL_BASE_SPEED * (Math.random() < 0.5 ? -1 : 1);
      this.ballSpeedY = 0; // Reset vertical speed
    },
    createExplosion: function(x, y) {
      // Create 8 particles in different directions
      this.explosionParticles = [];
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        this.explosionParticles.push({
          x: x,
          y: y,
          speedX: Math.cos(angle) * 4,
          speedY: Math.sin(angle) * 4,
          size: 6,
          life: 1.0 // Life from 1.0 to 0.0
        });
      }
    },
    updateExplosion: function() {
      // Update each particle
      for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
        const particle = this.explosionParticles[i];
        
        // Move particle
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Decrease life
        particle.life -= 0.05;
        
        // Remove dead particles
        if (particle.life <= 0) {
          this.explosionParticles.splice(i, 1);
        }
      }
    },
    handleClick: () => {
      if (modelGroup.userData.gameState === 'title') {
        modelGroup.userData.gameState = 'waiting';
        modelGroup.userData.currentMessage = '';
        modelGroup.userData.player1Id = multiplayerManager.socket.id;
        modelGroup.userData.updateScreen('');
        
        // Emit game state change
        multiplayerManager.socket.emit('pongStateChange', {
          cabinetId: modelGroup.userData.id,
          state: 'waiting',
          player1Id: multiplayerManager.socket.id
        });
      } else if (modelGroup.userData.gameState === 'waiting') {
        // Check if this is player 1 clicking again (for AI mode) or a different player (for multiplayer)
        if (multiplayerManager.socket.id === modelGroup.userData.player1Id) {
          // Player 1 clicked again - start AI mode
          modelGroup.userData.gameState = 'playing';
          modelGroup.userData.isMultiplayer = false;
          modelGroup.userData.currentMessage = '';
          modelGroup.userData.leftScore = 0;
          modelGroup.userData.rightScore = 0;
          modelGroup.userData.resetBall();
          modelGroup.userData.updateScreen('');
          
          // Emit game state change for AI mode
          multiplayerManager.socket.emit('pongStateChange', {
            cabinetId: modelGroup.userData.id,
            state: 'playing',
            isMultiplayer: false,
            player1Id: multiplayerManager.socket.id
          });
        } else {
          // Different player clicked - start multiplayer mode
          modelGroup.userData.gameState = 'playing';
          modelGroup.userData.isMultiplayer = true;
          modelGroup.userData.player2Id = multiplayerManager.socket.id;
          modelGroup.userData.currentMessage = '';
          modelGroup.userData.leftScore = 0;
          modelGroup.userData.rightScore = 0;
          modelGroup.userData.resetBall();
          modelGroup.userData.updateScreen('');
          
          // Emit game state change for multiplayer mode
          multiplayerManager.socket.emit('pongStateChange', {
            cabinetId: modelGroup.userData.id,
            state: 'playing',
            isMultiplayer: true,
            player1Id: modelGroup.userData.player1Id,
            player2Id: multiplayerManager.socket.id
          });
        }
      }
    },
    updateScreen: (message) => {
      // Update the current message
      modelGroup.userData.currentMessage = message;
      
      // Clear the canvas
      screenContext.fillStyle = '#000000';
      screenContext.fillRect(0, 0, 512, 512);
      
      if (modelGroup.userData.gameState === 'playing') {
        // Draw game elements
        screenContext.fillStyle = '#00ff00';
        
        // Draw scores with flash effect if scoring
        screenContext.font = 'bold 32px "Press Start 2P", monospace';
        screenContext.textAlign = 'center';
        
        const currentTime = Date.now();
        if (modelGroup.userData.scoringState === 'left' && 
            Math.floor((currentTime - modelGroup.userData.scoreFlashTime) / 200) % 2 === 0) {
          screenContext.fillStyle = '#ffffff';
        }
        screenContext.fillText(modelGroup.userData.leftScore.toString(), 128, 64);
        screenContext.fillStyle = '#00ff00';
        
        if (modelGroup.userData.scoringState === 'right' && 
            Math.floor((currentTime - modelGroup.userData.scoreFlashTime) / 200) % 2 === 0) {
          screenContext.fillStyle = '#ffffff';
        }
        screenContext.fillText(modelGroup.userData.rightScore.toString(), 384, 64);
        screenContext.fillStyle = '#00ff00';
        
        // Draw left paddle
        screenContext.fillRect(50, modelGroup.userData.leftPaddleY, 10, modelGroup.userData.paddleHeight);
        
        // Draw right paddle
        screenContext.fillRect(452, modelGroup.userData.rightPaddleY, 10, 80);
        
        // Draw ball
        screenContext.fillRect(
          modelGroup.userData.ballX - modelGroup.userData.ballSize/2,
          modelGroup.userData.ballY - modelGroup.userData.ballSize/2,
          modelGroup.userData.ballSize,
          modelGroup.userData.ballSize
        );
        
        // Draw explosion particles
        if (modelGroup.userData.explosionParticles.length > 0) {
          screenContext.fillStyle = '#ffa500'; // Orange color
          for (const particle of modelGroup.userData.explosionParticles) {
            const size = particle.size * particle.life;
            screenContext.fillRect(
              particle.x - size/2,
              particle.y - size/2,
              size,
              size
            );
          }
        }
      } else if (modelGroup.userData.gameState === 'gameover') {
        // Game over display with dramatic flashing
        const currentTime = Date.now();
        const timeSinceGameOver = currentTime - modelGroup.userData.gameOverStartTime;
        
        // Only proceed to title screen after exactly 5 seconds
        if (timeSinceGameOver >= 5000) {
          modelGroup.userData.gameState = 'title';
          modelGroup.userData.currentMessage = 'CLICK TO START';
          modelGroup.userData.leftScore = 0;
          modelGroup.userData.rightScore = 0;
          modelGroup.userData.scoringState = null;
          modelGroup.userData.explosionParticles = [];
          modelGroup.userData.updateScreen(modelGroup.userData.currentMessage);
          return;
        }
        
        // Flash pattern: 0.7s on, 0.3s off
        const flashPhase = (timeSinceGameOver % 1000) / 1000;
        const isVisible = flashPhase < 0.7;
        
        if (isVisible) {
          screenContext.shadowColor = '#00ff00';
          screenContext.shadowBlur = 30;
          screenContext.fillStyle = '#00ff00';
          screenContext.textAlign = 'center';
          screenContext.textBaseline = 'middle';
          screenContext.font = 'bold 32px "Press Start 2P", monospace';
          
          const winner = modelGroup.userData.leftScore > modelGroup.userData.rightScore ? 'ONE' : 'TWO';
          screenContext.fillText(`PLAYER ${winner} WINS`, 256, 256);
        }
      } else {
        // Title or waiting state display
        screenContext.shadowColor = '#00ff00';
        screenContext.shadowBlur = 20;
        screenContext.fillStyle = '#00ff00';
        screenContext.textAlign = 'center';
        screenContext.textBaseline = 'middle';
        
        // Draw the main message (flashing)
        if (modelGroup.userData.isTextVisible) {
          screenContext.font = 'bold 28px "Press Start 2P", monospace';
          if (modelGroup.userData.gameState === 'title') {
            screenContext.fillText('CLICK TO START', 256, 100);
          } else if (modelGroup.userData.gameState === 'waiting') {
            // Split "WAITING FOR PLAYER 2" into two lines
            screenContext.fillText('WAITING FOR', 256, 80);
            screenContext.fillText('PLAYER TWO', 256, 120);
          }
        }
        
        // Draw the AI option text only in waiting state
        if (modelGroup.userData.gameState === 'waiting') {
          screenContext.font = 'bold 20px "Press Start 2P", monospace';
          screenContext.fillText('CLICK TO PLAY', 256, 380);
          screenContext.fillText('AGAINST AI', 256, 420);
        }
      }
      
      // Update the texture
      screenTexture.needsUpdate = true;
    },
    // Add function to update paddle position
    updatePaddle: () => {
      if (modelGroup.userData.gameState === 'playing') {
        // Store previous paddle position
        modelGroup.userData.lastPaddleY = modelGroup.userData.leftPaddleY;
        
        // Get arrow key states
        const upPressed = window.getKey('ArrowUp');
        const downPressed = window.getKey('ArrowDown');
        
        // Handle paddle movement based on game mode
        if (modelGroup.userData.isMultiplayer) {
          // In multiplayer mode, each player controls their own paddle
          if (multiplayerManager.socket.id === modelGroup.userData.player2Id) {
            // Player 2 controls right paddle
            if (upPressed) {
              modelGroup.userData.rightPaddleY = Math.max(
                0, 
                modelGroup.userData.rightPaddleY - modelGroup.userData.paddleSpeed
              );
            }
            if (downPressed) {
              modelGroup.userData.rightPaddleY = Math.min(
                512 - modelGroup.userData.paddleHeight,
                modelGroup.userData.rightPaddleY + modelGroup.userData.paddleSpeed
              );
            }
            
            // Emit paddle position to other player if moved
            if (upPressed || downPressed) {
              multiplayerManager.socket.emit('pongPaddleMove', {
                cabinetId: modelGroup.userData.id,
                paddleY: modelGroup.userData.rightPaddleY
              });
            }
          } else {
            // Player 1 controls left paddle
            if (upPressed) {
              modelGroup.userData.leftPaddleY = Math.max(
                0, 
                modelGroup.userData.leftPaddleY - modelGroup.userData.paddleSpeed
              );
            }
            if (downPressed) {
              modelGroup.userData.leftPaddleY = Math.min(
                512 - modelGroup.userData.paddleHeight,
                modelGroup.userData.leftPaddleY + modelGroup.userData.paddleSpeed
              );
            }
            
            // Emit paddle position to other player if moved
            if (upPressed || downPressed) {
              multiplayerManager.socket.emit('pongPaddleMove', {
                cabinetId: modelGroup.userData.id,
                paddleY: modelGroup.userData.leftPaddleY
              });
            }
          }
        } else {
          // Single player mode - player controls left paddle only
          if (upPressed) {
            modelGroup.userData.leftPaddleY = Math.max(
              0, 
              modelGroup.userData.leftPaddleY - modelGroup.userData.paddleSpeed
            );
          }
          if (downPressed) {
            modelGroup.userData.leftPaddleY = Math.min(
              512 - modelGroup.userData.paddleHeight,
              modelGroup.userData.leftPaddleY + modelGroup.userData.paddleSpeed
            );
          }
          
          // Update AI paddle in single player mode
          modelGroup.userData.updateAIPaddle();
          
          // Emit paddle positions in AI mode too
          if (upPressed || downPressed || modelGroup.userData.rightPaddleY !== modelGroup.userData.lastRightPaddleY) {
            multiplayerManager.socket.emit('pongPaddleMove', {
              cabinetId: modelGroup.userData.id,
              isAI: true,
              leftPaddleY: modelGroup.userData.leftPaddleY,
              rightPaddleY: modelGroup.userData.rightPaddleY
            });
          }
        }
        
        // Store last right paddle position for AI movement detection
        modelGroup.userData.lastRightPaddleY = modelGroup.userData.rightPaddleY;
        
        // Always update the screen after any movement
        modelGroup.userData.updateScreen(modelGroup.userData.currentMessage);
      }
    },
    // Add function to update ball position
    updateBall: () => {
      if (modelGroup.userData.gameState === 'playing') {
        // If we're in scoring state, handle score animation
        if (modelGroup.userData.scoringState) {
          const currentTime = Date.now();
          const flashDuration = currentTime - modelGroup.userData.scoreFlashTime;
          
          // Update explosion if it exists
          if (modelGroup.userData.explosionParticles.length > 0) {
            modelGroup.userData.updateExplosion();
          }
          
          // Each flash cycle is 400ms (200ms on, 200ms off)
          if (flashDuration >= 1200) { // 3 flashes = 1200ms
            // Reset scoring state and reset ball
            modelGroup.userData.scoringState = null;
            modelGroup.userData.explosionParticles = []; // Clear any remaining particles
            modelGroup.userData.resetBall();
            
            // Emit ball reset
            multiplayerManager.socket.emit('pongBallUpdate', {
              cabinetId: modelGroup.userData.id,
              x: modelGroup.userData.ballX,
              y: modelGroup.userData.ballY,
              speedX: modelGroup.userData.ballSpeedX,
              speedY: modelGroup.userData.ballSpeedY
            });
          }
          
          // Update screen to show flash animation and explosion
          modelGroup.userData.updateScreen(modelGroup.userData.currentMessage);
          return;
        }

        // Only the game host (player 1) updates ball position
        if (multiplayerManager.socket.id === modelGroup.userData.player1Id) {
          // Update AI paddle in single player mode
          if (!modelGroup.userData.isMultiplayer) {
            modelGroup.userData.updateAIPaddle();
          }
          
          // Move ball with constant speed
          modelGroup.userData.ballX += modelGroup.userData.ballSpeedX;
          modelGroup.userData.ballY += modelGroup.userData.ballSpeedY;
          
          // Check for top/bottom wall collisions
          if (modelGroup.userData.ballY < 0 || modelGroup.userData.ballY > 512) {
            modelGroup.userData.ballSpeedY = -modelGroup.userData.ballSpeedY;
          }
          
          // Check for paddle collisions and scoring
          if (modelGroup.userData.ballX < 0) { // Past left edge
            // Create explosion at impact point
            modelGroup.userData.createExplosion(modelGroup.userData.ballX, modelGroup.userData.ballY);
            
            // Point for right side (Player Two)
            modelGroup.userData.rightScore++;
            modelGroup.userData.scoringState = 'right';
            modelGroup.userData.scoreFlashTime = Date.now();
            
            // Emit score update
            multiplayerManager.socket.emit('pongScoreUpdate', {
              cabinetId: modelGroup.userData.id,
              leftScore: modelGroup.userData.leftScore,
              rightScore: modelGroup.userData.rightScore,
              scoringState: modelGroup.userData.scoringState
            });
            
            // Check for game over
            if (modelGroup.userData.rightScore >= 10) {
              modelGroup.userData.gameState = 'gameover';
              modelGroup.userData.gameOverStartTime = Date.now();
              modelGroup.userData.isTextVisible = true;
              modelGroup.userData.scoringState = null;
              modelGroup.userData.explosionParticles = [];
              
              // Emit game over
              multiplayerManager.socket.emit('pongGameOver', {
                cabinetId: modelGroup.userData.id,
                leftScore: modelGroup.userData.leftScore,
                rightScore: modelGroup.userData.rightScore
              });
              
              modelGroup.userData.updateScreen(''); // Force immediate update
              return;
            }
          } else if (modelGroup.userData.ballX >= 512) { // Changed from > to >= for consistent edge detection
            // Create explosion at impact point
            modelGroup.userData.createExplosion(modelGroup.userData.ballX, modelGroup.userData.ballY);
            
            // Point for left side (Player One)
            modelGroup.userData.leftScore++;
            modelGroup.userData.scoringState = 'left';
            modelGroup.userData.scoreFlashTime = Date.now();
            
            // Emit score update
            multiplayerManager.socket.emit('pongScoreUpdate', {
              cabinetId: modelGroup.userData.id,
              leftScore: modelGroup.userData.leftScore,
              rightScore: modelGroup.userData.rightScore,
              scoringState: modelGroup.userData.scoringState
            });
            
            // Check for game over
            if (modelGroup.userData.leftScore >= 10) {
              modelGroup.userData.gameState = 'gameover';
              modelGroup.userData.gameOverStartTime = Date.now();
              modelGroup.userData.isTextVisible = true;
              modelGroup.userData.scoringState = null;
              
              // Emit game over
              multiplayerManager.socket.emit('pongGameOver', {
                cabinetId: modelGroup.userData.id,
                leftScore: modelGroup.userData.leftScore,
                rightScore: modelGroup.userData.rightScore
              });
              
              modelGroup.userData.updateScreen(''); // Force immediate update
            }
          } else if (modelGroup.userData.ballSpeedX < 0) { // Moving left
            // Check left paddle collision - adjusted for visual contact
            const leftPaddleRight = 60; // Right edge of left paddle
            if (modelGroup.userData.ballX - modelGroup.userData.ballSize/2 <= leftPaddleRight && 
                modelGroup.userData.ballX + modelGroup.userData.ballSize/2 > leftPaddleRight - 10 && // Full paddle width check
                modelGroup.userData.ballY >= modelGroup.userData.leftPaddleY &&
                modelGroup.userData.ballY <= modelGroup.userData.leftPaddleY + modelGroup.userData.paddleHeight) {
              // Set ball position to just right of paddle to ensure visual contact
              modelGroup.userData.ballX = leftPaddleRight + modelGroup.userData.ballSize/2;
              
              // Calculate relative hit position on paddle (-1 to 1)
              const relativeHitPos = (modelGroup.userData.ballY - modelGroup.userData.leftPaddleY) / modelGroup.userData.paddleHeight;
              
              // Calculate paddle movement speed
              const paddleSpeed = modelGroup.userData.leftPaddleY - modelGroup.userData.lastPaddleY;
              
              // Reverse horizontal direction while maintaining constant speed
              modelGroup.userData.ballSpeedX = modelGroup.userData.BALL_BASE_SPEED;
              
              // Add vertical component while maintaining constant overall speed
              const verticalFactor = (relativeHitPos - 0.5) * 0.8; // Reduced from 4 to 0.8 for less extreme angles
              modelGroup.userData.ballSpeedY = verticalFactor * modelGroup.userData.BALL_BASE_SPEED;
              
              // Normalize the velocity vector to maintain constant speed
              const speed = Math.sqrt(modelGroup.userData.ballSpeedX * modelGroup.userData.ballSpeedX + 
                                   modelGroup.userData.ballSpeedY * modelGroup.userData.ballSpeedY);
              modelGroup.userData.ballSpeedX = (modelGroup.userData.ballSpeedX / speed) * modelGroup.userData.BALL_BASE_SPEED;
              modelGroup.userData.ballSpeedY = (modelGroup.userData.ballSpeedY / speed) * modelGroup.userData.BALL_BASE_SPEED;
            }
          } else { // Moving right
            // Check right paddle collision - adjusted for visual contact
            const rightPaddleLeft = 452; // Left edge of right paddle
            if (modelGroup.userData.ballX + modelGroup.userData.ballSize/2 >= rightPaddleLeft && 
                modelGroup.userData.ballX - modelGroup.userData.ballSize/2 < rightPaddleLeft + 10 && // Full paddle width check
                modelGroup.userData.ballY >= modelGroup.userData.rightPaddleY &&
                modelGroup.userData.ballY <= modelGroup.userData.rightPaddleY + 80) {
              // Set ball position to just left of paddle to ensure visual contact
              modelGroup.userData.ballX = rightPaddleLeft - modelGroup.userData.ballSize/2;
              
              // Calculate relative hit position on paddle (-1 to 1)
              const relativeHitPos = (modelGroup.userData.ballY - modelGroup.userData.rightPaddleY) / 80;
              
              // Reverse horizontal direction while maintaining constant speed
              modelGroup.userData.ballSpeedX = -modelGroup.userData.BALL_BASE_SPEED;
              
              // Add vertical component while maintaining constant overall speed
              const verticalFactor = (relativeHitPos - 0.5) * 0.8; // Reduced from 4 to 0.8 for less extreme angles
              modelGroup.userData.ballSpeedY = verticalFactor * modelGroup.userData.BALL_BASE_SPEED;
              
              // Normalize the velocity vector to maintain constant speed
              const speed = Math.sqrt(modelGroup.userData.ballSpeedX * modelGroup.userData.ballSpeedX + 
                                   modelGroup.userData.ballSpeedY * modelGroup.userData.ballSpeedY);
              modelGroup.userData.ballSpeedX = (modelGroup.userData.ballSpeedX / speed) * modelGroup.userData.BALL_BASE_SPEED;
              modelGroup.userData.ballSpeedY = (modelGroup.userData.ballSpeedY / speed) * modelGroup.userData.BALL_BASE_SPEED;
            }
          }
          
          // Emit ball position update
          multiplayerManager.socket.emit('pongBallUpdate', {
            cabinetId: modelGroup.userData.id,
            x: modelGroup.userData.ballX,
            y: modelGroup.userData.ballY,
            speedX: modelGroup.userData.ballSpeedX,
            speedY: modelGroup.userData.ballSpeedY
          });
        }
        
        // Update the screen
        modelGroup.userData.updateScreen(modelGroup.userData.currentMessage);
      }
    },
    // Add AI paddle state
    rightPaddleY: 216,
    rightPaddleSpeed: 4, // Slightly slower than player for fairness
    aiDifficultyFactor: 0.92, // Makes AI miss sometimes (1.0 would be perfect)
    updateAIPaddle: function() {
      if (this.gameState === 'playing') {
        // Predict where ball will intersect with paddle's x position
        const distanceToAI = 452 - this.ballX; // x distance to AI paddle
        const timeToIntercept = distanceToAI / Math.abs(this.ballSpeedX);
        const predictedY = this.ballY + (this.ballSpeedY * timeToIntercept);
        
        // Add some randomness to make AI imperfect
        const targetY = predictedY * this.aiDifficultyFactor;
        
        // Move paddle towards predicted position
        const paddleCenter = this.rightPaddleY + 40; // Center of paddle
        
        if (paddleCenter < targetY - 10) {
          // Move down
          this.rightPaddleY = Math.min(512 - 80, this.rightPaddleY + this.rightPaddleSpeed);
        } else if (paddleCenter > targetY + 10) {
          // Move up
          this.rightPaddleY = Math.max(0, this.rightPaddleY - this.rightPaddleSpeed);
        }
      }
    }
  };
  
  // Initial screen content
  screenContext.fillStyle = '#000000';
  screenContext.fillRect(0, 0, 512, 512);
  
  // Add retro green text with glow effect (common settings)
  screenContext.shadowColor = '#00ff00';
  screenContext.shadowBlur = 20;
  screenContext.fillStyle = '#00ff00';
  screenContext.textAlign = 'center';
  screenContext.textBaseline = 'middle';
  
  // Draw initial main message
  screenContext.font = 'bold 28px "Press Start 2P", monospace';
  screenContext.fillText('CLICK TO START', 256, 100);
  
  // Draw initial AI text on two lines
  screenContext.font = 'bold 20px "Press Start 2P", monospace';
  screenContext.fillText('CLICK TO PLAY', 256, 380);
  screenContext.fillText('AGAINST AI', 256, 420);
  
  // Create screen with texture
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  const screenGeometry = new THREE.PlaneGeometry(0.8, 0.6);
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTexture,
    emissive: 0xffffff,
    emissiveMap: screenTexture
  });
  const screen = new THREE.Mesh(screenGeometry, screenMaterial);
  screen.position.set(0, 1.5, 0.27);
  screen.rotation.x = -0.4;
  modelGroup.add(screen);
  
  // Store texture reference for updates
  modelGroup.userData.screenTexture = screenTexture;
  
  // Add flash animation function
  const flashScreen = () => {
    const currentTime = Date.now();
    
    // Always update screen in game over state to ensure flashing works
    if (modelGroup.userData.gameState === 'gameover') {
      modelGroup.userData.updateScreen('');
      return;
    }
    
    // Handle normal flashing for other states
    if (currentTime - modelGroup.userData.lastFlashTime > 500) {
      modelGroup.userData.isTextVisible = !modelGroup.userData.isTextVisible;
      modelGroup.userData.lastFlashTime = currentTime;
      modelGroup.userData.updateScreen(modelGroup.userData.currentMessage);
    }
  };
  
  // Store flash function for use in animation loop
  modelGroup.userData.flashScreen = flashScreen;
  
  // Position the cabinet
  modelGroup.position.set(2.5, 0, -9.5); // Next to cabinet 11
  
  scene.add(modelGroup);
  cabinets.push(modelGroup);
  cabinetBoxes.push(createCabinetBox(modelGroup));
};

// Create the Pong cabinet
createPongCabinet();

// Portal System
let startPortalBox;
let exitPortalBox;
let isRedirecting = false; // Add flag to prevent multiple redirects

// Check if we arrived through a portal
if (new URLSearchParams(window.location.search).get('portal')) {
    // Create start portal next to exit portal
    const startPortalGroup = new THREE.Group();
    startPortalGroup.position.set(4, 1.8, 9.8); // 4 units to the right of exit portal
    startPortalGroup.rotation.x = 0;
    startPortalGroup.rotation.y = Math.PI; // Face south like exit portal

    // Create portal effect
    const startPortalGeometry = new THREE.TorusGeometry(1.5, 0.2, 16, 100);
    const startPortalMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        transparent: true,
        opacity: 0.8
    });
    const startPortal = new THREE.Mesh(startPortalGeometry, startPortalMaterial);
    startPortalGroup.add(startPortal);
                    
    // Create portal inner surface
    const startPortalInnerGeometry = new THREE.CircleGeometry(1.3, 32);
    const startPortalInnerMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const startPortalInner = new THREE.Mesh(startPortalInnerGeometry, startPortalInnerMaterial);
    startPortalGroup.add(startPortalInner);

    // Create particle system for portal effect
    const startPortalParticleCount = 1000;
    const startPortalParticles = new THREE.BufferGeometry();
    const startPortalPositions = new Float32Array(startPortalParticleCount * 3);
    const startPortalColors = new Float32Array(startPortalParticleCount * 3);

    for (let i = 0; i < startPortalParticleCount * 3; i += 3) {
        // Create particles in a ring around the portal
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.5 + (Math.random() - 0.5) * 0.4;
        startPortalPositions[i] = Math.cos(angle) * radius;
        startPortalPositions[i + 1] = Math.sin(angle) * radius;
        startPortalPositions[i + 2] = (Math.random() - 0.5) * 0.4;

        // Red color with slight variation
        startPortalColors[i] = 0.8 + Math.random() * 0.2;
        startPortalColors[i + 1] = 0;
        startPortalColors[i + 2] = 0;
    }

    startPortalParticles.setAttribute('position', new THREE.BufferAttribute(startPortalPositions, 3));
    startPortalParticles.setAttribute('color', new THREE.BufferAttribute(startPortalColors, 3));

    const startPortalParticleMaterial = new THREE.PointsMaterial({
        size: 0.02,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });

    const startPortalParticleSystem = new THREE.Points(startPortalParticles, startPortalParticleMaterial);
    startPortalGroup.add(startPortalParticleSystem);

    // Add portal group to scene
    scene.add(startPortalGroup);

    // Create portal collision box
    startPortalBox = new THREE.Box3().setFromObject(startPortalGroup);

    // Animate particles
    function animateStartPortal() {
        const positions = startPortalParticles.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += 0.005 * Math.sin(Date.now() * 0.001 + i);
        }
        startPortalParticles.attributes.position.needsUpdate = true;
        requestAnimationFrame(animateStartPortal);
    }
    animateStartPortal();
}

// Create exit portal
const exitPortalGroup = new THREE.Group();
// Position the exit portal at the center of the north wall
exitPortalGroup.position.set(0, 1.8, 9.8);
exitPortalGroup.rotation.x = 0;
exitPortalGroup.rotation.y = Math.PI; // Face south (towards the entrance)

// Create portal effect
const exitPortalGeometry = new THREE.TorusGeometry(1.5, 0.2, 16, 100);
const exitPortalMaterial = new THREE.MeshPhongMaterial({
    color: 0x00ff00,
    emissive: 0x00ff00,
    transparent: true,
    opacity: 0.8
});
const exitPortal = new THREE.Mesh(exitPortalGeometry, exitPortalMaterial);
exitPortalGroup.add(exitPortal);

// Create portal inner surface
const exitPortalInnerGeometry = new THREE.CircleGeometry(1.3, 32);
const exitPortalInnerMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
});
const exitPortalInner = new THREE.Mesh(exitPortalInnerGeometry, exitPortalInnerMaterial);
exitPortalGroup.add(exitPortalInner);

// Add portal group to scene
scene.add(exitPortalGroup);

// Create a fixed-size portal collision box
const portalSize = new THREE.Vector3(3, 3, 1); // Width, height, depth
exitPortalBox = new THREE.Box3(
    new THREE.Vector3(
        exitPortalGroup.position.x - portalSize.x/2,
        exitPortalGroup.position.y - portalSize.y/2,
        exitPortalGroup.position.z - portalSize.z/2
    ),
    new THREE.Vector3(
        exitPortalGroup.position.x + portalSize.x/2,
        exitPortalGroup.position.y + portalSize.y/2,
        exitPortalGroup.position.z + portalSize.z/2
    )
);

console.log('Exit portal created at position:', {
    x: exitPortalGroup.position.x,
    y: exitPortalGroup.position.y,
    z: exitPortalGroup.position.z
});

// Add portal label
const portalCanvas = document.createElement('canvas');
const portalContext = portalCanvas.getContext('2d');
portalCanvas.width = 512;
portalCanvas.height = 64;
portalContext.fillStyle = '#00ff00';
portalContext.font = 'bold 32px "Press Start 2P"';
portalContext.textAlign = 'center';
portalContext.fillText('VIBEVERSE PORTAL', portalCanvas.width/2, portalCanvas.height/2);
const portalTexture = new THREE.CanvasTexture(portalCanvas);
const labelGeometry = new THREE.PlaneGeometry(3, 0.5);
const labelMaterial = new THREE.MeshBasicMaterial({
    map: portalTexture,
    transparent: true,
    side: THREE.DoubleSide
});
const portalLabel = new THREE.Mesh(labelGeometry, labelMaterial);
portalLabel.position.y = 2;
exitPortalGroup.add(portalLabel);

// Create particle system for exit portal
const exitPortalParticleCount = 1000;
const exitPortalParticles = new THREE.BufferGeometry();
const exitPortalPositions = new Float32Array(exitPortalParticleCount * 3);
const exitPortalColors = new Float32Array(exitPortalParticleCount * 3);

for (let i = 0; i < exitPortalParticleCount * 3; i += 3) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.5 + (Math.random() - 0.5) * 0.4;
    exitPortalPositions[i] = Math.cos(angle) * radius;
    exitPortalPositions[i + 1] = Math.sin(angle) * radius;
    exitPortalPositions[i + 2] = (Math.random() - 0.5) * 0.4;

    // Green color with slight variation
    exitPortalColors[i] = 0;
    exitPortalColors[i + 1] = 0.8 + Math.random() * 0.2;
    exitPortalColors[i + 2] = 0;
}

exitPortalParticles.setAttribute('position', new THREE.BufferAttribute(exitPortalPositions, 3));
exitPortalParticles.setAttribute('color', new THREE.BufferAttribute(exitPortalColors, 3));

const exitPortalParticleMaterial = new THREE.PointsMaterial({
    size: 0.02,
    vertexColors: true,
    transparent: true,
    opacity: 0.6
});

const exitPortalParticleSystem = new THREE.Points(exitPortalParticles, exitPortalParticleMaterial);
exitPortalGroup.add(exitPortalParticleSystem);

// Animate exit portal particles
function animateExitPortal() {
    const positions = exitPortalParticles.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.005 * Math.sin(Date.now() * 0.001 + i);
    }
    exitPortalParticles.attributes.position.needsUpdate = true;
    requestAnimationFrame(animateExitPortal);
}
animateExitPortal();

// Create a simple 3D test button - AFTER cabinets are loaded
const addTestButton = () => {
  // Create a smaller cube for the button - reduced from 4x4x4 to 1.5x1.5x1.5
  const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xff00ff,
    emissive: 0xff00ff,
    emissiveIntensity: 1.0
  });
  
  const cube = new THREE.Mesh(geometry, material);
  
  // Position far away from spawn area, against a wall
  cube.position.set(0, 0, 0);
  
  // Create a group for the button (important - interaction system expects groups)
  const buttonGroup = new THREE.Group();
  buttonGroup.position.set(-14, 2, -3);
  buttonGroup.add(cube);
  
  // Add user data for interaction - match format of cabinets exactly
  buttonGroup.userData = {
    id: 'test-button-3d',
    name: 'Test Button',
    description: 'Click to test the log functionality',
    interactive: true
  };
  
  // Add to scene
  scene.add(buttonGroup);
  
  // Add to cabinets array so raycasting works with it
  cabinets.push(buttonGroup);
  
  // Add to cabinet boxes for collision
  cabinetBoxes.push(createCabinetBox(buttonGroup));
  
  // Create a single bright light to make it visible without being overwhelming
  const light = new THREE.PointLight(0xff00ff, 2, 8);
  light.position.set(buttonGroup.position.x, buttonGroup.position.y + 2, buttonGroup.position.z);
  scene.add(light);
  
  // Create a text label above the button
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  // Fill with background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, 256, 64);
  
  // Add text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TEST LOG', 128, 32);
  
  // Create texture and material
  const texture = new THREE.CanvasTexture(canvas);
  const textMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  // Create text plane
  const textGeometry = new THREE.PlaneGeometry(2, 0.5);
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.set(0, 2, 0);
  buttonGroup.add(textMesh);
  
  // Add subtle pulsing animation
  gsap.to(cube.scale, {
    x: 1.1,
    y: 1.1,
    z: 1.1,
    duration: 1,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut'
  });
    
  return buttonGroup;
};

// Add the test button
// const testButton = addTestButton();

// Create floating web browser screen
const createWebBrowser = () => {
  // Create container for web content
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.width = '1024px';
  container.style.height = '768px';
  container.style.display = 'none';
  container.style.pointerEvents = 'none'; // Initially disable pointer events
  document.body.appendChild(container);

  // Create iframe for web content
  const iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.tabIndex = '-1'; // Prevent automatic focus
  
  // Use a static HTML instead of loading fly.pieter.com to avoid WebSocket connections
  const staticHTML = `
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background-color: #222;
            color: #fff;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            overflow: hidden;
            text-align: center;
          }
          h1 {
            font-size: 28px;
            color: #ff69b4;
            margin-bottom: 20px;
            text-shadow: 0 0 10px #ff69b4;
          }
          p {
            font-size: 16px;
            margin-bottom: 15px;
            max-width: 80%;
          }
          .airplane {
            font-size: 48px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <h1>FLY PIETER</h1>
        <div class="airplane">✈️</div>
        <p>External website loading disabled to prevent WebSocket errors.</p>
        <p>Click on the cabinet to open the actual game in a new tab.</p>
      </body>
    </html>
  `;
  
  iframe.srcdoc = staticHTML;
  container.appendChild(iframe);

  // Create screen geometry (slightly larger than cabinet screens)
  const screenGeometry = new THREE.PlaneGeometry(2, 1.5);

  // Create screen material using HTML content
  const screenMaterial = new THREE.ShaderMaterial({
    uniforms: {
      // Rename the uniform to avoid conflict with GLSL built-in function
      mainTexture: { value: null }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D mainTexture;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(mainTexture, vUv);
        gl_FragColor = color;
      }
    `,
    side: THREE.DoubleSide
  });

  // Create screen mesh
  const screen = new THREE.Mesh(screenGeometry, screenMaterial);
  
  // Position screen next to cabinets 9-11
  screen.position.set(-12.5, 1.5, -9.5);
  screen.rotation.y = 0;

  // Add screen to scene
  scene.add(screen);

  // Create CSS3D renderer and object
  const htmlRenderer = new CSS3DRenderer();
  htmlRenderer.setSize(1024, 768);
  htmlRenderer.domElement.style.position = 'absolute';
  htmlRenderer.domElement.style.top = '0';
  htmlRenderer.domElement.style.pointerEvents = 'none';
  document.body.appendChild(htmlRenderer.domElement);

  // Create CSS3D object for the container
  const css3dObject = new CSS3DObject(container);
  css3dObject.position.copy(screen.position);
  css3dObject.rotation.copy(screen.rotation);
  css3dObject.scale.multiplyScalar(0.002); // Scale down to match WebGL scene
  
  // Add to scene
  scene.add(css3dObject);

  return {
    screen,
    css3dObject,
    container,
    htmlRenderer,
    active: false,
    toggle() {
      this.active = !this.active;
      container.style.display = this.active ? 'block' : 'none';
      css3dObject.visible = this.active;
      screen.visible = this.active;
    }
  };
};

// Comment out web browser instantiation
// const webBrowser = createWebBrowser();

// Update materials to use MeshStandardMaterial where needed

// Create and add body to scene
const bodyModel = createPlayerModel();
scene.add(bodyModel);
bodyModel.visible = false;
bodyModel.position.copy(camera.position);
bodyModel.position.y = 0; // Ensure body is on ground
bodyModel.rotation.y = camera.rotation.y;

// Third-person camera offset
const thirdPersonOffset = new THREE.Vector3(0, 1.8, 2.5); // Adjusted height for better view
let isThirdPerson = false;
let hasInitialRotationOffset = false; // Track if we've done the initial PI offset

// Mouse movement for third-person camera
let mouseX = 0;
let mouseY = 0;
let targetBodyRotation = -Math.PI/2; // Initialize to match first-person camera rotation
let targetPitch = 0; // Camera pitch angle

// Handle perspective toggle
const togglePerspective = () => {
  isThirdPerson = !isThirdPerson;
  
  if (isThirdPerson) {
    // Store current rotation
    const currentRotation = bodyModel.rotation.y;
    
    // Move camera back and up for third person view
    camera.position.set(
      bodyModel.position.x - Math.sin(currentRotation) * 8, // Increased from 5 to 8
      bodyModel.position.y + 3, // Increased from 2 to 3
      bodyModel.position.z - Math.cos(currentRotation) * 8 // Increased from 5 to 8
    );
    
    // Set camera target to player position
    controls.target.copy(bodyModel.position);
    controls.target.y += 1;
    
    // Make player model visible in third person
    if (bodyModel) {
      bodyModel.visible = true;
    }
  } else {
    // Return to first person view
    camera.position.copy(bodyModel.position);
    camera.position.y += 1.6;
    
    // Set look target in front of player
    controls.target.set(
      bodyModel.position.x + Math.sin(bodyModel.rotation.y),
      bodyModel.position.y + 1.6,
      bodyModel.position.z + Math.cos(bodyModel.rotation.y)
    );
    
    // Hide player model in first person
    if (bodyModel) {
      bodyModel.visible = false;
    }
  }
  
  controls.update();
};

// Add perspective toggle button handler
if (perspectiveToggle) {
  perspectiveToggle.addEventListener('touchend', (event) => {
    event.preventDefault();
    togglePerspective();
  }, { passive: false });
  
  perspectiveToggle.addEventListener('click', (event) => {
    event.preventDefault();
    togglePerspective();
  });
}

// Update the existing keyboard event handler to work with both V key and perspective toggle
window.addEventListener('keydown', (event) => {
  if (event.key === 'v' || event.key === 'V') {
    togglePerspective();
  } else if (event.key === 'Enter') {
    toggleChatInput();
  }
});

document.addEventListener('mousemove', (event) => {
  if (isThirdPerson) {
    // Only change rotation based on mouse movement when in third person
    mouseX = event.movementX;
    mouseY = event.movementY;
   
    // Update target body rotation based on mouse movement
    targetBodyRotation -= mouseX * 0.005;
    
    // Normalize the rotation to be between -PI and PI
    targetBodyRotation = targetBodyRotation % (2 * Math.PI);
    if (targetBodyRotation > Math.PI) {
      targetBodyRotation -= 2 * Math.PI;
    } else if (targetBodyRotation < -Math.PI) {
      targetBodyRotation += 2 * Math.PI;
    }
    
    // Update target pitch based on vertical mouse movement (clamped to prevent over-rotation)
    targetPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 4, targetPitch - mouseY * 0.005));
  }
});

// Initialize multiplayer
const multiplayerManager = new MultiplayerManager(scene);

// Modify the animate function to include multiplayer updates
const animate = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousTime;
  previousTime = elapsedTime;

  // Poll keyboard state to ensure movement flags are up-to-date
  pollKeyboardState();

  // Find the Pong cabinet and update its screen flash animation
  const pongCabinet = cabinets.find(cabinet => cabinet.userData.id === 'pong');
  if (pongCabinet && pongCabinet.userData.flashScreen) {
    pongCabinet.userData.flashScreen();
    // Update paddle position if in game state
    if (pongCabinet.userData.updatePaddle) {
      pongCabinet.userData.updatePaddle();
    }
    // Update ball position if in game state
    if (pongCabinet.userData.updateBall) {
      pongCabinet.userData.updateBall();
    }
  }

  // Always process movement regardless of pointer lock state
  // Update controls and movement
  if (isThirdPerson) {
    // Third person mode movement - always active
    // Use the body's direction for movement instead of camera direction
    const bodyDirection = new THREE.Vector3(0, 0, -1);
    bodyDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyModel.rotation.y);
    bodyDirection.normalize();

    // Calculate the right vector relative to body
    const rightVector = new THREE.Vector3(1, 0, 0);
    rightVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyModel.rotation.y);
    rightVector.normalize();

    // Calculate movement direction based on input
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    // Movement directions relative to body orientation
    if (moveForward) moveDirection.add(bodyDirection);
    if (moveBackward) moveDirection.sub(bodyDirection);
    if (moveLeft) moveDirection.sub(rightVector);
    if (moveRight) moveDirection.add(rightVector);
    
    moveDirection.normalize();

    // Store old position
    const oldPosition = bodyModel.position.clone();

    // Apply movement with appropriate speed
    const movementSpeed = 3.5;
    
    // Store previous position to detect movement
    const previousPosition = bodyModel.position.clone();
    
    if (moveDirection.length() > 0) {
      bodyModel.position.x += moveDirection.x * movementSpeed * deltaTime;
      bodyModel.position.z += moveDirection.z * movementSpeed * deltaTime;
      
      // Set character to moving state based on actual position change
      bodyModel.isMoving = true;
    } else {
      bodyModel.isMoving = false;
    }

    // Check collisions and revert if needed
    if (checkCabinetCollisions()) {
      bodyModel.position.copy(previousPosition);
      bodyModel.isMoving = false;
    }

    // Apply mouse-based rotation to the body
    bodyModel.rotation.y = targetBodyRotation;

    // Apply vertical movement (jumping)
    bodyModel.position.y += window.velocityY * deltaTime;
    
    // Update animation
    if (bodyModel.isMoving) {
      bodyModel.animationTime += deltaTime * 8; // Increase animation speed for more visible movement
      
      // Oscillating animation for legs and arms - increased amplitude
      const legAngle = Math.sin(bodyModel.animationTime) * 0.6; // Increased leg swing
      const armAngle = Math.sin(bodyModel.animationTime) * 0.45; // Increased arm swing
      
      // Apply rotations to limbs - alternating pattern
      bodyModel.leftLegPivot.rotation.x = legAngle;
      bodyModel.rightLegPivot.rotation.x = -legAngle;
      bodyModel.leftArmPivot.rotation.x = -armAngle;
      bodyModel.rightArmPivot.rotation.x = armAngle;
      
      // Add slight body bounce
      const bodyBounce = Math.abs(Math.sin(bodyModel.animationTime * 2)) * 0.04;
      bodyModel.position.y = bodyBounce; // Changed from adding to setting directly
    } else {
      // Reset limbs to normal position when not moving
      bodyModel.leftLegPivot.rotation.x = 0;
      bodyModel.rightLegPivot.rotation.x = 0;
      bodyModel.leftArmPivot.rotation.x = 0;
      bodyModel.rightArmPivot.rotation.x = 0;
      
      // Reset body height when not moving
      bodyModel.position.y = 0;
    }

    // Update camera position relative to body - without smoothing
    const offset = thirdPersonOffset.clone();
    
    // Apply pitch rotation to the offset
    const pitchMatrix = new THREE.Matrix4().makeRotationX(targetPitch);
    offset.applyMatrix4(pitchMatrix);
    
    // Apply yaw rotation
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyModel.rotation.y);
    
    // Set camera position directly without lerping
    camera.position.copy(bodyModel.position).add(offset);
    
    // Make camera look at player's head level
    camera.lookAt(
      bodyModel.position.x,
      bodyModel.position.y + 1.6, // Changed to look at head height
      bodyModel.position.z
    );

    // Check if on the ground - only check when velocity is negative (falling)
    if (window.velocityY <= 0 && bodyModel.position.y <= 0) {
      window.velocityY = 0;
      bodyModel.position.y = 0;
      canJump = true;
    }

    // Send position update to other players
    multiplayerManager.updatePlayerPosition(
      bodyModel.position,
      new THREE.Euler(0, bodyModel.rotation.y, 0)
    );
  } else {
    // First person movement - always active regardless of pointer lock
    velocity.x -= velocity.x * 10.0 * deltaTime;
    velocity.z -= velocity.z * 10.0 * deltaTime;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    // Store old position
    const oldPosition = camera.position.clone();

    // Calculate movement speed
    const movementSpeed = 5.0;

    // Different movement depending on state
    if (isMobileDevice()) {
      // Mobile movement
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

      if (moveForward) camera.position.addScaledVector(forward, movementSpeed * deltaTime);
      if (moveBackward) camera.position.addScaledVector(forward, -movementSpeed * deltaTime);
      if (moveLeft) camera.position.addScaledVector(right, -movementSpeed * deltaTime);
      if (moveRight) camera.position.addScaledVector(right, movementSpeed * deltaTime);
    } else if (!controls.isLocked) {
      // Handle movement before pointer lock using fixed directions
      if (moveForward) camera.position.z -= movementSpeed * deltaTime;
      if (moveBackward) camera.position.z += movementSpeed * deltaTime;
      if (moveLeft) camera.position.x -= movementSpeed * deltaTime;
      if (moveRight) camera.position.x += movementSpeed * deltaTime;
    } else {
      // Normal pointer lock controls
      if (moveForward || moveBackward) velocity.z -= direction.z * 25.0 * deltaTime;
      if (moveLeft || moveRight) velocity.x -= direction.x * 25.0 * deltaTime;

      controls.moveRight(-velocity.x * deltaTime);
      controls.moveForward(-velocity.z * deltaTime);
    }

    // Check collisions and revert if needed
    if (checkCabinetCollisions()) {
      camera.position.copy(oldPosition);
    }

    // Apply gravity
    window.velocityY -= gravity * deltaTime;
    camera.position.y += window.velocityY * deltaTime;

    if (camera.position.y <= 1.6) {
      window.velocityY = 0;
      camera.position.y = 1.6;
      canJump = true;
    }

    // Send position update to other players
    multiplayerManager.updatePlayerPosition(
      camera.position,
      new THREE.Euler(0, camera.rotation.y, 0)
    );
  }

  // Apply gravity to velocity regardless of player mode
  window.velocityY -= gravity * deltaTime;

  // Update interaction (raycasting)
  interaction.update();

  // Animate arcade elements
  pointLights.forEach((light, index) => {
    light.intensity = 2 + Math.sin(elapsedTime * (0.5 + index * 0.2)) * 0.5;
  });

  // Update other players' positions with interpolation
  multiplayerManager.update(deltaTime);

  // Render scene with WebGL renderer
  renderer.render(scene, camera);
  
  // Comment out CSS3D rendering
  // if (webBrowser && webBrowser.active) {
  //   webBrowser.htmlRenderer.render(scene, camera);
  // }

  // Portal interaction checks
  if (new URLSearchParams(window.location.search).get('portal')) {
    // Check if player has entered start portal
    if (startPortalBox) {
      const playerBox = new THREE.Box3().setFromObject(camera);
      const portalDistance = playerBox.getCenter(new THREE.Vector3()).distanceTo(startPortalBox.getCenter(new THREE.Vector3()));
      if (portalDistance < 2) {
        // Get ref from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const refUrl = urlParams.get('ref');
        if (refUrl) {
          // Add https if not present and include query params
          let url = refUrl;
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
          }
          const currentParams = new URLSearchParams(window.location.search);
          const newParams = new URLSearchParams();
          for (const [key, value] of currentParams) {
            if (key !== 'ref') { // Skip ref param since it's in the base URL
              newParams.append(key, value);
            }
          }
          const paramString = newParams.toString();
          window.location.href = url + (paramString ? '?' + paramString : '');
        }
      }
    }
  }

  // Check if player has entered exit portal
  if (exitPortalBox) {
    const playerPos = isThirdPerson ? bodyModel.position : camera.position;
    const playerBox = new THREE.Box3();
    playerBox.setFromCenterAndSize(
        playerPos,
        new THREE.Vector3(1, 3, 1) // Player collision size
    );
    
    // Check if player is within range of the portal
    const portalDistance = playerPos.distanceTo(exitPortalGroup.position);
    
    if (portalDistance < 5) {
        updateLog(`Near portal - distance: ${portalDistance.toFixed(2)} units`);
        console.log('Player position:', {
            x: playerPos.x.toFixed(2),
            y: playerPos.y.toFixed(2),
            z: playerPos.z.toFixed(2)
        });
    }
    
    if (portalDistance < 3) {
        // Check for intersection
        const doesIntersect = playerBox.intersectsBox(exitPortalBox);
        console.log('Checking portal intersection:', doesIntersect);
        
        if (doesIntersect && !isRedirecting) {
            isRedirecting = true; // Set flag to prevent multiple redirects
            
            // Prepare portal URL
            const currentParams = new URLSearchParams(window.location.search);
            const newParams = new URLSearchParams();
            newParams.append('portal', 'true');
            
            // Use a default username if multiplayerManager.getUsername is not available
            const username = (multiplayerManager && typeof multiplayerManager.getUsername === 'function') 
                ? multiplayerManager.getUsername() 
                : 'player' + Math.floor(Math.random() * 1000);
            
            newParams.append('username', username);
            newParams.append('color', 'white');
            newParams.append('speed', '5');
            newParams.append('ref', window.location.href);

            for (const [key, value] of currentParams) {
                if (!['portal', 'username', 'color', 'speed', 'ref'].includes(key)) {
                    newParams.append(key, value);
                }
            }
            
            const paramString = newParams.toString();
            const nextPage = 'https://portal.pieter.com' + (paramString ? '?' + paramString : '');
            
            updateLog('Portal intersection detected! Redirecting...');
            console.log('Redirecting to:', nextPage);
            window.location.href = nextPage;
        }
    }
  }

  // Call animate again on the next frame
  requestAnimationFrame(animate);
};

animate();

// Modify cabinet interaction to include multiplayer
const onCabinetInteraction = (cabinet) => {
  // Notify other players about the interaction
  multiplayerManager.emitArcadeInteraction(cabinet.id, 'interact');
};

// Handle other players' interactions
multiplayerManager.setInteractionCallback((data) => {
  const cabinet = cabinets.find(c => c.id === data.machineId);
  if (cabinet) {
    // Handle the interaction visually for other players
    // This could be showing effects, animations, etc.
    console.log(`Player ${data.id} interacted with cabinet ${data.machineId}`);
  }
});

// Clean up resources on page unload
window.addEventListener('beforeunload', () => {
  multiplayerManager.dispose();
  renderer.dispose();
  scene.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose();
    }
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    }
  });
});

// Mobile touch handling for camera rotation
let touchStartX = 0;
let touchStartY = 0;
let isTouchRotating = false;
let lastTouchX = 0;
let lastTouchY = 0;
let cameraRotation = new THREE.Euler(0, -Math.PI/2, 0, 'YXZ'); // Start with initial camera rotation

// Create quaternions for rotation
const yawQuat = new THREE.Quaternion();
const pitchQuat = new THREE.Quaternion();
const tempQuat = new THREE.Quaternion();

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  // Only handle rotation if touch is in the right half of the screen and not on D-pad
  if (e.touches[0].clientX > window.innerWidth / 2 && !e.target.closest('.d-pad')) {
    isTouchRotating = true;
    
    // Store initial touch position for this gesture
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    
    // Also store as last position for delta calculation
    lastTouchX = touchStartX;
    lastTouchY = touchStartY;
    
    // Store current camera rotation state
    if (!isThirdPerson) {
      cameraRotation.setFromQuaternion(camera.quaternion, 'YXZ');
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!isTouchRotating) return;
  
  // Skip if touch is on D-pad
  if (e.target.closest('.d-pad')) return;

  const touchX = e.touches[0].clientX;
  const touchY = e.touches[0].clientY;
  
  // Calculate movement based on difference from LAST position, not start position
  const movementX = (touchX - lastTouchX) * 0.004; // Increased horizontal sensitivity
  const movementY = (touchY - lastTouchY) * 0.004; // Increased vertical sensitivity
  
  if (isThirdPerson) {
    // Update target body rotation for third person (only yaw)
    targetBodyRotation -= movementX;
    // Clamp pitch between -60 and 45 degrees
    targetPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 4, targetPitch - movementY));
  } else {
    // First person: Use quaternions to prevent roll
    // Handle yaw (left/right rotation)
    yawQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -movementX);
    camera.quaternion.multiply(yawQuat);
    
    // Handle pitch (up/down rotation)
    // Get current pitch from quaternion
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    const currentPitch = euler.x;
    
    // Calculate new pitch with clamping
    const newPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 4, currentPitch - movementY));
    const pitchDelta = newPitch - currentPitch;
    
    // Apply pitch change while maintaining yaw and zero roll
    pitchQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchDelta);
    camera.quaternion.multiply(pitchQuat);
    
    // Ensure we're using YXZ euler order and reset roll to 0
    const finalEuler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    finalEuler.z = 0; // Force roll to zero
    camera.quaternion.setFromEuler(finalEuler);
  }
  
  // Update last touch position for next frame
  lastTouchX = touchX;
  lastTouchY = touchY;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  isTouchRotating = false;
  
  // Store the final camera rotation after the gesture
  if (!isThirdPerson) {
    cameraRotation.setFromQuaternion(camera.quaternion, 'YXZ');
  }
}, { passive: false });

// Add socket listeners for Pong game state changes
multiplayerManager.socket.on('pongGamesState', (games) => {
  // Handle initial state of all Pong games
  games.forEach(([cabinetId, gameState]) => {
    const pongCabinet = cabinets.find(cabinet => cabinet.userData.id === 'pong');
    if (pongCabinet) {
      // Update all game state properties
      Object.assign(pongCabinet.userData, {
        gameState: gameState.state,
        isMultiplayer: gameState.isMultiplayer,
        player1Id: gameState.player1Id,
        player2Id: gameState.player2Id,
        leftScore: gameState.leftScore,
        rightScore: gameState.rightScore,
        leftPaddleY: gameState.leftPaddleY,
        rightPaddleY: gameState.rightPaddleY,
        ballX: gameState.ballX,
        ballY: gameState.ballY,
        ballSpeedX: gameState.ballSpeedX,
        ballSpeedY: gameState.ballSpeedY,
        scoringState: gameState.scoringState
      });
      
      // Update the screen
      pongCabinet.userData.updateScreen('');
    }
  });
});

multiplayerManager.socket.on('pongStateUpdate', (data) => {
  const pongCabinet = cabinets.find(cabinet => cabinet.userData.id === 'pong');
  if (pongCabinet) {
    // Update game state
    pongCabinet.userData.gameState = data.state;
    pongCabinet.userData.currentMessage = '';
    
    // Update all relevant state properties
    if (data.state === 'waiting') {
      pongCabinet.userData.player1Id = data.player1Id;
    } else if (data.state === 'playing') {
      pongCabinet.userData.isMultiplayer = data.isMultiplayer;
      if (data.isMultiplayer) {
        pongCabinet.userData.player1Id = data.player1Id;
        pongCabinet.userData.player2Id = data.player2Id;
      }
      pongCabinet.userData.leftScore = data.leftScore;
      pongCabinet.userData.rightScore = data.rightScore;
      pongCabinet.userData.leftPaddleY = data.leftPaddleY;
      pongCabinet.userData.rightPaddleY = data.rightPaddleY;
      pongCabinet.userData.ballX = data.ballX;
      pongCabinet.userData.ballY = data.ballY;
      pongCabinet.userData.ballSpeedX = data.ballSpeedX;
      pongCabinet.userData.ballSpeedY = data.ballSpeedY;
      pongCabinet.userData.scoringState = data.scoringState;
    } else if (data.state === 'title') {
      // Reset all game state when returning to title
      pongCabinet.userData.isMultiplayer = false;
      pongCabinet.userData.player1Id = null;
      pongCabinet.userData.player2Id = null;
      pongCabinet.userData.leftScore = 0;
      pongCabinet.userData.rightScore = 0;
      pongCabinet.userData.resetBall();
    }
    
    // Update the screen
    pongCabinet.userData.updateScreen('');
  }
});

// Add socket listener for paddle movement
multiplayerManager.socket.on('pongPaddleUpdate', (data) => {
  const pongCabinet = cabinets.find(cabinet => cabinet.userData.id === 'pong');
  if (pongCabinet) {
    if (data.isAI) {
      // In AI mode, update both paddles
      pongCabinet.userData.leftPaddleY = data.leftPaddleY;
      pongCabinet.userData.rightPaddleY = data.rightPaddleY;
    } else {
      // In multiplayer mode, update the appropriate paddle
      if (data.playerId === pongCabinet.userData.player1Id) {
        pongCabinet.userData.leftPaddleY = data.paddleY;
      } else if (data.playerId === pongCabinet.userData.player2Id) {
        pongCabinet.userData.rightPaddleY = data.paddleY;
      }
    }
    pongCabinet.userData.updateScreen('');
  }
});

// Add socket listener for ball updates
multiplayerManager.socket.on('pongBallUpdate', (data) => {
  const pongCabinet = cabinets.find(cabinet => cabinet.userData.id === 'pong');
  if (pongCabinet && multiplayerManager.socket.id !== pongCabinet.userData.player1Id) {
    // Only update ball if we're not the host (player 1)
    pongCabinet.userData.ballX = data.x;
    pongCabinet.userData.ballY = data.y;
    pongCabinet.userData.ballSpeedX = data.speedX;
    pongCabinet.userData.ballSpeedY = data.speedY;
    pongCabinet.userData.updateScreen('');
  }
});

// Add socket listener for score updates
multiplayerManager.socket.on('pongScoreUpdate', (data) => {
  const pongCabinet = cabinets.find(cabinet => cabinet.userData.id === 'pong');
  if (pongCabinet) {
    pongCabinet.userData.leftScore = data.leftScore;
    pongCabinet.userData.rightScore = data.rightScore;
    if (data.scoringState) {
      pongCabinet.userData.scoringState = data.scoringState;
      pongCabinet.userData.scoreFlashTime = Date.now();
      // Create explosion at the ball's current position
      pongCabinet.userData.createExplosion(
        pongCabinet.userData.ballX,
        pongCabinet.userData.ballY
      );
    }
    pongCabinet.userData.updateScreen('');
  }
});

// Add socket listener for game over
multiplayerManager.socket.on('pongGameOver', (data) => {
  const pongCabinet = cabinets.find(cabinet => cabinet.userData.id === 'pong');
  if (pongCabinet) {
    pongCabinet.userData.gameState = 'gameover';
    pongCabinet.userData.gameOverStartTime = Date.now();
    pongCabinet.userData.leftScore = data.leftScore;
    pongCabinet.userData.rightScore = data.rightScore;
    pongCabinet.userData.updateScreen('');
  }
});

// Joystick state
let joystickActive = false;
let joystickStartX = 0;
let joystickStartY = 0;
let joystickCurrentX = 0;
let joystickCurrentY = 0;
const maxJoystickDistance = 50;
const rotationSensitivity = 0.02;
const movementThreshold = 0.4;

// Add tap detection variables
let touchStartTime = 0;
let hasMoved = false;
const TAP_THRESHOLD = 200; // Maximum time in ms for a tap
const MOVE_THRESHOLD = 10; // Minimum distance to consider it a drag rather than tap

// Add these near the top of the file with other state variables
const maxRotationSpeed = 0.1;
const rotationSmoothing = 0.15;
let currentRotationSpeed = 0;

// Handle joystick touch events
const handleJoystickStart = (e) => {
  const touch = e.touches[0];
  const joystickBase = document.querySelector('.joystick-base');
  const rect = joystickBase.getBoundingClientRect();
  
  // Calculate center of joystick base
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  joystickStartX = centerX;
  joystickStartY = centerY;
  joystickCurrentX = touch.clientX;
  joystickCurrentY = touch.clientY;
  joystickActive = true;
  
  // Reset tap detection
  touchStartTime = Date.now();
  hasMoved = false;
  
  updateJoystickPosition(touch.clientX, touch.clientY);
};

const handleJoystickMove = (e) => {
  if (!joystickActive) return;
  
  const touch = e.touches[0];
  
  // Check if the touch has moved enough to be considered a drag
  const deltaX = touch.clientX - joystickCurrentX;
  const deltaY = touch.clientY - joystickCurrentY;
  const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  if (moveDistance > MOVE_THRESHOLD) {
    hasMoved = true;
  }
  
  joystickCurrentX = touch.clientX;
  joystickCurrentY = touch.clientY;
  
  updateJoystickPosition(touch.clientX, touch.clientY);
};

const handleJoystickEnd = (e) => {
  if (!joystickActive) return;
  
  // Check if this was a tap
  const touchDuration = Date.now() - touchStartTime;
  if (touchDuration < TAP_THRESHOLD && !hasMoved) {
    // This was a tap - trigger interaction
    if (interaction && interaction.INTERSECTED) {
      // Use the same click handler as mouse clicks
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      window.dispatchEvent(clickEvent);
    }
  }
  
  joystickActive = false;
  
  // Reset joystick handle position with rubber banding animation
  const handle = document.querySelector('.joystick-handle');
  handle.style.transition = 'transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)';
  handle.style.transform = 'translate(-50%, -50%)';
  
  // Check if Pong is active and reset paddle movement
  const pongCabinet = cabinets.find(cabinet => cabinet.userData.id === 'pong');
  if (pongCabinet && pongCabinet.userData.gameState === 'playing') {
    // Reset arrow key states to stop paddle movement
    if (window.getKey) {
      const keyState = {};
      keyState['ArrowUp'] = false;
      keyState['ArrowDown'] = false;
      window.getKey = (code) => keyState[code] || false;
    }
  }
  
  // Reset movement flags
  moveForward = false;
  moveBackward = false;
  
  // Clear transition after animation completes
  setTimeout(() => {
    handle.style.transition = 'transform 0.1s ease-out';
  }, 150);
};

const updateJoystickPosition = (x, y) => {
  const handle = document.querySelector('.joystick-handle');
  const deltaX = x - joystickStartX;
  const deltaY = y - joystickStartY;
  
  // Calculate distance from center
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  if (distance === 0) return; // Prevent division by zero
  
  // Calculate normalized direction
  let normalizedX = deltaX / distance;
  let normalizedY = deltaY / distance;
  
  // Clamp distance to max
  const clampedDistance = Math.min(distance, maxJoystickDistance);
  
  // Calculate final position
  const finalX = normalizedX * clampedDistance;
  const finalY = normalizedY * clampedDistance;
  
  // Remove transition during active movement for responsive feel
  handle.style.transition = 'none';
  handle.style.transform = `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px))`;
  
  // Find Pong cabinet and check if game is active
  const pongCabinet = cabinets.find(cabinet => cabinet.userData.id === 'pong');
  const isPongActive = pongCabinet && pongCabinet.userData.gameState === 'playing';
  
  if (isPongActive) {
    // Only handle vertical movement for Pong paddle control
    if (normalizedY < -movementThreshold) {
      // Move paddle up
      moveForward = false;
      moveBackward = false;
      if (window.getKey) {
        const keyState = {};
        keyState['ArrowUp'] = true;
        keyState['ArrowDown'] = false;
        const speedMultiplier = Math.min(Math.abs(normalizedY), 1);
        window.getKey = (code) => {
          if (code === 'ArrowUp' || code === 'ArrowDown') {
            return keyState[code] ? speedMultiplier : false;
          }
          return false;
        };
      }
    } else if (normalizedY > movementThreshold) {
      // Move paddle down
      moveForward = false;
      moveBackward = false;
      if (window.getKey) {
        const keyState = {};
        keyState['ArrowUp'] = false;
        keyState['ArrowDown'] = true;
        const speedMultiplier = Math.min(Math.abs(normalizedY), 1);
        window.getKey = (code) => {
          if (code === 'ArrowUp' || code === 'ArrowDown') {
            return keyState[code] ? speedMultiplier : false;
          }
          return false;
        };
      }
    } else {
      // Center position - no movement
      if (window.getKey) {
        const keyState = {};
        keyState['ArrowUp'] = false;
        keyState['ArrowDown'] = false;
        window.getKey = (code) => keyState[code] || false;
      }
    }
    return;
  }
  
  // Normal movement controls when Pong is not active
  if (normalizedY < -movementThreshold) {
    moveForward = true;
    moveBackward = false;
  } else if (normalizedY > movementThreshold) {
    moveForward = false;
    moveBackward = true;
  } else {
    moveForward = false;
    moveBackward = false;
  }
  
  // Handle rotation with proper world Y-axis alignment
  if (Math.abs(normalizedX) > 0.1) {
    const rotationAmount = normalizedX * rotationSensitivity * (clampedDistance / maxJoystickDistance);
    
    if (isThirdPerson) {
      // In third person, directly rotate the body
      targetBodyRotation -= rotationAmount;
    } else {
      // In first person, rotate around world Y-axis while preserving pitch
      const currentRotation = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      
      // Create rotation quaternion around world Y axis
      const rotationQuat = new THREE.Quaternion();
      rotationQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -rotationAmount);
      
      // Apply rotation while preserving pitch
      camera.quaternion.premultiply(rotationQuat);
      
      // Extract current rotation as Euler angles
      const newRotation = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      
      // Preserve the original pitch (x rotation)
      camera.quaternion.setFromEuler(new THREE.Euler(currentRotation.x, newRotation.y, 0, 'YXZ'));
    }
  }
};

// Remove the old click handler and update the event listeners
const joystickBase = document.querySelector('.joystick-base');
joystickBase.addEventListener('touchstart', handleJoystickStart, { passive: false });
joystickBase.addEventListener('touchmove', handleJoystickMove, { passive: false });
joystickBase.addEventListener('touchend', handleJoystickEnd, { passive: false });
joystickBase.addEventListener('touchcancel', handleJoystickEnd, { passive: false });

// Add tap handler for interaction
joystickBase.addEventListener('click', (e) => {
  // Trigger interaction if we have a nearby cabinet
  if (interaction.nearestCabinet) {
    interaction.handleCabinetClick(interaction.nearestCabinet);
  }
});

class PongGame {
  constructor(screenContext, screenTexture, socket) {
    this.screenContext = screenContext;
    this.screenTexture = screenTexture;
    this.socket = socket;
    
    // Game state
    this.gameState = 'title';
    this.isMultiplayer = false;
    this.player1Id = null;
    this.player2Id = null;
    
    // Ball state
    this.ballX = 256;
    this.ballY = 256;
    this.ballSize = 8;
    this.BALL_BASE_SPEED = 4;
    this.ballSpeedX = 0;
    this.ballSpeedY = 0;
    
    // Paddle state
    this.leftPaddleY = 256;
    this.rightPaddleY = 256;
    this.PADDLE_HEIGHT = 80;
    this.PADDLE_WIDTH = 8;
    this.PADDLE_SPEED = 5;
    
    // Scoring state
    this.leftScore = 0;
    this.rightScore = 0;
    this.WINNING_SCORE = 5;
    
    // Screen state
    this.isTextVisible = true;
    this.lastFlashTime = Date.now();
    
    // Initialize screen
    this.updateScreen();
  }

  handleClick() {
    if (this.gameState === 'title') {
      this.gameState = 'waiting';
      this.player1Id = this.socket.id;
      this.updateScreen();
      
      // Emit game state change
      this.socket.emit('pongStateChange', {
        cabinetId: 'pong',
        state: 'waiting',
        player1Id: this.socket.id
      });
    } else if (this.gameState === 'waiting') {
      // Check if this is player 1 clicking again (for AI mode) or a different player (for multiplayer)
      if (this.socket.id === this.player1Id) {
        // Player 1 clicked again - start AI mode
        this.gameState = 'playing';
        this.isMultiplayer = false;
        this.leftScore = 0;
        this.rightScore = 0;
        this.resetBall();
        this.updateScreen();
        
        // Emit game state change for AI mode
        this.socket.emit('pongStateChange', {
          cabinetId: 'pong',
          state: 'playing',
          isMultiplayer: false,
          player1Id: this.socket.id
        });
      } else {
        // Different player clicked - start multiplayer mode
        this.gameState = 'playing';
        this.isMultiplayer = true;
        this.player2Id = this.socket.id;
        this.leftScore = 0;
        this.rightScore = 0;
        this.resetBall();
        this.updateScreen();
        
        // Emit game state change for multiplayer mode
        this.socket.emit('pongStateChange', {
          cabinetId: 'pong',
          state: 'playing',
          isMultiplayer: true,
          player1Id: this.player1Id,
          player2Id: this.socket.id
        });
      }
    }
  }

  updatePaddle() {
    if (this.gameState === 'playing') {
      // Get arrow key states
      const upPressed = window.getKey('ArrowUp');
      const downPressed = window.getKey('ArrowDown');
      
      // Handle paddle movement based on game mode
      if (this.isMultiplayer) {
        // In multiplayer mode, each player controls their own paddle
        if (this.socket.id === this.player2Id) {
          // Player 2 controls right paddle
          if (upPressed) {
            this.rightPaddleY = Math.max(0, this.rightPaddleY - this.PADDLE_SPEED);
          }
          if (downPressed) {
            this.rightPaddleY = Math.min(512 - this.PADDLE_HEIGHT, this.rightPaddleY + this.PADDLE_SPEED);
          }
          
          // Emit paddle position to other player if moved
          if (upPressed || downPressed) {
            this.socket.emit('pongPaddleMove', {
              cabinetId: 'pong',
              paddleY: this.rightPaddleY
            });
          }
        } else {
          // Player 1 controls left paddle
          if (upPressed) {
            this.leftPaddleY = Math.max(0, this.leftPaddleY - this.PADDLE_SPEED);
          }
          if (downPressed) {
            this.leftPaddleY = Math.min(512 - this.PADDLE_HEIGHT, this.leftPaddleY + this.PADDLE_SPEED);
          }
          
          // Emit paddle position to other player if moved
          if (upPressed || downPressed) {
            this.socket.emit('pongPaddleMove', {
              cabinetId: 'pong',
              paddleY: this.leftPaddleY
            });
          }
        }
      } else {
        // Single player mode - player controls left paddle only
        if (upPressed) {
          this.leftPaddleY = Math.max(0, this.leftPaddleY - this.PADDLE_SPEED);
        }
        if (downPressed) {
          this.leftPaddleY = Math.min(512 - this.PADDLE_HEIGHT, this.leftPaddleY + this.PADDLE_SPEED);
        }
        
        // Update AI paddle in single player mode
        this.updateAIPaddle();
        
        // Emit paddle positions in AI mode too
        if (upPressed || downPressed) {
          this.socket.emit('pongPaddleMove', {
            cabinetId: 'pong',
            isAI: true,
            leftPaddleY: this.leftPaddleY,
            rightPaddleY: this.rightPaddleY
          });
        }
      }
      
      // Update the screen after any movement
      this.updateScreen();
    }
  }

  resetBall() {
    this.ballX = 256;
    this.ballY = 256;
    this.ballSpeedX = Math.random() > 0.5 ? this.BALL_BASE_SPEED : -this.BALL_BASE_SPEED;
    this.ballSpeedY = 0;
  }

  updateBall() {
    this.ballX += this.ballSpeedX;
    this.ballY += this.ballSpeedY;
    
    // Wall collisions
    if (this.ballY <= this.ballSize || this.ballY >= 512 - this.ballSize) {
      this.ballSpeedY = -this.ballSpeedY;
    }
  }

  updateScreen() {
    // Clear screen
    this.screenContext.fillStyle = '#000000';
    this.screenContext.fillRect(0, 0, 512, 512);
    
    // Add retro green text with glow effect
    this.screenContext.shadowColor = '#00ff00';
    this.screenContext.shadowBlur = 20;
    this.screenContext.fillStyle = '#00ff00';
    this.screenContext.textAlign = 'center';
    this.screenContext.textBaseline = 'middle';
    
    if (this.gameState === 'title') {
      // Draw main message
      this.screenContext.font = 'bold 28px "Press Start 2P", monospace';
      this.screenContext.fillText('CLICK TO START', 256, 100);
      
      // Draw AI text on two lines
      this.screenContext.font = 'bold 20px "Press Start 2P", monospace';
      if (this.isTextVisible) {
        this.screenContext.fillText('CLICK TO PLAY', 256, 380);
        this.screenContext.fillText('AGAINST AI', 256, 420);
      }
    } else if (this.gameState === 'waiting') {
      // Draw waiting message
      this.screenContext.font = 'bold 28px "Press Start 2P", monospace';
      if (this.isTextVisible) {
        this.screenContext.fillText('WAITING FOR', 256, 80);
        this.screenContext.fillText('PLAYER TWO', 256, 120);
      }
      
      // Draw AI option text
      this.screenContext.font = 'bold 20px "Press Start 2P", monospace';
      this.screenContext.fillText('CLICK TO PLAY', 256, 380);
      this.screenContext.fillText('AGAINST AI', 256, 420);
    } else if (this.gameState === 'playing') {
      // Draw scores
      this.screenContext.font = 'bold 24px "Press Start 2P", monospace';
      this.screenContext.fillText(this.leftScore.toString(), 128, 50);
      this.screenContext.fillText(this.rightScore.toString(), 384, 50);
      
      // Draw paddles
      this.screenContext.fillRect(20, this.leftPaddleY - this.PADDLE_HEIGHT/2, this.PADDLE_WIDTH, this.PADDLE_HEIGHT);
      this.screenContext.fillRect(484, this.rightPaddleY - this.PADDLE_HEIGHT/2, this.PADDLE_WIDTH, this.PADDLE_HEIGHT);
      
      // Draw ball
      this.screenContext.beginPath();
      this.screenContext.arc(this.ballX, this.ballY, this.ballSize, 0, Math.PI * 2);
      this.screenContext.fill();
    }
    
    // Update texture
    this.screenTexture.needsUpdate = true;
  }
}