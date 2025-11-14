# Najm.ai - AI Accident Assistant Demo

A bilingual (Arabic/English) web application demonstrating how Sarj AI can automate accident reporting for Najm.sa using chat, voice, and OCR within a unified interface.

## Features

### For Users
- **Bilingual Support**: Seamless switching between Arabic and English (RTL/LTR)
- **Unified Chat/Voice Interface**: Type or speak in the same conversation flow
- **Voice Input**: Record voice messages with real-time transcription (Groq Whisper)
- **Voice Output**: Natural AI voice responses (ElevenLabs TTS)
- **Smart File Upload**: Upload accident photos, ID cards, driver licenses, and vehicle registrations
- **LLM-Driven Flow**: AI assistant guides users through the entire accident reporting process
- **Guided Conversation**: Step-by-step assistance with intelligent phase management
- **Ticket Generation**: Automatic creation of incident tickets with unique IDs and full conversation transcripts

### For Administrators
- **Secure Admin Panel**: Password-protected dashboard
- **Ticket Management**: View all submitted tickets with detailed information
- **Conversation Transcripts**: Review full chat history with cleaned, natural language messages
- **File Preview**: View all uploaded documents (accident photos, ID cards, licenses, registrations)
- **Status Tracking**: Monitor ticket status and creation dates

## Tech Stack

