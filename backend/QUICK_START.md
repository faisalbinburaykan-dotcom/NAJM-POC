# ⚡ Quick Start - Najm Backend

## 🚀 Get Started in 3 Minutes

### Step 1: Install Dependencies (1 minute)

```bash
cd "/Users/faisalkhaled/Desktop/Najm poc/backend"
npm install
```

**Wait for installation to complete...**

---

### Step 2: Initialize Database (30 seconds)

```bash
npm run init-db
```

**You should see:**
```
🚀 Starting database initialization...
👤 Creating admin user...
✅ Admin user created: admin
📝 Creating sample tickets...
✅ Sample tickets created

✅ Database initialization complete!

📋 Summary:
   - Admin user: admin
   - Admin password: 1234
   - Database: /Users/faisalkhaled/Desktop/Najm poc/backend/database/najm.db
```

---

### Step 3: Start Backend Server (30 seconds)

```bash
npm start
```

**You should see:**
```
🚀 Najm Assistant Backend Server Started

📡 Server running on: http://localhost:8080
🏥 Health check: http://localhost:8080/health
📋 API docs: http://localhost:8080/api
🌐 CORS enabled for: http://localhost:8000

✅ Backend ready! Press Ctrl+C to stop
```

---

### Step 4: Test It! (1 minute)

**Open a new terminal** and test the API:

```bash
# Test health check
curl http://localhost:8080/health

# Test login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"1234"}'
```

**You should get a JWT token!**

---

## ✅ Success!

Your backend is now running on **http://localhost:8080**

---

## 🌐 Run Frontend + Backend Together

### Terminal 1: Frontend
```bash
cd "/Users/faisalkhaled/Desktop/Najm poc"
python3 -m http.server 8000
```

### Terminal 2: Backend
```bash
cd "/Users/faisalkhaled/Desktop/Najm poc/backend"
npm start
```

**Now you have:**
- Frontend: `http://localhost:8000`
- Backend: `http://localhost:8080`

---

## 📡 Test Backend from Frontend

Open browser console (F12) on `http://localhost:8000` and run:

```javascript
// Test login
fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'admin',
        password: '1234'
    })
})
.then(r => r.json())
.then(data => {
    console.log('Login Success!', data);
    localStorage.setItem('backend_token', data.token);
});

// Test get tickets
fetch('http://localhost:8080/api/tickets', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('backend_token')
    }
})
.then(r => r.json())
.then(data => console.log('Tickets:', data));
```

---

## 🎯 Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login and get JWT token |
| `/api/tickets` | GET | Get all tickets |
| `/api/tickets` | POST | Create new ticket |
| `/api/upload/audio` | POST | Upload audio file |
| `/api/upload/transcribe` | POST | Upload & transcribe audio |

---

## 🔑 Default Credentials

**Username:** `admin`
**Password:** `1234`

---

## 🛠️ Common Commands

```bash
npm start          # Start server
npm run dev        # Start with auto-reload (nodemon)
npm run init-db    # Re-initialize database

# Stop server
Ctrl + C
```

---

## 🐛 Troubleshooting

### Error: "npm: command not found"
**Solution:** Install Node.js from https://nodejs.org/

### Error: "EADDRINUSE: address already in use"
**Solution:** Port 8080 is taken. Kill the process:
```bash
lsof -ti:8080 | xargs kill -9
```

### Error: "Cannot find module..."
**Solution:** Run `npm install` again

### CORS Error in Browser
**Solution:** Make sure both frontend (8000) and backend (8080) are running

---

## 📚 Full Documentation

For complete API documentation, see `README.md`

---

## ✅ Verification Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Database initialized (`npm run init-db`)
- [ ] Backend server running (port 8080)
- [ ] Frontend server running (port 8000)
- [ ] Login test successful
- [ ] Tickets API working
- [ ] No CORS errors

---

**You're all set!** 🎉

Backend: `http://localhost:8080`
Frontend: `http://localhost:8000`

**Test the login from your frontend now!** 🚀
