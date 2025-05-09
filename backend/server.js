import 'dotenv/config'
import dotenv from 'dotenv';
import path from 'path';

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import { SerialPort } from 'serialport';
import { getDb, createUser, saveGameSession, getHighScores, getTotalClicks } from './database.js';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize SerialPort
let serialPort;
try {
  serialPort = new SerialPort({
    path: process.env.VITE_SERIAL_PORT,
    baudRate: +process.env.VITE_SERIAL_BAUD_RATE
  });
  
  console.log('SerialPort initialized successfully');
} catch (error) {
  console.error('Failed to initialize SerialPort:', error);
}

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

// Create business cards directory if it doesn't exist
const businessCardsDir = join(__dirname, '../data/uploads/');
if (!fs.existsSync(businessCardsDir)) {
  fs.mkdirSync(businessCardsDir, { recursive: true });
}

// Serve static files in production
app.use(express.static(join(__dirname, 'dist')));
app.use('/uploads', express.static(join(__dirname, '../data/uploads')));

// Game state
let currentGame = {
  userId: null,
  playerName: '',
  businessCard: '',
  gameDuration: 0,
  score: 0,
  isActive: false
};

// Track if game session has been saved to prevent duplicates
let gameSessionSaved = false;

// Track connected clients
let connectedClients = 0;
// Track game client connections specifically
let gameClientConnections = 0;

// API Routes
// Upload user business card
app.post('/api/upload-business-card', async (req, res) => {
  try {
    // Log the request to help debug
    console.log('Upload request received');
    console.log('Files:', req.files ? Object.keys(req.files) : 'No files');
    
    if (!req.files || !req.files.businessCard) {
      console.log('No business card found in request');
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const businessCard = req.files.businessCard;
    console.log('File received:', businessCard.name, businessCard.size, 'bytes');
    
    const fileName = `${Date.now()}-${businessCard.name}`;
    const uploadPath = join(businessCardsDir, fileName);

    // Move the file to the business cards directory
    try {
      await businessCard.mv(uploadPath);
      console.log('File moved successfully to:', uploadPath);
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/json');
      return res.json({ 
        success: true, 
        filePath: `../data/uploads/${fileName}` 
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
    const { name, businessCard, gameDuration } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    // Create user in database
    const userId = await createUser(name, businessCard);
    
    // Update current game state
    currentGame = {
      userId,
      playerName: name,
      businessCard: businessCard || '',
      gameDuration: gameDuration || 15,
      score: 0,
      isActive: true
    };
    
    // Reset game session saved flag for new game
    gameSessionSaved = false;
    
    // Broadcast to all clients
    io.emit('game_start', { 
      playerName: name, 
      businessCard, 
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

// Get total clicks count
app.get('/api/total-clicks', async (req, res) => {
  try {
    const totalClicks = await getTotalClicks();
    return res.json({ totalClicks });
  } catch (error) {
    console.error('Error fetching total clicks:', error);
    return res.status(500).json({ error: 'Failed to fetch total clicks' });
  }
});

// Handle SerialPort data
if (serialPort) {
  let isButtonPressed = false;

  serialPort.on('data', (data) => {
    const value = data.toString().trim();
    
    if (value === '1' && !isButtonPressed) {
      isButtonPressed = true;
      io.emit('button_press');
    } else if (value === '0') {
      isButtonPressed = false;
    }
  });

  serialPort.on('error', (error) => {
    console.error('SerialPort error:', error);
  });
}

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
      businessCard: currentGame.businessCard,
      gameDuration: currentGame.gameDuration
    });
  }
  
  // Handle game start event (legacy support)
  // Handle game tap event
  socket.on('game_tap', (data) => {
    console.log('Game tap received:', data);
    // Broadcast the tap event to all other clients
    socket.broadcast.emit('game_tap_update', data);
  });

  socket.on('start_game', async (data) => {
    console.log('Game started (socket):', data);
    
    try {
      // Create user in database if not already created via API
      if (!currentGame.userId) {
        const userId = await createUser(data.playerName, data.businessCard || null);
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
  
  // Handle timer updates from game screen
  socket.on('game_time_sync', (data) => {
    // Relay timer updates to all clients
    io.emit('game_time_sync', { timeLeft: data.timeLeft });
  });
  
  // Reset game session saved flag when a new game starts
  socket.on('game_start', () => {
    gameSessionSaved = false;
  });

  // Handle game end event
  socket.on('game_end', async (data) => {
    console.log('Game ended:', data);
    
    // Only process if the game is still active to prevent duplicate processing
    if (!currentGame.isActive) {
      console.log('Game already ended, ignoring duplicate game_end event');
      return;
    }
    
    currentGame.isActive = false;
    currentGame.score = data.score;
    
    // Broadcast game end to all clients
    io.emit('game_end', { score: data.score });
    
    try {
      // Save game session to database if we have a user ID and it hasn't been saved yet
      if (currentGame.userId && !gameSessionSaved) {
        await saveGameSession(
          currentGame.userId, 
          data.score, 
          currentGame.gameDuration
        );
        gameSessionSaved = true;
        console.log('Game session saved successfully for user:', currentGame.userId);
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
const PORT = process.env.VITE_SERVER_PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
