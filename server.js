import 'dotenv/config'

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import { getDb, createUser, saveGameSession, getHighScores } from './database.js';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Set CORS headers directly
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  createParentPath: true
}));

// Create uploads directory if it doesn't exist
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files in production
app.use(express.static(join(__dirname, 'dist')));
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Game state
let currentGame = {
  userId: null,
  playerName: '',
  profilePicture: '',
  gameDuration: 0,
  score: 0,
  isActive: false
};

// Track connected clients
let connectedClients = 0;
// Track game client connections specifically
let gameClientConnections = 0;

// API Routes
// Upload user profile picture
app.post('/api/upload-profile', async (req, res) => {
  try {
    // Log the request to help debug
    console.log('Upload request received');
    console.log('Files:', req.files ? Object.keys(req.files) : 'No files');
    
    if (!req.files || !req.files.profilePicture) {
      console.log('No profile picture found in request');
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const profilePicture = req.files.profilePicture;
    console.log('File received:', profilePicture.name, profilePicture.size, 'bytes');
    
    const fileName = `${Date.now()}-${profilePicture.name}`;
    const uploadPath = join(uploadsDir, fileName);

    // Move the file to the uploads directory
    try {
      await profilePicture.mv(uploadPath);
      console.log('File moved successfully to:', uploadPath);
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/json');
      return res.json({ 
        success: true, 
        filePath: `/uploads/${fileName}` 
      });
    } catch (moveError) {
      console.error('Error moving file:', moveError);
      return res.status(500).json({ success: false, error: 'Failed to save file' });
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    // Ensure we always return a valid JSON response
    return res.status(500).json({ success: false, error: 'Failed to process upload' });
  }
});

// Pre-flight requests are handled by the middleware above

// Create user and start game
app.post('/api/users', async (req, res) => {
  try {
    const { name, profilePicture, gameDuration } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    // Create user in database
    const userId = await createUser(name, profilePicture);
    
    // Update current game state
    currentGame = {
      userId,
      playerName: name,
      profilePicture: profilePicture || '',
      gameDuration: gameDuration || 15,
      score: 0,
      isActive: true
    };
    
    // Broadcast to all clients
    io.emit('game_start', { 
      playerName: name, 
      profilePicture, 
      gameDuration: gameDuration || 15 
    });
    
    return res.json({ 
      success: true, 
      userId, 
      message: 'Game started successfully' 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get high scores
app.get('/api/high-scores', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const highScores = await getHighScores(limit);
    return res.json(highScores);
  } catch (error) {
    console.error('Error fetching high scores:', error);
    return res.status(500).json({ error: 'Failed to fetch high scores' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Increment connected clients count
  connectedClients++;
  
  // Track if this is a game client
  let isGameClient = false;
  
  // Listen for client type identification
  socket.on('identify_client', (data) => {
    console.log('Client identified:', socket.id, data);
    if (data.type === 'game') {
      isGameClient = true;
      gameClientConnections++;
      console.log('Game client connected. Total game clients:', gameClientConnections);
      // Broadcast updated game client count
      io.emit('game_client_count', { count: gameClientConnections });
    }
  });
  
  socket.on('request_game_client_count', () => {
    console.log('Client requested game client count, sending:', gameClientConnections);
    socket.emit('game_client_count', { count: gameClientConnections });
  });
  
  // Broadcast updated client count
  io.emit('client_count', { count: connectedClients });
  
  // Broadcast current game state if active
  if (currentGame.isActive) {
    socket.emit('game_start', {
      playerName: currentGame.playerName,
      profilePicture: currentGame.profilePicture,
      gameDuration: currentGame.gameDuration
    });
  }
  
  // Handle game start event (legacy support)
  socket.on('start_game', async (data) => {
    console.log('Game started (socket):', data);
    
    try {
      // Create user in database if not already created via API
      if (!currentGame.userId) {
        const userId = await createUser(data.playerName, data.profilePicture || null);
        currentGame.userId = userId;
      }
      
      currentGame = {
        ...currentGame,
        playerName: data.playerName,
        gameDuration: data.gameDuration,
        score: 0,
        isActive: true
      };
      
      // Broadcast to all clients except the sender
      socket.broadcast.emit('game_start', data);
    } catch (error) {
      console.error('Error in start_game socket event:', error);
    }
  });
  
  // Handle game end event
  socket.on('game_end', async (data) => {
    console.log('Game ended:', data);
    currentGame.isActive = false;
    currentGame.score = data.score;
    
    // Broadcast game end to all clients
    io.emit('game_end', { score: data.score });
    
    try {
      // Save game session to database if we have a user ID
      if (currentGame.userId) {
        await saveGameSession(
          currentGame.userId, 
          data.score, 
          currentGame.gameDuration
        );
      }
      
      // Get updated high scores
      const highScores = await getHighScores(10);
      
      // Broadcast game results with high scores
      io.emit('game_results', { 
        ...currentGame,
        highScores 
      });
    } catch (error) {
      console.error('Error saving game session:', error);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Decrement connected clients count
    connectedClients = Math.max(0, connectedClients - 1);
    
    // If this was a game client, decrement that count too
    if (isGameClient) {
      gameClientConnections = Math.max(0, gameClientConnections - 1);
      // Broadcast updated game client count
      io.emit('game_client_count', { count: gameClientConnections });
    }
    
    // Broadcast updated client count
    io.emit('client_count', { count: connectedClients });
  });
});

// Start the server
const PORT = process.env.VITE_SERVER_PORT;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
