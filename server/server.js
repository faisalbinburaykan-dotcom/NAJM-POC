/**
 * Najm AI Assistant - Conversation Server
 * Handles TTS (ElevenLabs), STT (Groq Whisper), and File Uploads
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8000',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create necessary directories
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const DATA_FILE = process.env.DATA_FILE || './tickets.json';

[UPLOAD_DIR,
 path.join(UPLOAD_DIR, 'accident_photos'),
 path.join(UPLOAD_DIR, 'id_cards'),
 path.join(UPLOAD_DIR, 'driving_licenses'),
 path.join(UPLOAD_DIR, 'vehicle_registrations')
].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOAD_DIR));

// Initialize tickets data file
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ tickets: [] }, null, 2));
}

// ============================================
// MULTER CONFIGURATION FOR FILE UPLOADS
// ============================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Determine subfolder based on file type
        const type = req.body.type || 'accident_photos';
        const subfolders = {
            'accident_photos': 'accident_photos',
            'id_card': 'id_cards',
            'id_cards': 'id_cards', // Accept plural form
            'driving_license': 'driving_licenses',
            'driving_licenses': 'driving_licenses', // Accept plural form
            'vehicle_registration': 'vehicle_registrations',
            'vehicle_registrations': 'vehicle_registrations' // Accept plural form
        };

        const subfolder = subfolders[type] || 'accident_photos';
        const uploadPath = path.join(UPLOAD_DIR, subfolder);

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images and PDF files are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Separate multer configuration for audio files (STT)
const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(UPLOAD_DIR, 'temp_audio');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `audio-${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const audioFileFilter = (req, file, cb) => {
    const allowedAudioTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/x-m4a'];

    if (allowedAudioTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid audio file type. Only audio files are allowed.'), false);
    }
};

const audioUpload = multer({
    storage: audioStorage,
    fileFilter: audioFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Read tickets data from JSON file
 */
function readTicketsData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading tickets data:', error);
        return { tickets: [] };
    }
}

/**
 * Write tickets data to JSON file
 */
function writeTicketsData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing tickets data:', error);
        return false;
    }
}

// ============================================
// API ENDPOINTS
// ============================================

/**
 * Health Check
 */
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Najm Conversation Server is running',
        timestamp: new Date().toISOString(),
        services: {
            tts: 'ElevenLabs',
            stt: 'Groq Whisper'
        }
    });
});

/**
 * POST /upload
 * Upload multiple files (accident photos, documents)
 *
 * Body (multipart/form-data):
 * - files: Array of files
 * - type: 'accident_photos' | 'id_card' | 'driving_license' | 'vehicle_registration'
 * - ticket_id: Optional ticket ID
 */
app.post('/upload', upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const type = req.body.type || 'accident_photos';
        const ticketId = req.body.ticket_id;

        console.log(`📤 Uploaded ${req.files.length} files (Type: ${type})`);

        // Process uploaded files
        const typeFolderMap = {
            'accident_photos': 'accident_photos',
            'id_card': 'id_cards',
            'id_cards': 'id_cards',
            'driving_license': 'driving_licenses',
            'driving_licenses': 'driving_licenses',
            'vehicle_registration': 'vehicle_registrations',
            'vehicle_registrations': 'vehicle_registrations'
        };
        const folder = typeFolderMap[type] || 'accident_photos';

        // ✅ FIX: Move files to correct directory if multer saved them to wrong location
        const uploadedFiles = req.files.map(file => {
            const correctPath = path.join(UPLOAD_DIR, folder, file.filename);

            // If file is not in the correct directory, move it
            if (file.path !== correctPath) {
                try {
                    // Ensure target directory exists
                    const targetDir = path.join(UPLOAD_DIR, folder);
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }

                    // Move file to correct location
                    fs.renameSync(file.path, correctPath);
                    console.log(`📦 Moved file from ${file.path} to ${correctPath}`);

                    file.path = correctPath;
                } catch (moveError) {
                    console.error(`❌ Error moving file:`, moveError);
                }
            }

            return {
                filename: file.filename,
                originalName: file.originalname,
                path: correctPath,
                url: `/uploads/${folder}/${file.filename}`,
                type: type,
                size: file.size,
                mimetype: file.mimetype,
                uploadedAt: new Date().toISOString()
            };
        });

        // If ticket_id is provided, save to tickets data
        if (ticketId) {
            const ticketsData = readTicketsData();
            let ticket = ticketsData.tickets.find(t => t.id === ticketId);

            if (!ticket) {
                // Create new ticket
                ticket = {
                    id: ticketId,
                    createdAt: new Date().toISOString(),
                    uploads: []
                };
                ticketsData.tickets.push(ticket);
            }

            // Add uploaded files to ticket
            ticket.uploads = ticket.uploads || [];
            ticket.uploads.push(...uploadedFiles);
            ticket.updatedAt = new Date().toISOString();

            writeTicketsData(ticketsData);
            console.log(`✅ Files saved to ticket: ${ticketId}`);
        }

        res.json({
            success: true,
            message: `${req.files.length} file(s) uploaded successfully`,
            files: uploadedFiles
        });

    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading files',
            error: error.message
        });
    }
});

