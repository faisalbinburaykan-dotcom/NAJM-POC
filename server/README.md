# 🎙️ Najm Conversation Server

Node.js server handling TTS (ElevenLabs), STT (Groq Whisper), and file uploads.

## Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start
```

Server runs on **http://localhost:3000**

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/upload` | POST | Upload files (accident photos, documents) |
| `/tts` | POST | Text-to-speech (ElevenLabs) |
| `/stt` | POST | Speech-to-text (Groq Whisper) |
| `/tickets` | POST | Save/update ticket |
| `/tickets` | GET | Get all tickets |
| `/tickets/:id` | GET | Get specific ticket |

## Environment Variables

Required in `.env`:

```env
ELEVENLABS_API_KEY=<your-key>
ELEVENLABS_VOICE_ID=<voice-id>
GROQ_API_KEY=<your-key>
FRONTEND_URL=http://localhost:8000
PORT=3000
```

## File Storage

Uploaded files are stored in:

```
uploads/
├── accident_photos/
├── id_cards/
├── driving_licenses/
└── vehicle_registrations/
```

## Data Storage

Conversation data is stored in `tickets.json`:

```json
{
  "tickets": [
    {
      "id": "A-1234",
      "createdAt": "...",
      "uploads": [...],
      "transcript": "...",
      "extracted_data": {...}
    }
  ]
}
```

## Testing

```bash
# Health check
curl http://localhost:3000/health

# TTS test
curl -X POST http://localhost:3000/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"مرحبا","language":"ar"}'

# Upload test
curl -X POST http://localhost:3000/upload \
  -F "files=@image.jpg" \
  -F "type=accident_photos"
```

## Dependencies

- `express` - Web server
- `cors` - CORS support
- `multer` - File uploads
- `axios` - HTTP client
- `dotenv` - Environment variables
- `uuid` - Unique IDs
- `form-data` - Form data handling

---

For complete documentation, see: `../CONVERSATION_SYSTEM_SETUP.md`
