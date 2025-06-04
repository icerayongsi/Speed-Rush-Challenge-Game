import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize the database
async function initializeDatabase() {
  // Ensure the data directory exists
  const dbDir = join(__dirname, 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  const db = await open({
    filename: join(__dirname, 'data/game_data.db'),
    driver: sqlite3.Database
  });
  
  // Create users table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      business_card TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create game_sessions table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
  
  return db;
}

// Get database instance
let dbInstance = null;
export async function getDb() {
  if (!dbInstance) {
    dbInstance = await initializeDatabase();
  }
  return dbInstance;
}

// User operations
export async function createUser(name, businessCard) {
  const db = await getDb();
  const result = await db.run(
    'INSERT INTO users (name, business_card) VALUES (?, ?)',
    [name, businessCard]
  );
  return result.lastID;
}

export async function getUserById(id) {
  const db = await getDb();
  return db.get('SELECT * FROM users WHERE id = ?', [id]);
}

// Game session operations
export async function saveGameSession(userId, score, duration) {
  const db = await getDb();
  const result = await db.run(
    'INSERT INTO game_sessions (user_id, score, duration) VALUES (?, ?, ?)',
    [userId, score, duration]
  );
  return result.lastID;
}

export async function getAllGameSessions() {
  const db = await getDb();
  return db.all(`
    SELECT u.name, u.business_card, g.score, g.duration, g.played_at
    FROM game_sessions g
    JOIN users u ON g.user_id = u.id
    ORDER BY g.played_at DESC
  `);
}

export async function getHighScores(limit = 10, offset = 0, nameFilter = '') {
  const db = await getDb();
  
  if (nameFilter && nameFilter.trim() !== '') {
    return db.all(`
      SELECT u.name, u.business_card, g.score, g.duration, g.played_at
      FROM game_sessions g
      JOIN users u ON g.user_id = u.id
      WHERE u.name LIKE ?
      ORDER BY g.score DESC
      LIMIT ? OFFSET ?
    `, [`%${nameFilter}%`, limit, offset]);
  } else {
    return db.all(`
      SELECT u.name, u.business_card, g.score, g.duration, g.played_at
      FROM game_sessions g
      JOIN users u ON g.user_id = u.id
      ORDER BY g.score DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
  }
}

export async function getTotalGameSessions(nameFilter = '') {
  const db = await getDb();
  
  if (nameFilter && nameFilter.trim() !== '') {
    const result = await db.get(`
      SELECT COUNT(*) as total
      FROM game_sessions g
      JOIN users u ON g.user_id = u.id
      WHERE u.name LIKE ?
    `, [`%${nameFilter}%`]);
    return result.total || 0;
  } else {
    const result = await db.get(`
      SELECT COUNT(*) as total
      FROM game_sessions
    `);
    return result.total || 0;
  }
}

export async function getTotalClicks() {
  const db = await getDb();
  const result = await db.get(`
    SELECT SUM(score) as totalClicks
    FROM game_sessions
  `);
  return result.totalClicks || 0;
}
