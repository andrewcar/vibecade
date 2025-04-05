import * as THREE from 'three';
import { io } from 'socket.io-client';
import { createPlayerModel } from './playerModel.js';

class MultiplayerManager {
    constructor(scene) {
        this.scene = scene;
        // Use secure WebSocket in production, fallback to local in development
        const isProduction = window.location.hostname === 'andrewos.com' || 
                           window.location.hostname === 'www.andrewos.com';
        const serverUrl = isProduction
            ? 'https://vibecade.glitch.me'  // Glitch WebSocket server
            : `https://${window.location.hostname}:3000`;  // Development server
            
        this.socket = io(serverUrl);
        this.players = new Map();
        this.playerMeshes = new Map();
        this.lastUpdateTime = 0;
        this.updateInterval = 500; // Increased from 100ms to 500ms
        this.pendingUpdates = []; // Array to store pending movement updates
        
        this.setupSocketListeners();
        this.setupUpdateBatching();
        console.log(`Multiplayer initialized with socket connection to ${serverUrl}`);
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            const spawnPoint = this.generateRandomSpawnPoint();
            this.socket.emit('initialPosition', spawnPoint);
        });

        this.socket.on('playerJoined', (player) => {
            console.log('Player joined with data:', player);
            if (!player || !player.id) {
                console.error('Invalid player data received:', player);
                return;
            }
            this.addPlayerMesh(player);
        });

        this.socket.on('playerLeft', (playerId) => {
            console.log('Player left:', playerId);
            this.removePlayer(playerId);
        });

        this.socket.on('playerMoved', (data) => {
            const player = this.players.get(data.id);
            if (player) {
                // Create Vector3 and Euler from the received data
                player.targetPosition = new THREE.Vector3(
                    data.position.x,
                    data.position.y,
                    data.position.z
                );
                player.targetRotation = new THREE.Euler(
                    data.rotation.x,
                    data.rotation.y,
                    data.rotation.z
                );
                
                // Store velocityY for jumping animation
                player.velocityY = data.velocityY;
                
                // Ensure current position/rotation exist
                if (!player.currentPosition) {
                    player.currentPosition = player.targetPosition.clone();
                }
                if (!player.currentRotation) {
                    player.currentRotation = player.targetRotation.clone();
                }
            }
        });

        this.socket.on('chatMessage', (data) => {
            console.log('Chat message received:', data);
            
            // Validate message data
            if (!data || !data.id || typeof data.text !== 'string') {
                console.warn('Invalid chat message data received:', data);
                return;
            }

            const playerMesh = this.playerMeshes.get(data.id);
            if (!playerMesh) {
                console.warn('Chat message received for unknown player:', data.id);
                return;
            }

            // Update the player's stored chat message
            const player = this.players.get(data.id);
            if (player) {
                player.lastChatMessage = data.text;
            }

            // Update the chat text display
            console.log('Updating chat text for player:', data.id, 'with message:', data.text);
            playerMesh.updateChatText(data.text);
        });

        this.socket.on('existingPlayers', (players) => {
            console.log('Received existing players:', players);
            players.forEach(player => {
                if (player && player.id) {
                    this.addPlayerMesh(player);
                }
            });
        });

        this.socket.on('requestNewPosition', () => {
            const newPosition = this.generateRandomSpawnPoint();
            this.socket.emit('initialPosition', newPosition);
        });

        this.socket.on('playerInteraction', (data) => {
            if (this.onPlayerInteraction) {
                this.onPlayerInteraction(data);
            }
        });
    }

    setupUpdateBatching() {
        // Send batched updates every 500ms
        setInterval(() => {
            if (this.pendingUpdates.length > 0) {
                const latestUpdate = this.pendingUpdates[this.pendingUpdates.length - 1];
                this.socket.emit('playerMove', latestUpdate);
                this.pendingUpdates = [];
            }
        }, 500);
    }

    generateRandomSpawnPoint() {
        return {
            x: -5,
            y: 0,
            z: -8,
            // Add default rotation to ensure consistent initial orientation
            rotation: { x: 0, y: Math.PI, z: 0 }
        };
    }

    isValidPosition(position) {
        return position && 
               typeof position.x === 'number' && 
               typeof position.y === 'number' && 
               typeof position.z === 'number' &&
               !isNaN(position.x) && 
               !isNaN(position.y) && 
               !isNaN(position.z) &&
               Math.abs(position.x) < 100 && 
               Math.abs(position.y) < 100 && 
               Math.abs(position.z) < 100;
    }

    addPlayerMesh(player) {
        if (!this.playerMeshes.has(player.id) && this.isValidPosition(player.position)) {
            console.log('Adding player mesh with data:', player);
            
            // Create player model with random color
            const playerColor = this.getRandomColor();
            const playerGroup = createPlayerModel(playerColor);
            
            // Set initial position
            playerGroup.position.copy(player.position);
            playerGroup.position.y = 0;
            
            // Set initial rotation - ensure players face the same way initially
            if (player.rotation) {
                playerGroup.rotation.set(
                    player.rotation.x || 0,
                    player.rotation.y || Math.PI,  // Default to facing forward (PI = 180 degrees)
                    player.rotation.z || 0
                );
            } else {
                playerGroup.rotation.set(0, Math.PI, 0);
            }
            
            // Add to scene and store references
            this.scene.add(playerGroup);
            this.playerMeshes.set(player.id, playerGroup);
            
            // Initialize player data with proper position and rotation tracking
            const playerData = {
                ...player,
                currentPosition: playerGroup.position.clone(),
                currentRotation: playerGroup.rotation.clone(),
                targetPosition: playerGroup.position.clone(),
                targetRotation: playerGroup.rotation.clone(),
                isMoving: false,
                animationTime: 0
            };
            this.players.set(player.id, playerData);
            
            // Set initial chat message if one exists
            if (player.lastChatMessage) {
                console.log('Setting initial chat message for player:', player.id, 'message:', player.lastChatMessage);
                requestAnimationFrame(() => {
                    playerGroup.updateChatText(player.lastChatMessage);
                });
            }
        }
    }

    removePlayer(playerId) {
        const playerGroup = this.playerMeshes.get(playerId);
        if (playerGroup) {
            playerGroup.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            this.scene.remove(playerGroup);
            this.playerMeshes.delete(playerId);
            this.players.delete(playerId);
        }
    }

    clearAllPlayers() {
        this.playerMeshes.forEach((mesh, id) => {
            this.removePlayer(id);
        });
        this.players.clear();
        this.playerMeshes.clear();
    }

    updatePlayerPosition(position, rotation) {
        if (!this.socket || !this.isValidPosition(position)) return;

        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateInterval) {
            // If we're still within the update interval, just queue the update
            this.pendingUpdates = [{  // Only keep the latest update
                position,
                rotation: {
                    x: rotation.x || 0,
                    y: rotation.y || 0,
                    z: rotation.z || 0
                },
                velocityY: window.velocityY || 0
            }];
            return;
        }

        // If we've exceeded the interval, send the latest update
        if (this.pendingUpdates.length > 0) {
            const latestUpdate = this.pendingUpdates[this.pendingUpdates.length - 1];
            this.socket.emit('playerMove', latestUpdate);
            this.pendingUpdates = [];
            this.lastUpdateTime = now;
        }
    }

    update(deltaTime) {
        this.players.forEach((player, id) => {
            const playerMesh = this.playerMeshes.get(id);
            
            if (playerMesh && player.currentPosition && player.targetPosition) {
                // Store previous position for movement detection
                const previousPosition = player.currentPosition.clone();
                
                // Enhanced interpolation with smoother lerp factor
                const positionLerpFactor = Math.min(deltaTime * 15, 0.3); // Increased from 10 to 15 for smoother movement
                player.currentPosition.lerp(player.targetPosition, positionLerpFactor);
                
                // Check if player is actually moving by comparing horizontal distance only
                const horizontalDistance = new THREE.Vector2(
                    player.currentPosition.x - previousPosition.x,
                    player.currentPosition.z - previousPosition.z
                ).length();
                
                const isMoving = horizontalDistance > 0.001;
                
                // Update animation state and position
                if (isMoving) {
                    // Only update animation time if actually moving
                    player.animationTime = (player.animationTime || 0) + deltaTime * 8;
                    const bodyBounce = Math.abs(Math.sin(player.animationTime * 2)) * 0.04;
                    // Only apply body bounce if not jumping
                    if (!player.velocityY) {
                        player.currentPosition.y = bodyBounce;
                    }
                } else if (!player.velocityY) {
                    // Keep the model grounded when not moving and not jumping
                    player.currentPosition.y = 0;
                }

                // Handle jumping animation with smoother interpolation
                if (player.velocityY) {
                    // Apply gravity with smoother interpolation
                    player.velocityY = THREE.MathUtils.lerp(player.velocityY, -9.8 * deltaTime, 0.3);
                    // Update Y position
                    player.currentPosition.y += player.velocityY * deltaTime;
                    // Check for ground collision
                    if (player.currentPosition.y <= 0) {
                        player.currentPosition.y = 0;
                        player.velocityY = 0;
                    }
                }
                
                // Update mesh position
                playerMesh.position.copy(player.currentPosition);
                
                // Enhanced rotation interpolation
                const rotationLerpFactor = Math.min(deltaTime * 8, 0.2); // Increased from 5 to 8 for smoother rotation
                const currentQuaternion = new THREE.Quaternion().setFromEuler(player.currentRotation);
                const targetQuaternion = new THREE.Quaternion().setFromEuler(player.targetRotation);
                currentQuaternion.slerp(targetQuaternion, rotationLerpFactor);
                player.currentRotation.setFromQuaternion(currentQuaternion);
                playerMesh.rotation.copy(player.currentRotation);
                
                // Handle animation state changes
                if (isMoving !== player.isMoving) {
                    player.isMoving = isMoving;
                    
                    if (isMoving) {
                        // Reset animation time when starting to move
                        player.animationTime = 0;
                    } else {
                        // Reset all limbs to neutral position when stopping
                        if (playerMesh.leftLegPivot) playerMesh.leftLegPivot.rotation.x = 0;
                        if (playerMesh.rightLegPivot) playerMesh.rightLegPivot.rotation.x = 0;
                        if (playerMesh.leftArmPivot) playerMesh.leftArmPivot.rotation.x = 0;
                        if (playerMesh.rightArmPivot) playerMesh.rightArmPivot.rotation.x = 0;
                    }
                }
                
                // Update limb animations only when moving
                if (player.isMoving) {
                    const legAngle = Math.sin(player.animationTime) * 0.6;
                    const armAngle = Math.sin(player.animationTime) * 0.45;
                    
                    if (playerMesh.leftLegPivot) playerMesh.leftLegPivot.rotation.x = legAngle;
                    if (playerMesh.rightLegPivot) playerMesh.rightLegPivot.rotation.x = -legAngle;
                    if (playerMesh.leftArmPivot) playerMesh.leftArmPivot.rotation.x = -armAngle;
                    if (playerMesh.rightArmPivot) playerMesh.rightArmPivot.rotation.x = armAngle;
                }
            }
        });
    }

    emitArcadeInteraction(machineId, action) {
        if (this.socket) {
            this.socket.emit('arcadeInteraction', { machineId, action });
        }
    }

    getRandomColor() {
        // Generate RGB components (excluding very light colors)
        const r = Math.floor(Math.random() * 200);
        const g = Math.floor(Math.random() * 200);
        const b = Math.floor(Math.random() * 200);
        
        // Convert to hex color
        return (r << 16) | (g << 8) | b;
    }

    setInteractionCallback(callback) {
        this.onPlayerInteraction = callback;
    }

    dispose() {
        this.clearAllPlayers();
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

export { MultiplayerManager }; 