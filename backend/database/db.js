// Database Configuration and Connection
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Get database path from environment or use default
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'najm.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new Database(DB_PATH, {
    verbose: console.log // Log SQL queries in development
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
    console.log('📊 Initializing database schema...');

    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    `);

    // Tickets table
    db.exec(`
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT UNIQUE NOT NULL,
            user_id INTEGER,
            plate TEXT,
            vehicles INTEGER DEFAULT 1,
            damage TEXT,
            status TEXT DEFAULT 'open',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    // Conversations table (stores chat messages and voice data)
    db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            audio_path TEXT,
            transcription TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
        )
    `);

    // Findings table (extracted OCR/AI data)
    db.exec(`
        CREATE TABLE IF NOT EXISTS findings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT NOT NULL,
            field_name TEXT NOT NULL,
            field_value TEXT,
            confidence REAL,
            source TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
        )
    `);

    // Audio files table
    db.exec(`
        CREATE TABLE IF NOT EXISTS audio_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT,
            duration REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
        )
    `);

    // Attachments table (for images: accident photos, ID cards, licenses, registrations)
    db.exec(`
        CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT NOT NULL,
            attachment_type TEXT,
            size INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
        )
    `);

    // Create indexes for better performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
        CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at);
        CREATE INDEX IF NOT EXISTS idx_conversations_ticket ON conversations(ticket_id);
        CREATE INDEX IF NOT EXISTS idx_findings_ticket ON findings(ticket_id);
        CREATE INDEX IF NOT EXISTS idx_audio_ticket ON audio_files(ticket_id);
        CREATE INDEX IF NOT EXISTS idx_attachments_ticket ON attachments(ticket_id);
    `);

    console.log('✅ Database schema initialized successfully');
}

// Initialize on require
initializeDatabase();

// Export database instance
module.exports = db;
