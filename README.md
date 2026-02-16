# Turathya

A full-stack auction platform with real-time bidding, user management, and internationalization support.

## ✨ Features

### Frontend
- 🌐 Bilingual support (English/Arabic) with RTL
- 📱 Responsive design
- 🎨 Modern UI with dark mode support
- 🔐 User authentication
- 📊 Admin dashboard
- 💬 Real-time bidding updates
- ⭐ Watchlist functionality
- 🖼️ Media galleries for lots

### Backend
- 🚀 Node.js + Express + TypeScript
- 🔐 JWT authentication with bcrypt
- 🗄️ PostgreSQL database
- ⚡ Socket.IO for real-time features
- 👥 User approval workflow
- 🛡️ Role-based access control
- 📝 Input validation
- 🌐 CORS enabled

## 🏗️ Tech Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- i18n for internationalization
- Socket.IO client

### Backend
- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Socket.IO
- JWT (jsonwebtoken)
- bcrypt
- express-validator

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.7 or higher) - For frontend dev server
- **Database** (choose one):
  - **Render PostgreSQL** - [Free tier](https://render.com) ⭐ Recommended
  - **Supabase** - [Free tier](https://supabase.com)
  - **Local PostgreSQL** - [Download](https://www.postgresql.org/download/)

## 🚀 Quick Start

### Option 1: Automated Setup (Windows)

```powershell
# Run the startup script
.\start.ps1
```

This will:
1. Check dependencies
2. Start backend server (port 3000)
3. Start frontend server (port 8000)
4. Open browser to http://localhost:8000

### Option 2: Manual Setup

#### 1. Install Backend Dependencies

```powershell
cd zauction-backend
npm install
```

#### 2. Set Up Database

**Option A: Local PostgreSQL**

1. Install PostgreSQL
2. Create database:
   ```sql
   CREATE DATABASE zauction_db;
   ```
3. Run schema:
   ```powershell
   psql -U postgres -d zauction_db -f database/schema.sql
   ```

**Option B: Supabase (Recommended)**

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor
4. Copy and paste contents of `database/schema.sql`
5. Click "Run"
6. Get your DATABASE_URL from Settings → Database

#### 3. Configure Environment

The `.env` file is already created in `zauction-backend/.env`

If using **Supabase**, update:
```env
DATABASE_URL=your_supabase_connection_string
```

If using **local PostgreSQL**, update:
```env
DB_PASSWORD=your_postgres_password
```

#### 4. Start Backend Server

```powershell
cd zauction-backend
npm run dev
```

Server runs at: **http://localhost:3000**

#### 5. Start Frontend Server

Open a **new terminal**:

```powershell
cd frontend
python -m http.server 8000
```

Frontend runs at: **http://localhost:8000**

## 🧪 Testing

### 1. Check Backend Health

```powershell
curl http://localhost:3000/health
```

### 2. Create Test User

```powershell
curl -X POST http://localhost:3000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"password123\",\"full_name\":\"Test User\"}'
```

### 3. Approve User (Database)

```sql
UPDATE users SET status = 'approved' WHERE email = 'test@example.com';
```

### 4. Login

```powershell
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"password123\"}'
```

See [API-TESTS.md](zauction-backend/API-TESTS.md) for complete API testing guide.

## 📁 Project Structure

```
Zauction/
├── frontend/                   # Frontend application
│   ├── index.html             # Landing page
│   ├── pages/                 # Application pages
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── auctions.html
│   │   ├── auction.html
│   │   ├── lot.html
│   │   ├── account.html
│   │   ├── admin.html
│   │   └── info/              # Static pages
│   ├── js/                    # JavaScript modules
│   │   ├── api.js             # API client
│   │   ├── auth.js            # Authentication
│   │   ├── bidding.js         # Bidding logic
│   │   ├── i18n.js            # Internationalization
│   │   └── ...
│   ├── css/                   # Stylesheets
│   │   ├── variables.css
│   │   ├── components.css
│   │   ├── pages/
│   │   └── ...
│   └── locales/               # Translations
│       ├── en.json
│       └── ar.json
│
├── zauction-backend/          # Backend API
│   ├── src/
│   │   ├── server.ts          # Main server
│   │   ├── config/
│   │   │   └── database.ts    # DB configuration
│   │   ├── middleware/
│   │   │   └── auth.ts        # Auth middleware
│   │   ├── routes/
│   │   │   ├── auth.ts        # Auth endpoints
│   │   │   ├── auctions.ts    # Auction endpoints
│   │   │   ├── lots.ts        # Lot endpoints
│   │   │   ├── bids.ts        # Bidding endpoints
│   │   │   ├── watchlist.ts   # Watchlist endpoints
│   │   │   └── admin/         # Admin endpoints
│   │   └── socket/
│   │       └── handlers.ts    # WebSocket handlers
│   ├── database/
│   │   └── schema.sql         # Database schema
│   ├── .env                   # Environment variables
│   ├── package.json
│   └── tsconfig.json
│
├── start.ps1                  # Startup script
├── QUICK-START.md             # Setup guide
└── README.md                  # This file
```

## 🔌 API Documentation

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auctions` | GET | Get all auctions |
| `/api/auctions/:id` | GET | Get single auction |
| `/api/auctions/:id/lots` | GET | Get auction lots |
| `/api/lots/:id` | GET | Get lot details |
| `/api/lots/:id/bids` | GET | Get bid history |

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login user |
| `/api/auth/me` | GET | Get current user |

### Authenticated Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/bids` | POST | User | Place bid |
| `/api/watchlist` | GET | User | Get watchlist |
| `/api/watchlist` | POST | User | Add to watchlist |
| `/api/watchlist/:lotId` | DELETE | User | Remove from watchlist |

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/users` | GET | Get all users |
| `/api/admin/users/:id/approve` | PUT | Approve user |
| `/api/admin/auctions` | POST | Create auction |
| `/api/admin/lots` | POST | Create lot |

See [API-TESTS.md](zauction-backend/API-TESTS.md) for complete API documentation with examples.

## 🔄 Real-Time Features

The platform uses Socket.IO for real-time bidding:

```javascript
// Connect to WebSocket
const socket = io('http://localhost:3000', {
  auth: { token: yourJwtToken }
});

// Join auction room
socket.emit('join-auction', auctionId);

// Listen for new bids
socket.on('new-bid', (data) => {
  console.log('New bid placed:', data);
});
```

## 🌍 Internationalization

The frontend supports English and Arabic with full RTL support:

- Toggle language using the globe icon
- Translations stored in `frontend/locales/`
- Add new languages by creating new JSON files

## 🔐 User Roles & Workflow

### User Registration Flow

1. User registers via `/api/auth/register`
2. Account created with `status: 'pending'`
3. Admin approves via `/api/admin/users/:id/approve`
4. User can now place bids

### Roles

- **User**: Can view auctions, place bids, manage watchlist
- **Admin**: Full access to create auctions, lots, manage users

## 📝 Environment Variables

### Backend (.env)

```env
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8000

# Database (choose one)
# Local PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zauction_db
DB_USER=postgres
DB_PASSWORD=your_password

# OR Supabase
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

## 🛠️ Development

### Backend Development

```powershell
cd zauction-backend

# Install dependencies
npm install

# Run in development mode (auto-reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

### Frontend Development

```powershell
cd frontend

# Start development server
python -m http.server 8000

# Always use http://localhost:8000 (NOT file://)
```

## 🐛 Troubleshooting

### Backend won't start

- ✅ Check PostgreSQL is running
- ✅ Verify `.env` configuration
- ✅ Ensure port 3000 is not in use
- ✅ Run `npm install` in zauction-backend

### Frontend can't connect

- ✅ Verify backend is running on port 3000
- ✅ Check browser console for errors
- ✅ Ensure using `http://localhost:8000` not `file://`

### Database errors

- ✅ Verify schema.sql was executed
- ✅ Check database credentials
- ✅ Ensure database exists

### "Account not approved" error

- ✅ Run SQL: `UPDATE users SET status = 'approved' WHERE email = 'your@email.com'`

## 📚 Additional Documentation

- [QUICK-START.md](QUICK-START.md) - Detailed setup guide
- [API-TESTS.md](zauction-backend/API-TESTS.md) - Complete API testing suite
- [Backend Setup](zauction-backend/BACKEND-SETUP.md) - Backend-specific setup
- [Frontend README](frontend/README.md) - Frontend documentation
- [i18n Guide](frontend/docs/i18n-guide.md) - Internationalization guide

## 🚀 Deployment

### Backend Deployment (Heroku/Railway/Render)

1. Push code to GitHub
2. Connect to deployment platform
3. Set environment variables
4. Deploy!

### Frontend Deployment (Netlify/Vercel)

1. Connect GitHub repository
2. Set build command: (none needed)
3. Set publish directory: `frontend`
4. Deploy!

## 📄 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📞 Support

For issues and questions:
- Check [QUICK-START.md](QUICK-START.md)
- Review [API-TESTS.md](zauction-backend/API-TESTS.md)
- Check server logs for errors

---

**Happy Auctioneering! 🎯**