### Frontend
- **HTML5/CSS3/JavaScript**: Vanilla implementation with modern ES6+
- **Styling**: Custom CSS with Najm brand guidelines (#33835c green, RTL support)
- **Fonts**: DIN Next LT Arabic, Cairo (Arabic), Inter (English)

### Backend
- **Server**: Node.js + Express (Port 3000)
- **File Upload**: Multer with organized folder structure
- **File Storage**: Static file serving for uploaded documents
- **Data Persistence**: JSON file-based storage (tickets.json)

### AI Services
- **Conversation**: OpenAI GPT-4 with structured JSON state management
- **Text-to-Speech (TTS)**: ElevenLabs API
- **Speech-to-Text (STT)**: Groq Whisper API
- **Vision** (Optional): GPT-4o Vision for OCR capabilities

### Architecture
- **Frontend Server**: Python HTTP server (Port 8000)
- **Backend Server**: Express/Node.js (Port 3000)
- **CORS**: Enabled for cross-origin communication
- **State Management**: LLM-driven conversation flow with phase tracking

## Setup Instructions

### Prerequisites

1. **Node.js**: Version 14+ required for backend server
2. **Python 3**: For frontend static file serving
3. **API Keys**:
   - OpenAI API key (GPT-4 access)
   - ElevenLabs API key (TTS)
   - Groq API key (Whisper STT)

### Installation

1. **Clone/Download the Project**:
   ```bash
   cd "Najm poc"
   ```

2. **Install Backend Dependencies**:
   ```bash
   cd server
   npm install
   cd ..
   ```

3. **Configure Environment Variables**:

   Create `.env` file in the `server/` directory:
   ```env
   PORT=3000
   FRONTEND_URL=http://localhost:8000
   UPLOAD_DIR=./uploads
   DATA_FILE=./tickets.json

   # API Keys
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   GROQ_API_KEY=your_groq_api_key_here
   ```

4. **Configure Frontend API Keys**:

   Open `config.js` and set your OpenAI API key:
   ```javascript
   const CONFIG = {
       OPENAI_API_KEY: 'sk-your-openai-api-key-here',
       // ... other settings
   };
   ```

### Running the Application

You need to run **both** servers:

#### 1. Start Backend Server (Port 3000)
```bash
cd server
npm start
```

Expected output:
```
🚀 Najm Conversation Server Started
📡 Server running on: http://localhost:3000
```

#### 2. Start Frontend Server (Port 8000)
Open a new terminal:
```bash
cd "Najm poc"
python3 -m http.server 8000
```

#### 3. Access Application
Open your browser and navigate to:
```
http://localhost:8000
```

## Project Structure

```
Najm poc/
├── index.html                  # Main application page
├── admin.html                  # Admin panel page
├── login.html                  # Login page
├── styles.css                  # Main application styles
├── admin.css                   # Admin panel styles
├── config.js                   # Frontend configuration & API keys
├── app.js                      # Main application logic (LLM-driven)
├── voice.js                    # Voice recording interface
├── backend-integration.js      # API communication layer
├── auth.js                     # Authentication logic
├── admin.js                    # Admin panel functionality
├── elevenlabs-tts-integration.js  # TTS integration
├── ocr.js                      # OCR utilities (stub)
├── conversation-manager.js     # Legacy conversation manager (deprecated)
├── server/                     # Backend server
│   ├── server.js              # Express server (TTS, STT, uploads)
│   ├── tickets.json           # Ticket database
│   ├── package.json           # Node.js dependencies
│   ├── .env                   # Environment variables
│   └── uploads/               # Uploaded files storage
│       ├── accident_photos/
│       ├── id_cards/
│       ├── driving_licenses/
│       ├── vehicle_registrations/
│       └── temp_audio/
└── README.md                   # This file
```

## API Routes

### Backend Server (Port 3000)

#### Health Check
```
GET /health
Response: { success: true, message: "Server is running" }
```

#### File Upload
```
POST /upload
Content-Type: multipart/form-data

Body:
- files: Array of files
- type: 'accident_photos' | 'id_cards' | 'driving_licenses' | 'vehicle_registrations'

Response: {
  success: true,
  files: [{ filename, url, type, size }]
}
```

#### Create Ticket
```
POST /tickets
Content-Type: application/json

Body: {
  ticket_id: string,
  transcript: array,
  extracted_data: object,
  description: string
}

Response: {
  success: true,
  ticket: { id, createdAt, uploads, transcript, extracted_data }
}
```

#### Get All Tickets
```
GET /tickets
Response: {
  success: true,
  tickets: [{ id, createdAt, ... }]
}
```

#### Text-to-Speech
```
POST /tts
Content-Type: application/json

Body: {
  text: string,
  language: 'ar' | 'en'
}

Response: Audio file (audio/mpeg)
```

#### Speech-to-Text
```
POST /stt
Content-Type: multipart/form-data

Body:
- audio: Audio file

Response: {
  success: true,
  text: string
}
```

#### Static Files
```
GET /uploads/:subfolder/:filename
Example: /uploads/accident_photos/abc123.jpeg
```

## Conversation Flow

The LLM manages the entire conversation with strict phase control:

1. **Greeting**: Welcome message
2. **Description**: Collect accident details (what, where, how, vehicles, injuries)
3. **Accident Photos**: Request 3 accident scene photos
4. **ID Card**: Request national ID photo
5. **Driving License**: Request driver's license photo
6. **Vehicle Registration**: Request vehicle registration (Istimara) photo
7. **Summary**: Present complete information for confirmation
8. **Done**: Create final ticket

### JSON State Management

Every assistant message includes a JSON state block:
```json
{
  "phase": "description | accident_photos | id_card | driving_license | vehicle_registration | summary | done",
  "ticket": {
    "description": "",
    "location": "",
    "number_of_vehicles": null,
    "injuries": null,
    "accident_photos_count": 0,
    "id_card_received": false,
    "driving_license_received": false,
    "vehicle_registration_received": false
  }
}
```

The JSON is automatically stripped from user-visible messages.

## Admin Panel

### Access
Navigate to: `http://localhost:8000` and click "تسجيل الدخول" (Login)

### Login Credentials
- **Username**: `admin`
- **Password**: `1234`

### Features
- View all tickets in a table format
- Click on any ticket to view:
  - Full conversation transcript (with JSON blocks removed)
  - Extracted accident data
  - All uploaded files with preview buttons
  - Ticket metadata (ID, date, status)
- Green chat bubbles for user messages
- Gray chat bubbles for assistant messages

## Usage Guide

### User Flow

1. **Landing Page**:
   - Click "ابدأ تقرير الحادث" (Start Accident Report)
   - Or click "EN" to switch to English

2. **Chat/Voice Interface**:
   - **Type**: Enter messages in the text input
   - **Voice**: Click 🎤 to record (AI will transcribe and respond with voice)
   - **Upload**: Click 📎 to upload files at the appropriate phase

3. **Guided Process**:
   - Answer questions about the accident
   - Upload 3 accident photos when prompted
   - Upload ID card, driver's license, and vehicle registration
   - Review summary and confirm

4. **Completion**:
   - Receive ticket ID (format: `T-timestamp-random`)
   - Ticket saved to backend with full conversation history

## API Usage & Costs

### OpenAI (GPT-4)
- ~$0.03 per 1K input tokens
- ~$0.06 per 1K output tokens
- Used for conversation management

### ElevenLabs (TTS)
- ~$0.30 per 1K characters
- Used for voice responses

### Groq (Whisper STT)
- Free tier available
- Used for voice transcription

**Recommendation**: Monitor API usage in respective dashboards.

## Configuration

### Frontend (config.js)
```javascript
const CONFIG = {
    OPENAI_API_KEY: 'sk-...',
    OPENAI_API_URL: 'https://api.openai.com/v1',
    MODELS: {
        CHAT: 'gpt-4',
        VISION: 'gpt-4o'
    },
    ADMIN: {
        USERNAME: 'admin',
        PASSWORD: '1234'
    }
};
```

### Backend (.env)
```env
PORT=3000
FRONTEND_URL=http://localhost:8000
ELEVENLABS_API_KEY=...
GROQ_API_KEY=...
```

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Required APIs**:
- MediaRecorder API (voice recording)
- Fetch API (HTTP requests)
- ES6+ JavaScript support
- FileReader API (image uploads)

## Security Notes

⚠️ **Important for Production**:

1. **API Key Protection**
   - Never expose API keys in client-side code
   - Move API calls to backend server
   - Use environment variables

2. **Authentication**
   - Current admin auth is demo-only (localStorage-based)
   - Implement JWT or OAuth for production
   - Add session management

3. **File Upload Security**
   - Current implementation allows 10MB max file size
   - Add virus scanning for production
   - Validate file types server-side
   - Implement rate limiting

4. **Data Storage**
   - Current: JSON file (tickets.json)
   - Production: Use PostgreSQL, MongoDB, or similar
   - Implement backups and redundancy

5. **CORS**
   - Current: Allows localhost:8000
   - Production: Configure strict CORS policies
   - Use proper domain whitelisting

6. **HTTPS**
   - Required for microphone access in production
   - Required for secure API communication

## Troubleshooting

### Backend Server Won't Start
- Check if port 3000 is already in use: `lsof -i :3000`
- Verify Node.js is installed: `node --version`
- Check .env file exists in server directory

### Frontend Can't Connect to Backend
- Verify both servers are running
- Check CORS settings in server.js
- Confirm FRONTEND_URL matches in .env

### Voice Not Working
- Check browser permissions for microphone
- Verify Groq API key is valid
- Ensure HTTPS or localhost

### TTS Not Playing
- Verify ElevenLabs API key
- Check browser console for errors
- Ensure audio autoplay is allowed

### Files Not Uploading
- Check upload folder permissions
- Verify file size < 10MB
- Confirm file type is allowed (jpg, png, pdf)

### Admin Panel Empty
- Verify tickets.json exists in server directory
- Check server logs for errors
- Ensure backend server is running

## Limitations

### Current Demo Limitations
- In-memory session storage (lost on page refresh)
- File-based database (not scalable)
- Client-side API keys (security risk)
- No user authentication system
- No real-time updates
- No SMS/Email notifications
- No payment integration
- No GPS location tracking

### Production Requirements
- Backend API server with proper authentication
- Database (PostgreSQL/MongoDB)
- Cloud storage for files (S3/GCS)
- User management system
- Notification service
- Analytics and monitoring
- Load balancing
- CDN for static assets

## Testing

### Quick Test Scenarios

1. **Test Chat Flow**:
   ```bash
   # Start both servers
   # Navigate to http://localhost:8000
   # Click "ابدأ تقرير الحادث"
   # Type: "حصل حادث في الرياض"
   ```

2. **Test Voice**:
   ```bash
   # Click 🎤
   # Say: "There was an accident"
   # Verify transcription appears
   ```

3. **Test File Upload**:
   ```bash
   # Proceed through conversation
   # Click 📎 when prompted
   # Upload accident photo
   # Verify upload success
   ```

4. **Test Admin Panel**:
   ```bash
   # Navigate to http://localhost:8000
   # Click "تسجيل الدخول"
   # Login: admin / 1234
   # Verify tickets appear
   ```

## Known Issues

1. **JSON in Messages**: The frontend automatically strips JSON blocks from assistant messages before display
2. **File Storage**: All document types currently stored in accident_photos folder (fixed in backend, applies to new uploads)
3. **Voice Playback**: First TTS request may be slow due to API cold start

## Support

For issues or questions:
- Check browser console for errors (F12)
- Verify all API keys are correctly set
- Ensure both servers are running
- Check server logs for backend errors

## Credits

- **Developed for**: Najm.sa
- **Powered by**: Sarj AI
- **AI Models**: OpenAI GPT-4, ElevenLabs, Groq Whisper
- **Fonts**: Google Fonts (DIN Next LT Arabic, Cairo, Inter)

---

**Demo Purpose**: This demo showcases how Sarj AI can automate accident reporting for Najm.sa using chat, voice, and document uploads within a unified, bilingual interface.

**Last Updated**: November 2024
