// Najm Assistant Backend Server
// Express + SQLite + CORS
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// CORS Configuration
app.use(cors({
    origin: [
        'http://13.51.235.197',
        'https://13.51.235.197',
        'http://localhost:8000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Najm Assistant Backend is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Routes
const authRoutes = require('./routes/auth');
const ticketsRoutes = require('./routes/tickets');
const uploadRoutes = require('./routes/upload');
const ocrRoutes = require('./routes/ocr');

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', ocrRoutes); // OCR routes: /api/ocr-upload

// API Root
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Najm Assistant API',
        version: '1.0.0',
        endpoints: {
            auth: {
                login: 'POST /api/auth/login',
                verify: 'GET /api/auth/verify',
                logout: 'POST /api/auth/logout'
            },
            tickets: {
                list: 'GET /api/tickets',
                get: 'GET /api/tickets/:ticketId',
                create: 'POST /api/tickets',
                update: 'PUT /api/tickets/:ticketId',
                delete: 'DELETE /api/tickets/:ticketId',
                addConversation: 'POST /api/tickets/:ticketId/conversations',
                addFinding: 'POST /api/tickets/:ticketId/findings'
            },
            upload: {
                audio: 'POST /api/upload/audio',
                transcribe: 'POST /api/upload/transcribe',
                download: 'GET /api/upload/audio/:filename',
                delete: 'DELETE /api/upload/audio/:filename'
            },
            ocr: {
                upload: 'POST /api/ocr-upload',
                batch: 'POST /api/ocr-upload/batch',
                getImage: 'GET /api/ocr-upload/image/:filename',
                deleteImage: 'DELETE /api/ocr-upload/image/:filename'
            }
        }
    });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.path
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Multer errors
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 10MB'
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }

    // Default error
    res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT,"0.0.0.0",() => {
    console.log('\n🚀 Najm Assistant Backend Server Started\n');
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`📋 API docs: http://localhost:${PORT}/api`);
    console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:8000'}`);
    console.log(`📁 Database: ${process.env.DB_PATH || './database/najm.db'}`);
    console.log(`\n✅ Backend ready! Press Ctrl+C to stop\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
