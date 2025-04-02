const { Server } = require('socket.io');
const express = require('express');
const { createServer: createHttpServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors({
    origin: ["https://vibe.andrewos.com", "http://localhost:5173", "https://www.andrewos.com"],
    methods: ["GET", "POST"]
}));

let server;

// Try to create HTTPS server, fall back to HTTP if certificates not available
try {
    const httpsOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH || './privkey.pem'),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH || './fullchain.pem')
    };
    server = createHttpsServer(httpsOptions, app);
    console.log('Created HTTPS server');
} catch (error) {
    console.log('Failed to create HTTPS server, falling back to HTTP:', error.message);
    server = createHttpServer(app);
}

const io = new Server(server, {
    cors: {
        origin: ["https://vibe.andrewos.com", "http://localhost:5173", "https://www.andrewos.com"],
        methods: ["GET", "POST"]
    }
});

// Store connected players
const players = new Map();
// Store Pong game states with full game data
const pongGames = new Map();

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Initialize player with a default position and empty chat message
    const player = {
        id: socket.id,
        position: { x: -5, y: 1.6, z: -8 },
        rotation: { x: 0, y: 0, z: 0 },
        lastChatMessage: '' // Initialize with empty string instead of undefined
    };
    players.set(socket.id, player);

    // Send current Pong game states to new player
    socket.emit('pongGamesState', Array.from(pongGames.entries()));

    // Handle initial position from client
    socket.on('initialPosition', (position) => {
        const player = players.get(socket.id);
        if (player) {
            // Update position while preserving other properties
            player.position = position;
            
            // Broadcast new player to others with ALL player data
            socket.broadcast.emit('playerJoined', {
                id: socket.id,
                position: player.position,
                rotation: player.rotation,
                lastChatMessage: player.lastChatMessage
            });
            
            // Send existing players to new player with ALL player data
            const existingPlayers = Array.from(players.entries())
                .filter(([id]) => id !== socket.id)
                .map(([_, p]) => ({
                    id: p.id,
                    position: p.position,
                    rotation: p.rotation,
                    lastChatMessage: p.lastChatMessage
                }));
            socket.emit('existingPlayers', existingPlayers);
        }
    });

    // Handle player movement
    socket.on('playerMove', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.position = data.position;
            player.rotation = data.rotation;
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                position: data.position,
                rotation: data.rotation,
                velocityY: data.velocityY
            });
        }
    });

    // Handle arcade interactions
    socket.on('arcadeInteraction', (data) => {
        socket.broadcast.emit('playerInteraction', {
            id: socket.id,
            machineId: data.machineId,
            action: data.action
        });
    });

    // Handle chat messages
    socket.on('chatMessage', (data) => {
        console.log('Chat message received:', {
            fromId: socket.id,
            text: data.text,
            playerExists: players.has(socket.id)
        });

        const player = players.get(socket.id);
        if (player) {
            // Update player's last chat message
            player.lastChatMessage = data.text;
            
            // Broadcast to ALL clients including sender
            io.emit('chatMessage', {
                id: socket.id,
                text: data.text,
                timestamp: Date.now()
            });
            
            console.log('Chat broadcast sent:', {
                playerId: socket.id,
                message: data.text,
                recipientCount: io.engine.clientsCount
            });
        }
    });

    // Handle Pong game events
    socket.on('pongPlayerJoined', (data) => {
        const { playerId, playerNumber, cabinetId } = data;
        
        // Initialize game state if it doesn't exist
        if (!pongGames.has(cabinetId)) {
            pongGames.set(cabinetId, {
                players: new Map(),
                state: 'WAITING_P2'
            });
        }
        
        const game = pongGames.get(cabinetId);
        game.players.set(playerId, {
            number: playerNumber,
            score: 0
        });
        
        // Broadcast to other players
        socket.broadcast.emit('pongPlayerJoined', data);
        
        // If we now have 2 players, start the game
        if (game.players.size === 2) {
            game.state = 'ACTIVE';
            io.emit('pongGameStart', { cabinetId });
        }
    });
    
    socket.on('pongPlayerLeft', (data) => {
        const { cabinetId } = data;
        const game = pongGames.get(cabinetId);
        if (game) {
            game.players.delete(socket.id);
            if (game.players.size === 0) {
                pongGames.delete(cabinetId);
            }
            io.emit('pongPlayerLeft', { playerId: socket.id, cabinetId });
        }
    });

    // Handle Pong state changes
    socket.on('pongStateChange', (data) => {
        const { cabinetId, state, isMultiplayer, player1Id, player2Id } = data;
        
        // Initialize or update game state
        if (!pongGames.has(cabinetId)) {
            pongGames.set(cabinetId, {
                state: state,
                isMultiplayer: isMultiplayer || false,
                player1Id: player1Id,
                player2Id: player2Id,
                leftScore: 0,
                rightScore: 0,
                leftPaddleY: 216,
                rightPaddleY: 216,
                ballX: 256,
                ballY: 256,
                ballSpeedX: 2,
                ballSpeedY: 0,
                scoringState: null
            });
        } else {
            const game = pongGames.get(cabinetId);
            Object.assign(game, {
                state,
                isMultiplayer,
                player1Id,
                player2Id
            });
        }
        
        // Broadcast state change to all clients
        io.emit('pongStateUpdate', {
            cabinetId,
            ...pongGames.get(cabinetId)
        });
    });

    // Handle paddle movement
    socket.on('pongPaddleMove', (data) => {
        const { cabinetId, paddleY, isAI, leftPaddleY, rightPaddleY } = data;
        const game = pongGames.get(cabinetId);
        
        if (game) {
            if (isAI) {
                // In AI mode, update both paddles
                game.leftPaddleY = leftPaddleY;
                game.rightPaddleY = rightPaddleY;
                
                // Broadcast both paddle positions
                socket.broadcast.emit('pongPaddleUpdate', {
                    cabinetId,
                    isAI: true,
                    leftPaddleY,
                    rightPaddleY
                });
            } else {
                // Multiplayer mode - update the appropriate paddle position
                if (socket.id === game.player1Id) {
                    game.leftPaddleY = paddleY;
                } else if (socket.id === game.player2Id) {
                    game.rightPaddleY = paddleY;
                }
                
                // Broadcast paddle update to all clients
                socket.broadcast.emit('pongPaddleUpdate', {
                    cabinetId,
                    playerId: socket.id,
                    paddleY
                });
            }
        }
    });

    // Handle ball updates
    socket.on('pongBallUpdate', (data) => {
        const { cabinetId, x, y, speedX, speedY } = data;
        const game = pongGames.get(cabinetId);
        
        if (game) {
            // Update ball state
            Object.assign(game, {
                ballX: x,
                ballY: y,
                ballSpeedX: speedX,
                ballSpeedY: speedY
            });
            
            // Broadcast ball update to all clients
            io.emit('pongBallUpdate', {
                cabinetId,
                ...data
            });
        }
    });

    // Handle score updates
    socket.on('pongScoreUpdate', (data) => {
        const { cabinetId, leftScore, rightScore, scoringState } = data;
        const game = pongGames.get(cabinetId);
        
        if (game) {
            // Update score state
            Object.assign(game, {
                leftScore,
                rightScore,
                scoringState
            });
            
            // Broadcast score update to all clients
            io.emit('pongScoreUpdate', {
                cabinetId,
                ...data
            });
        }
    });

    // Handle game over
    socket.on('pongGameOver', (data) => {
        const { cabinetId, leftScore, rightScore } = data;
        const game = pongGames.get(cabinetId);
        
        if (game) {
            // Update game state
            game.state = 'gameover';
            game.leftScore = leftScore;
            game.rightScore = rightScore;
            
            // Broadcast game over to all clients
            io.emit('pongGameOver', {
                cabinetId,
                leftScore,
                rightScore
            });
            
            // Reset game state after a delay
            setTimeout(() => {
                if (pongGames.has(cabinetId)) {
                    const game = pongGames.get(cabinetId);
                    game.state = 'title';
                    game.leftScore = 0;
                    game.rightScore = 0;
                    game.player1Id = null;
                    game.player2Id = null;
                    game.isMultiplayer = false;
                    
                    // Broadcast reset state
                    io.emit('pongStateUpdate', {
                        cabinetId,
                        ...game
                    });
                }
            }, 5000); // Match the 5-second game over display time
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        // Clean up any Pong games this player was in
        pongGames.forEach((game, cabinetId) => {
            if (game.player1Id === socket.id || game.player2Id === socket.id) {
                // Reset game state if a player disconnects
                game.state = 'title';
                game.leftScore = 0;
                game.rightScore = 0;
                game.player1Id = null;
                game.player2Id = null;
                game.isMultiplayer = false;
                
                // Broadcast reset state
                io.emit('pongStateUpdate', {
                    cabinetId,
                    ...game
                });
            }
        });
        
        // Existing disconnect logic
        players.delete(socket.id);
        io.emit('playerLeft', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${server instanceof require('https').Server ? 'HTTPS' : 'HTTP'})`);
}); 