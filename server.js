import 'dotenv/config'

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Serve static files in production
app.use(express.static(join(__dirname, 'dist')));

// Game state
let currentGame = {
  playerName: '',
  gameDuration: 0,
  score: 0,
  isActive: false
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Handle game start event
  socket.on('start_game', (data) => {
    console.log('Game started:', data);
    currentGame = {
      playerName: data.playerName,
      gameDuration: data.gameDuration,
      score: 0,
      isActive: true
    };
    
    // Broadcast to all clients except the sender
    socket.broadcast.emit('game_start', data);
  });
  
  // Handle game end event
  socket.on('game_end', (data) => {
    console.log('Game ended:', data);
    currentGame.isActive = false;
    currentGame.score = data.score;
    
    // You could save high scores here
    
    // Broadcast game results if needed
    // io.emit('game_results', { ...currentGame });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.VITE_SERVER_PORT;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
