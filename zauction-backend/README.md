# Zauction Backend

Production-ready backend API for the Zauction premium auction platform.

## Features

- ✅ User registration with admin approval workflow
- ✅ JWT authentication
- ✅ Google OAuth sign-in/register endpoint
- ✅ WhatsApp OTP verification endpoints for registration
- ✅ Role-based access control (user/admin)
- ✅ PostgreSQL database with Supabase
- ✅ Password hashing with bcrypt
- ✅ Input validation
- ✅ CORS configuration

## Setup

### 1. Install Dependencies

```bash
cd zauction-backend
npm install
```

### 2. Set Up Supabase Database

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor
4. Run the schema from `database/schema.sql`
5. Get your connection string from Settings → Database

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
JWT_SECRET=your-random-secret-key-here
FRONTEND_URL=http://localhost:8000
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
WHATSAPP_OTP_ENABLED=true
WHATSAPP_BRIDGE_URL=http://localhost:3001
```

### 4. Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user (status: pending)
- `POST /api/auth/register/request-otp` - Send OTP to WhatsApp for registration
- `POST /api/auth/register/verify-otp` - Verify OTP and create account
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/oauth/google` - Login/register with Google ID token
- `GET /api/auth/me` - Get current user info (requires auth)

### Admin - User Management

- `GET /api/admin/users` - List all users (with filters)
- `GET /api/admin/users/:id` - Get user details
- `PATCH /api/admin/users/:id/approve` - Approve pending user
- `PATCH /api/admin/users/:id/reject` - Reject pending user
- `PATCH /api/admin/users/:id/suspend` - Suspend user
- `DELETE /api/admin/users/:id` - Delete user

## Default Admin Account

Email: `admin@zauction.com`  
Password: `admin123`

**⚠️ Change this password immediately in production!**

## Project Structure

```
zauction-backend/
├── src/
│   ├── config/
│   │   └── database.ts          # PostgreSQL connection
│   ├── middleware/
│   │   └── auth.ts               # JWT & role-based auth
│   ├── routes/
│   │   ├── auth.ts               # Auth endpoints
│   │   └── admin/
│   │       └── users.ts          # User management
│   └── server.ts                 # Express app
├── database/
│   └── schema.sql                # Database schema
├── package.json
├── tsconfig.json
└── .env.example
```

## Next Steps

- [ ] Add auction CRUD endpoints
- [ ] Add lot CRUD endpoints with media upload
- [ ] Implement bidding API
- [ ] Add Cloudinary integration for media
- [ ] Add watchlist endpoints
- [ ] Implement real-time bid updates

## Testing

Test the API with curl or Postman:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","full_name":"Test User"}'

# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@zauction.com","password":"admin123"}'

# Get pending users (use token from login)
curl http://localhost:3000/api/admin/users?status=pending \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
