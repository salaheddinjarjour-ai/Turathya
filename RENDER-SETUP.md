# Render Backend Setup (Data-Safe)

This guide moves your backend from local PostgreSQL to Render PostgreSQL while preserving existing users, products, lots, bids, and all current data.

## 1. What is already configured in this repo

- Render blueprint exists in `render.yaml`.
- Backend production start is now data-safe:
   - `npm run start:prod` runs `prisma migrate deploy` (non-destructive) then starts server.
- Netlify frontend can continue as-is; only API base URL must point to Render backend.

## 2. Create Render resources

1. In Render, create a PostgreSQL database.
2. In Render, create a Web Service from this repo:
1. `Root Directory`: `zauction-backend`
2. `Build Command`: `npm install && npx prisma generate && npm run build`
3. `Start Command`: `npm run start:prod`
3. In Web Service environment variables, set:
1. `NODE_ENV=production`
2. `DATABASE_URL=<Render Internal Database URL>`
3. `DB_SSL=true`
4. `JWT_SECRET=<strong-random-secret>`
5. `FRONTEND_URL=https://your-netlify-domain.netlify.app`
6. `WHATSAPP_OTP_ENABLED=true`
7. `WHATSAPP_BRIDGE_URL=https://turathya-whatsapp-bridge.onrender.com`

Note: `WHATSAPP_BRIDGE_URL` cannot be `localhost` when backend runs on Render.

## 3. Migrate current local data to Render DB (no data loss)

Run these from your Mac terminal.

1. Export your current local DB to a dump:

```bash
PGPASSWORD='your_local_db_password' pg_dump \
   -h localhost \
   -p 5433 \
   -U zauction \
   -d zauction_db \
   -Fc \
   -f zauction_data.dump
```

2. Restore dump into Render PostgreSQL:

```bash
pg_restore \
   --no-owner \
   --no-privileges \
   --clean \
   --if-exists \
   -d "postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require" \
   zauction_data.dump
```

3. Verify important row counts in Render DB:

```bash
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require" -c "\
SELECT 'users' AS table, count(*) FROM users \
UNION ALL SELECT 'auctions', count(*) FROM auctions \
UNION ALL SELECT 'lots', count(*) FROM lots \
UNION ALL SELECT 'bids', count(*) FROM bids;"
```

## 4. Connect Netlify frontend to Render backend

1. In Netlify Site settings -> Environment variables, set your API base URL variable to your Render backend URL.
2. If your frontend uses a hardcoded URL in JS, update it to:

```text
https://<your-render-service>.onrender.com/api
```

3. Trigger `Clear cache and deploy site` once in Netlify.

## 5. Post-deploy checks

1. Open backend health endpoint:
1. `https://<your-render-service>.onrender.com/health`
2. Test login and product/auction listing from Netlify frontend.
3. Test one create/update action from admin panel to confirm DB writes are on Render.

## 6. Rollback strategy

1. Keep `zauction_data.dump` safely.
2. If anything fails, redeploy previous backend commit in Render.
3. Restore dump again to Render DB if needed.

-- View all auctions
SELECT id, title, status, start_date, end_date FROM auctions;

-- View all bids
SELECT b.amount, l.title, u.email, b.created_at 
FROM bids b
JOIN lots l ON b.lot_id = l.id
JOIN users u ON b.user_id = u.id
ORDER BY b.created_at DESC;
```

---

## 🔄 Migration Path: Free → Paid

### When to Upgrade?

Upgrade when you need:
- ✅ Database persistence beyond 90 days
- ✅ Always-on backend (no spin-down)
- ✅ More database storage/connections
- ✅ Better performance
- ✅ Automated backups

### How to Upgrade

**Database:**
1. Go to database settings in Render
2. Click "Upgrade Plan"
3. Choose Starter ($7/month) or higher
4. No code changes needed!

**Backend:**
1. Go to web service settings
2. Click "Upgrade Plan"
3. Choose Starter ($7/month)
4. Backend stays online 24/7

### Database Migration (If Switching Providers)

If you want to move to AWS RDS, Supabase, etc:

```powershell
# 1. Backup from Render
pg_dump postgresql://render-url > backup.sql

