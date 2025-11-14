# 🚀 Najm Assistant Backend

Complete Node.js backend for Najm AI Assistant accident reporting system.

## 📋 Features

- ✅ **Authentication**: JWT-based login system
- ✅ **Tickets Management**: Create, read, update, delete tickets
- ✅ **Voice Storage**: Upload and store audio recordings
- ✅ **Transcription**: Groq Whisper integration
- ✅ **Conversations**: Store chat history with audio
- ✅ **Findings**: Store OCR/AI extracted data
- ✅ **CORS Enabled**: Works with frontend on different port
- ✅ **SQLite Database**: Lightweight, file-based storage

---

## 🗂️ Project Structure

```
backend/
├── routes/
│   ├── auth.js          # Authentication endpoints
│   ├── tickets.js       # Ticket management endpoints
│   └── upload.js        # Audio upload & transcription
├── database/
│   ├── db.js            # Database connection & schema
│   ├── init-db.js       # Initialize database & admin user
│   └── najm.db          # SQLite database file (created automatically)
├── uploads/
│   └── audio/           # Audio files storage
├── server.js            # Main Express server
├── package.json         # Dependencies
├── .env                 # Environment configuration
└── README.md            # This file
```

---

## 📊 Database Schema

### Tables

#### 1. **users**
```sql
id              INTEGER PRIMARY KEY AUTOINCREMENT
username        TEXT UNIQUE NOT NULL
password_hash   TEXT NOT NULL
role            TEXT DEFAULT 'user'
created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
last_login      DATETIME
```

#### 2. **tickets**
```sql
id              INTEGER PRIMARY KEY AUTOINCREMENT
ticket_id       TEXT UNIQUE NOT NULL
user_id         INTEGER (FK → users.id)
plate           TEXT
vehicles        INTEGER DEFAULT 1
damage          TEXT
status          TEXT DEFAULT 'open'
created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
```

#### 3. **conversations**
```sql
id              INTEGER PRIMARY KEY AUTOINCREMENT
ticket_id       TEXT NOT NULL (FK → tickets.ticket_id)
role            TEXT NOT NULL ('user' | 'assistant' | 'system')
content         TEXT NOT NULL
audio_path      TEXT
transcription   TEXT
created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
```

#### 4. **findings**
```sql
id              INTEGER PRIMARY KEY AUTOINCREMENT
ticket_id       TEXT NOT NULL (FK → tickets.ticket_id)
field_name      TEXT NOT NULL
field_value     TEXT
confidence      REAL
source          TEXT
created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
```

#### 5. **audio_files**
```sql
id              INTEGER PRIMARY KEY AUTOINCREMENT
ticket_id       TEXT NOT NULL (FK → tickets.ticket_id)
file_path       TEXT NOT NULL
file_type       TEXT
duration        REAL
created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

The `.env` file is already created with default values. **Update if needed:**

```env
PORT=8080
JWT_SECRET=supersecret_najm_assistant_2024_change_in_production
ADMIN_USER=admin
ADMIN_PASS=1234
GROQ_API_KEY=your_groq_key_here
OPENAI_API_KEY=your_openai_key_here
```

### 3. Initialize Database

```bash
npm run init-db
```

**Output:**
```
👤 Creating admin user...
✅ Admin user created: admin
📝 Creating sample tickets...
✅ Sample tickets created

✅ Database initialization complete!
```

### 4. Start Server

```bash
npm start
```

**For development with auto-reload:**
```bash
npm run dev
```

**Output:**
```
🚀 Najm Assistant Backend Server Started

📡 Server running on: http://localhost:8080
🏥 Health check: http://localhost:8080/health
📋 API docs: http://localhost:8080/api
🌐 CORS enabled for: http://localhost:8000
📁 Database: ./database/najm.db

✅ Backend ready! Press Ctrl+C to stop
```

---

## 📡 API Endpoints

### Base URL
```
http://localhost:8080/api
```

---

### 🔐 Authentication

#### 1. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "loginTime": "2024-11-12T12:00:00.000Z"
  }
}
```

