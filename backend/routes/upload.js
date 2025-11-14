// Upload Routes - Handle audio file uploads
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

// Ensure upload directory exists
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads/audio');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for audio upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
    },
    fileFilter: (req, file, cb) => {
        // Accept audio files only
        const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only audio files are allowed.'));
        }
    }
});

/**
 * POST /api/upload/audio
 * Upload audio file (user recording or AI response)
 */
router.post('/audio', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No audio file provided'
            });
        }

        const { ticket_id, duration } = req.body;

        // Save audio file info to database
        if (ticket_id) {
            const stmt = db.prepare(`
                INSERT INTO audio_files (ticket_id, file_path, file_type, duration)
                VALUES (?, ?, ?, ?)
            `);

            stmt.run(
                ticket_id,
                req.file.filename,
                req.file.mimetype,
                duration || null
            );
        }

        res.json({
            success: true,
            message: 'Audio uploaded successfully',
            file: {
                filename: req.file.filename,
                path: `/uploads/audio/${req.file.filename}`,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        });
    } catch (error) {
        console.error('Upload error:', error);

        // Delete file if database insert failed
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Error uploading audio'
        });
    }
});

/**
 * POST /api/upload/transcribe
 * Upload audio and transcribe with Groq Whisper
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No audio file provided'
            });
        }

        const { ticket_id, language = 'ar' } = req.body;

        // Read audio file
        const audioBuffer = fs.readFileSync(req.file.path);
        const audioBlob = new Blob([audioBuffer], { type: req.file.mimetype });

        // Call Groq Whisper API
        const FormData = require('form-data');
        const fetch = require('node-fetch');

        const formData = new FormData();
        formData.append('file', audioBuffer, {
            filename: req.file.filename,
            contentType: req.file.mimetype
        });
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('language', language);
        formData.append('response_format', 'json');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Groq API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const transcription = data.text;

        // Save to database if ticket_id provided
        if (ticket_id) {
            // Save audio file
            const audioStmt = db.prepare(`
                INSERT INTO audio_files (ticket_id, file_path, file_type)
                VALUES (?, ?, ?)
            `);
            audioStmt.run(ticket_id, req.file.filename, req.file.mimetype);

            // Save conversation with transcription
            const convStmt = db.prepare(`
                INSERT INTO conversations (ticket_id, role, content, audio_path, transcription)
                VALUES (?, ?, ?, ?, ?)
            `);
            convStmt.run(ticket_id, 'user', transcription, req.file.filename, transcription);
        }

        res.json({
            success: true,
            message: 'Audio transcribed successfully',
            transcription,
            file: {
                filename: req.file.filename,
                path: `/uploads/audio/${req.file.filename}`
            }
        });
    } catch (error) {
        console.error('Transcription error:', error);

        // Delete file on error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Error transcribing audio'
        });
    }
});

/**
 * GET /api/upload/audio/:filename
 * Download/stream audio file
 */
router.get('/audio/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(UPLOAD_DIR, filename);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Audio file not found'
            });
        }

        // Stream file
        res.sendFile(filePath);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            message: 'Error downloading audio'
        });
    }
});

/**
 * DELETE /api/upload/audio/:filename
 * Delete audio file
 */
router.delete('/audio/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(UPLOAD_DIR, filename);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Audio file not found'
            });
        }

        // Delete from database
        db.prepare('DELETE FROM audio_files WHERE file_path = ?').run(filename);

        // Delete file
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: 'Audio file deleted successfully'
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting audio'
        });
    }
});

module.exports = router;