# 2. Restore to new database
psql postgresql://new-url < backup.sql

# 3. Update DATABASE_URL in Render environment variables
# 4. Redeploy
```

---

## 💡 Development Workflow

### For Development (Recommended)

```
Local Backend (npm run dev)
      ↓
Render PostgreSQL Database (Free)
      ↑
Local Frontend (python server)
```

**Advantages:**
- ✅ Real database (not SQLite or in-memory)
- ✅ Same as production environment
- ✅ No local PostgreSQL installation needed
- ✅ Team can share same database
- ✅ Access from anywhere

### For Production

```
Render Backend (Always On)
      ↓
Render PostgreSQL (Starter+)
      ↑
Netlify Frontend (CDN)
```

---

## 🐛 Troubleshooting

### "Connection timeout"
- Render databases have IP whitelisting disabled by default
- Check if your DATABASE_URL is correct
- Try accessing via Render Shell first

### "Too many connections"
- Free tier has connection limit
- Make sure you're using connection pooling (already configured in `database.ts`)
- Close unused connections

### "Database expired"
- Free databases expire after 90 days
- Create new database
- Run schema again
- Update DATABASE_URL

### Backend spins down (Free tier)
- Expected behavior on free tier
- First request after 15 min takes ~30 seconds
- Upgrade to Starter ($7/month) for always-on

---

## 💰 Cost Comparison

### Render (Recommended for You)

| Tier | Database | Backend | Total |
|------|----------|---------|-------|
| Free | $0 (90 days) | $0 (with delays) | **$0** |
| Starter | $7/month | $7/month | **$14/month** |
| Pro | $20/month | $25/month | **$45/month** |

### Alternatives

| Service | Database | Backend | Notes |
|---------|----------|---------|-------|
| **Supabase** | Free tier available | Need separate hosting | Great database |
| **Railway** | $5/month | Pay per use | Simple pricing |
| **Heroku** | $5/month | $7/month | Classic choice |
| **AWS** | RDS from $15 | EC2/Elastic Beanstalk | Most scalable |

---

## ✅ Recommended Approach

### Phase 1: Development (NOW)
1. ✅ Create free Render PostgreSQL database
2. ✅ Run schema on Render database
3. ✅ Connect local backend to Render database
4. ✅ Develop and test locally
5. ✅ Frontend stays local (python server)

**Cost: $0**

### Phase 2: Beta Testing (Optional)
1. Deploy backend to Render (free tier)
2. Deploy frontend to Netlify (free tier)
3. Share with testers
4. Collect feedback

**Cost: $0** (with spin-down delays)

### Phase 3: Production (When Ready)
1. Upgrade Render database to Starter ($7/month)
2. Upgrade Render backend to Starter ($7/month)
3. Custom domain (optional)
4. You're live!

**Cost: $14/month**

---

## 🚀 Quick Start with Render

```powershell
# 1. Create Render account (render.com)
# 2. Create PostgreSQL database (free tier)
# 3. Get DATABASE_URL

# 4. Update local .env
code zauction-backend\.env
# Add: DATABASE_URL=postgresql://...

# 5. Run schema via Render Shell
# (Copy-paste contents of schema.sql)

# 6. Start local development
.\start.ps1

# 7. Test connection
curl http://localhost:3000/health
```

You're now developing with a **real production-grade PostgreSQL database** for free! 🎉

---

## 📚 Additional Resources

- **Render Docs**: https://render.com/docs
- **PostgreSQL Docs**: https://render.com/docs/databases
- **Render Discord**: Community support
- **Free SSL**: Automatic on Render
- **Custom Domains**: Available on all plans

---

**Need help?** Check the Render dashboard logs - they're excellent for debugging!