#### 2. Verify Token
```http
GET /api/auth/verify
Authorization: Bearer YOUR_JWT_TOKEN
```

#### 3. Logout
```http
POST /api/auth/logout
```

---

### 🎫 Tickets

#### 1. Get All Tickets
```http
GET /api/tickets
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "tickets": [
    {
      "id": 1,
      "ticket_id": "A-1001",
      "plate": "ABC1234",
      "vehicles": 2,
      "damage": "Front bumper damage",
      "status": "open",
      "created_at": "2024-11-12T10:30:00.000Z"
    }
  ]
}
```

#### 2. Get Single Ticket
```http
GET /api/tickets/A-1001
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "ticket": { /* ticket data */ },
  "conversations": [ /* chat history */ ],
  "findings": [ /* extracted data */ ],
  "audioFiles": [ /* audio recordings */ ]
}
```

#### 3. Create Ticket
```http
POST /api/tickets
Content-Type: application/json

{
  "ticket_id": "A-2001",
  "plate": "XYZ5678",
  "vehicles": 2,
  "damage": "Side collision"
}
```

#### 4. Update Ticket
```http
PUT /api/tickets/A-1001
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "status": "closed",
  "damage": "Front bumper completely damaged"
}
```

#### 5. Delete Ticket
```http
DELETE /api/tickets/A-1001
Authorization: Bearer YOUR_JWT_TOKEN
```

#### 6. Add Conversation
```http
POST /api/tickets/A-1001/conversations
Content-Type: application/json

{
  "role": "user",
  "content": "I need help filing a report",
  "audio_path": "audio-file.webm",
  "transcription": "I need help filing a report"
}
```

#### 7. Add Finding
```http
POST /api/tickets/A-1001/findings
Content-Type: application/json

{
  "field_name": "plate",
  "field_value": "ABC1234",
  "confidence": 0.95,
  "source": "OCR"
}
```

---

### 📤 Upload & Transcription

#### 1. Upload Audio
```http
POST /api/upload/audio
Content-Type: multipart/form-data

audio: [audio file]
ticket_id: A-1001
duration: 5.2
```

**Response:**
```json
{
  "success": true,
  "message": "Audio uploaded successfully",
  "file": {
    "filename": "uuid-timestamp.webm",
    "path": "/uploads/audio/uuid-timestamp.webm",
    "size": 102400,
    "mimetype": "audio/webm"
  }
}
```

#### 2. Upload & Transcribe
```http
POST /api/upload/transcribe
Content-Type: multipart/form-data

audio: [audio file]
ticket_id: A-1001
language: ar
```

**Response:**
```json
{
  "success": true,
  "message": "Audio transcribed successfully",
  "transcription": "مرحبا، أحتاج للمساعدة في تقديم بلاغ",
  "file": {
    "filename": "uuid-timestamp.webm",
    "path": "/uploads/audio/uuid-timestamp.webm"
  }
}
```

#### 3. Download Audio
```http
GET /api/upload/audio/uuid-timestamp.webm
```

#### 4. Delete Audio
```http
DELETE /api/upload/audio/uuid-timestamp.webm
```

---

## 💻 Frontend Integration Examples

### JavaScript Fetch Examples

#### 1. Login
```javascript
async function login(username, password) {
    const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
        // Store token
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('Logged in:', data.user);
    }

    return data;
}
```

#### 2. Get Tickets
```javascript
async function getTickets() {
    const token = localStorage.getItem('token');

    const response = await fetch('http://localhost:8080/api/tickets', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();
    return data.tickets;
}
```

#### 3. Create Ticket
```javascript
async function createTicket(ticketData) {
    const response = await fetch('http://localhost:8080/api/tickets', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketData)
    });

    return await response.json();
}
```

#### 4. Upload Audio
```javascript
async function uploadAudio(audioBlob, ticketId) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('ticket_id', ticketId);

    const response = await fetch('http://localhost:8080/api/upload/audio', {
        method: 'POST',
        body: formData
    });

    return await response.json();
}
```