/**
 * POST /tts
 * Convert text to speech using ElevenLabs
 *
 * Body:
 * - text: Text to convert
 * - language: 'ar' | 'en' (default: 'ar')
 */
app.post('/tts', async (req, res) => {
    try {
        const { text, language = 'ar' } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'Text is required'
            });
        }

        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
        const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

        if (!ELEVENLABS_API_KEY || !VOICE_ID) {
            return res.status(500).json({
                success: false,
                message: 'ElevenLabs credentials not configured'
            });
        }

        console.log(`🔊 TTS Request: "${text.substring(0, 50)}..." (${language})`);

        // Call ElevenLabs API
        const response = await axios({
            method: 'POST',
            url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY
            },
            data: {
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.0,
                    use_speaker_boost: true
                }
            },
            responseType: 'arraybuffer'
        });

        // Convert audio to base64
        const audioBase64 = Buffer.from(response.data).toString('base64');
        const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

        console.log('✅ TTS generated successfully');

        res.json({
            success: true,
            audio: audioDataUrl,
            format: 'audio/mpeg'
        });

    } catch (error) {
        console.error('❌ TTS error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error generating speech',
            error: error.message
        });
    }
});

/**
 * POST /stt
 * Convert speech to text using Groq Whisper
 *
 * Body (multipart/form-data):
 * - audio: Audio file (webm, wav, mp3)
 * - language: 'ar' | 'en' (default: 'ar')
 */
app.post('/stt', audioUpload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Audio file is required'
            });
        }

        const language = req.body.language || 'ar';
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        if (!GROQ_API_KEY) {
            return res.status(500).json({
                success: false,
                message: 'Groq API key not configured'
            });
        }

        console.log(`🎤 STT Request: ${req.file.filename} (${language})`);

        // Prepare form data for Groq API
        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path), {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('language', language);
        formData.append('response_format', 'json');

        // Call Groq Whisper API
        const response = await axios({
            method: 'POST',
            url: 'https://api.groq.com/openai/v1/audio/transcriptions',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                ...formData.getHeaders()
            },
            data: formData
        });

        const transcription = response.data.text;

        console.log(`✅ STT result: "${transcription}"`);

        // Clean up uploaded audio file
        try {
            fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
            console.error('Error deleting temp audio file:', unlinkError);
        }

        res.json({
            success: true,
            transcription: transcription,
            language: language
        });

    } catch (error) {
        console.error('❌ STT error:', error.message);

        // Clean up file on error
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting temp audio file:', unlinkError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Error transcribing audio',
            error: error.message
        });
    }
});

/**
 * POST /tickets
 * Create or update a ticket with conversation data
 *
 * Body:
 * - ticket_id: Ticket ID
 * - transcript: Conversation transcript
 * - extracted_data: OCR/extracted information
 * - description: Accident description
 */
app.post('/tickets', (req, res) => {
    try {
        const { ticket_id, transcript, extracted_data, description } = req.body;

        if (!ticket_id) {
            return res.status(400).json({
                success: false,
                message: 'Ticket ID is required'
            });
        }

        const ticketsData = readTicketsData();
        let ticket = ticketsData.tickets.find(t => t.id === ticket_id);

        if (!ticket) {
            // Create new ticket
            ticket = {
                id: ticket_id,
                createdAt: new Date().toISOString(),
                uploads: []
            };
            ticketsData.tickets.push(ticket);
        }

        // Update ticket data
        if (transcript) ticket.transcript = transcript;
        if (extracted_data) ticket.extracted_data = extracted_data;
        if (description) ticket.description = description;
        ticket.updatedAt = new Date().toISOString();

        writeTicketsData(ticketsData);

        console.log(`✅ Ticket saved: ${ticket_id}`);

        res.json({
            success: true,
            message: 'Ticket saved successfully',
            ticket: ticket
        });

    } catch (error) {
        console.error('❌ Error saving ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving ticket',
            error: error.message
        });
    }
});

/**
 * GET /tickets
 * Get all tickets
 */
app.get('/tickets', (req, res) => {
    try {
        const ticketsData = readTicketsData();
        res.json({
            success: true,
            tickets: ticketsData.tickets
        });
    } catch (error) {
        console.error('❌ Error fetching tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tickets',
            error: error.message
        });
    }
});

/**
 * GET /tickets/:id
 * Get a specific ticket
 */
app.get('/tickets/:id', (req, res) => {
    try {
        const ticketsData = readTicketsData();
        const ticket = ticketsData.tickets.find(t => t.id === req.params.id);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            ticket: ticket
        });
    } catch (error) {
        console.error('❌ Error fetching ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ticket',
            error: error.message
        });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error('Server error:', err);

    if (err instanceof multer.MulterError) {
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

    res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('\n🚀 Najm Conversation Server Started\n');
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:8000'}`);
    console.log(`🔊 TTS: ElevenLabs (Voice: ${process.env.ELEVENLABS_VOICE_ID})`);
    console.log(`🎤 STT: Groq Whisper`);
    console.log(`📁 Uploads: ${UPLOAD_DIR}`);
    console.log(`💾 Data file: ${DATA_FILE}`);
    console.log(`\n✅ Server ready! Press Ctrl+C to stop\n`);
});

process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
