import 'dotenv/config'
import dotenv from 'dotenv';
import path from 'path';
import * as fsPromises from 'fs/promises';
import fs from 'fs';

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fileUpload from 'express-fileupload';
import { getDb, createUser, saveGameSession, getHighScores, getTotalClicks, getTotalGameSessions, getAllGameSessions } from './database.js';
import { execSync, exec } from 'child_process'

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const GPIO_PIN = parseInt(process.env.VITE_GPIO_PIN || '2', 10);

// Initialize GPIO
let gpioInitialized = false;

try {
  const setupCommand = `sudo ${path.resolve(__dirname, 'gpio-handler.sh')} setup ${GPIO_PIN}`;
  execSync(setupCommand);
  
  gpioInitialized = true;
  console.log(`GPIO initialized successfully: Pin ${GPIO_PIN}`);
} catch (error) {
  console.error('Failed to initialize GPIO:', error);
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

// Settings file path
const settingsFilePath = path.join(__dirname, 'settings.json');

// Function to read settings from JSON file
async function readSettings() {
  try {
    const data = await fsPromises.readFile(settingsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading settings file:', error);
    // Return default settings if file doesn't exist or can't be read
    return { gameDuration: +(process.env.VITE_GAME_DURATION || 15) };
  }
}

// Function to write settings to JSON file
async function writeSettings(settings) {
  try {
    await fsPromises.writeFile(settingsFilePath, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing settings file:', error);
    return false;
  }
}

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
    const { name, businessCard, gameDuration } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    // Create user in database
    const userId = await createUser(name, businessCard);
    
    // Get the game duration from settings or use the provided one
    const settings = await readSettings();
    const duration = gameDuration || settings.gameDuration || +(process.env.VITE_GAME_DURATION || 15);
    
    // Update current game state
    currentGame = {
      userId,
      playerName: name,
      businessCard: businessCard || '',
      gameDuration: duration,
      score: 0,
      isActive: true
    };
    
    // Reset game session saved flag for new game
    gameSessionSaved = false;
    
    // Broadcast to all clients
    io.emit('game_start', { 
      playerName: name, 
      businessCard, 
      gameDuration: duration 
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

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await readSettings();
    return res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
app.post('/api/settings', async (req, res) => {
  try {
    const { gameDuration, fakeScore } = req.body;
    
    if (gameDuration === undefined) {
      return res.status(400).json({ error: 'Game duration is required' });
    }
    
    // Read current settings
    const currentSettings = await readSettings();
    
    // Update settings
    const newSettings = { 
      ...currentSettings, 
      gameDuration,
      fakeScore: fakeScore !== undefined ? fakeScore : currentSettings.fakeScore || 0
    };
    
    console.log('Saving settings:', newSettings);
    
    // Save settings
    const success = await writeSettings(newSettings);
    
    if (success) {
      return res.json({ success: true, settings: newSettings });
    } else {
      return res.status(500).json({ error: 'Failed to save settings' });
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get high scores with pagination and filtering
// Export game history as CSV
app.get('/api/export-history', async (req, res) => {
  try {
    const sessions = await getAllGameSessions();
    
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const serverIp = getLocalIpAddress();
    const baseUrl = `${protocol}://${serverIp}`;
    
    // Convert to CSV
    const headers = ['Name', 'Score', 'Duration (seconds)', 'Played At', 'Business Card'];
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const session of sessions) {
      let businessCardCell = '';
      
      if (session.business_card) {
        const businessCardUrl = `${baseUrl}${session.business_card}`;
        businessCardCell = `${businessCardUrl}`;
      }
      
      const row = [
        `"${session.name.replace(/"/g, '""')}"`,
        session.score,
        session.duration,
        `"${session.played_at}"`,
        `"${businessCardCell}"`
      ];
      csvRows.push(row.join(','));
    }
    
    const csv = csvRows.join('\n');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=game_history.csv');
    
    // Send the CSV file
    res.send(csv);
  } catch (error) {
    console.error('Error exporting game history:', error);
    res.status(500).json({ error: 'Failed to export game history' });
  }
});

app.get('/api/high-scores', async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const nameFilter = req.query.name || '';
    const offset = (page - 1) * limit;
    
    const highScores = await getHighScores(limit, offset, nameFilter);
    const totalSessions = await getTotalGameSessions(nameFilter);
    
    return res.json({
      data: highScores,
      pagination: {
        total: totalSessions,
        totalPages: Math.ceil(totalSessions / limit),
        currentPage: page,
        limit,
        nameFilter
      }
    });
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

// Handle GPIO for button press detection using shell script polling
if (gpioInitialized) {
  console.log('Setting up GPIO button polling...');
  
  // Set up polling for the button
  let lastButtonState = 1; // Initial state (1 = not pressed with pull-up)
  let isButtonPressed = false;
  
  // Poll the button state at regular intervals
  const pollInterval = 50; // milliseconds
  
  const buttonPollInterval = setInterval(() => {
    try {
      // Read the current state of the GPIO pin using our shell script
      const readCommand = `${path.resolve(__dirname, 'gpio-handler.sh')} read ${GPIO_PIN}`;
      const buttonState = parseInt(execSync(readCommand).toString().trim(), 10);
      // Button state changed
      if (buttonState !== lastButtonState) {
        // Button pressed (with pull-up resistor, 0 means pressed)
        if (buttonState === 1 && !isButtonPressed) {
          isButtonPressed = true;
          io.emit('button_press');
          console.log('Button press detected');
        } 
        // Button released
        else if (buttonState === 0 && isButtonPressed) {
          isButtonPressed = false;
          console.log('Button released');
        }
        
        // Update last state
        lastButtonState = buttonState;
      }
    } catch (error) {
      console.error('Error reading GPIO:', error);
    }
  }, pollInterval);
  
  console.log('GPIO button polling initialized successfully');
  
  // Set up a clean shutdown handler
  process.on('SIGINT', () => {
    clearInterval(buttonPollInterval);
    console.log('GPIO polling stopped');
    process.exit(0);
  });
} else {
  console.warn('GPIO not initialized, button detection disabled');
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

  // Handle game over event (game ends but stays in-game state)
  socket.on('game_over', async (data) => {
    console.log('Game over (in-game state):', data);
    
    // Keep isActive as true to maintain in-game status
    currentGame.score = data.score;
    
    // Broadcast game over to all clients
    io.emit('game_over', { score: data.score });
    
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
      gameSessionSaved = true;
    } catch (error) {
      console.error('Error saving game session:', error);
    }
  });

  // Handle game complete event (when player taps to continue)
  socket.on('game_complete', () => {
    console.log('Game complete, returning to idle state');
    currentGame.isActive = false;
    // Emit game_end to notify clients to transition to idle
    io.emit('game_end', { score: currentGame.score });
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

function getLocalIpAddress() {
  try {
    const { networkInterfaces } = require('os');
    const interfaces = networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        const { address, family, internal } = iface;
        if (family === 'IPv4' && !internal) {
          return address;
        }
      }
    }
  } catch (error) {
    console.error('Error getting local IP:', error);
  }
  return 'localhost';
}

const PORT = process.env.VITE_SERVER_PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