#### 5. Transcribe Audio
```javascript
async function transcribeAudio(audioBlob, ticketId, language = 'ar') {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('ticket_id', ticketId);
    formData.append('language', language);

    const response = await fetch('http://localhost:8080/api/upload/transcribe', {
        method: 'POST',
        body: formData
    });

    return await response.json();
}
```

---

## 🧪 Testing the API

### Using cURL

#### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"1234"}'
```

#### Get Tickets
```bash
curl -X GET http://localhost:8080/api/tickets \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Create Ticket
```bash
curl -X POST http://localhost:8080/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "A-3001",
    "plate": "ABC1234",
    "vehicles": 2,
    "damage": "Rear damage"
  }'
```

### Using Postman

1. Import the API endpoints
2. Set base URL: `http://localhost:8080/api`
3. For authenticated endpoints, add header:
   - Key: `Authorization`
   - Value: `Bearer YOUR_TOKEN_HERE`

---

## 🔒 Security Notes

### Current Implementation (Development)
- ✅ JWT authentication
- ✅ Password hashing (bcryptjs)
- ✅ CORS enabled
- ✅ File type validation
- ✅ File size limits

### Production Requirements
1. **Use HTTPS** - Never use HTTP in production
2. **Strong JWT Secret** - Change `JWT_SECRET` in `.env`
3. **Rate Limiting** - Add rate limiting middleware
4. **Input Validation** - Add comprehensive validation (use `express-validator`)
5. **Helmet.js** - Add security headers
6. **Database Backups** - Regular backups of SQLite file
7. **Environment Variables** - Use proper secret management
8. **API Keys** - Store API keys securely (not in code)

---

## 🛠️ Development

### Available Scripts

```bash
npm start          # Start server
npm run dev        # Start with nodemon (auto-reload)
npm run init-db    # Initialize database
```

### Add More Dependencies

```bash
npm install express-validator    # Input validation
npm install helmet               # Security headers
npm install express-rate-limit   # Rate limiting
npm install morgan               # HTTP request logger
```

---

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `JWT_SECRET` | JWT signing secret | Required |
| `ADMIN_USER` | Admin username | `admin` |
| `ADMIN_PASS` | Admin password | `1234` |
| `GROQ_API_KEY` | Groq API key for Whisper | Required |
| `OPENAI_API_KEY` | OpenAI API key | Optional |
| `DB_PATH` | SQLite database path | `./database/najm.db` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `10485760` (10MB) |
| `UPLOAD_DIR` | Upload directory | `./uploads/audio` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:8000` |

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'better-sqlite3'"
**Solution:** Run `npm install`

### Issue: "EADDRINUSE: address already in use"
**Solution:** Port 8080 is taken. Change `PORT` in `.env` or kill the process:
```bash
lsof -ti:8080 | xargs kill -9
```

### Issue: "Database locked"
**Solution:** Close any other connections to the database or restart the server.

### Issue: "CORS error in frontend"
**Solution:** Check `FRONTEND_URL` in `.env` matches your frontend URL.

### Issue: "Invalid token"
**Solution:** Token expired or invalid. Login again to get a new token.

---

## ✅ Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Change `ADMIN_PASS` to a strong password
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Add input validation
- [ ] Set up database backups
- [ ] Configure logging (Winston/Morgan)
- [ ] Add health monitoring
- [ ] Set `NODE_ENV=production`
- [ ] Use process manager (PM2)
- [ ] Configure firewall rules
- [ ] Set up API key rotation
- [ ] Add error tracking (Sentry)
- [ ] Configure CORS for production domain

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [JWT Introduction](https://jwt.io/introduction)
- [Multer Documentation](https://github.com/expressjs/multer)

---

## 🎉 You're Ready!

Your backend is now running and ready to serve the Najm Assistant frontend!

**Test it:** Open `http://localhost:8080/api` in your browser to see the API documentation.

---

**Happy Coding!** 🚀
