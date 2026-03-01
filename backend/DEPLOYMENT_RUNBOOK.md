# BookMyVenue Backend - Deployment Runbook

## Quick Reference

| Item | Value |
|------|-------|
| Entry Point | `server:app` |
| Default Port | `8001` |
| Health Check | `GET /api/health` |
| DB | MongoDB (see `MONGO_URL`) |
| Scheduler | Disabled by default |

---

## 1. Pre-Deployment Checklist

```bash
# Verify all tests pass
cd /app/backend
python -m pytest tests/ -v

# Verify lint passes
ruff check .

# Verify app boots
python -c "from server import app; print(f'OK: {len(list(app.routes))} routes')"
```

---

## 2. Environment Variables

### Required
```bash
MONGO_URL=mongodb://...          # MongoDB connection string
DB_NAME=bookmyvenue              # Database name
JWT_SECRET=<secure-random-key>   # JWT signing secret
```

### Optional
```bash
ENV=production                   # Environment (production|dev|test)
ENABLE_SCHEDULER=false           # Enable background tasks (default: false)
DEV_SEED_TOKEN=<token>           # Token for /api/seed-data (dev only)
CORS_ORIGINS=*                   # Allowed CORS origins
RESEND_API_KEY=<key>             # Email sending (optional)
RAZORPAY_KEY_ID=<key>            # Payment processing (optional)
RAZORPAY_KEY_SECRET=<secret>     # Payment processing (optional)
```

---

## 3. Deployment Commands

### Single Instance (Uvicorn)
```bash
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Production (Gunicorn + Uvicorn Workers)
```bash
gunicorn server:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8001 \
  --timeout 120
```

### With Scheduler (Single Worker Only!)
```bash
# ⚠️ IMPORTANT: Only enable scheduler on ONE worker
ENABLE_SCHEDULER=true gunicorn server:app \
  --workers 1 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8001
```

---

## 4. Post-Deployment Verification

```bash
API_URL=https://your-domain.com

# 1. Health check
curl -s "$API_URL/api/health"
# Expected: {"status":"healthy","timestamp":"..."}

# 2. Auth check
curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bookmyvenue.in","password":"admin123"}'
# Expected: {"token":"...","user":{...}}

# 3. Venues check
curl -s "$API_URL/api/venues?limit=1"
# Expected: [{...}]

# 4. Seed route protection (should 404)
curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/seed-data"
# Expected: 404
```

---

## 5. Scheduler Management

### Enable Scheduler
```bash
# Add to environment
ENABLE_SCHEDULER=true

# Restart service
sudo supervisorctl restart backend
```

### Disable Scheduler (Emergency)
```bash
# Option 1: Environment variable
ENABLE_SCHEDULER=false
sudo supervisorctl restart backend

# Option 2: Kill scheduler tasks only (if running)
# The scheduler uses MongoDB locks, so simply restarting
# with ENABLE_SCHEDULER=false will stop all tasks
```

### Verify Scheduler Status
```bash
# Check logs
tail -f /var/log/supervisor/backend.err.log | grep -i scheduler

# Expected (enabled):
# Scheduler ENABLED - starting background tasks

# Expected (disabled):
# Scheduler DISABLED (set ENABLE_SCHEDULER=true to enable)
```

---

## 6. Rollback Procedure

### Quick Rollback (Emergent Platform)
1. Go to Emergent Dashboard
2. Click "Rollback" button
3. Select previous checkpoint
4. Confirm rollback

### Manual Rollback (Git)
```bash
# View recent commits
git log --oneline -10

# Rollback to specific commit
git checkout <commit-hash> -- backend/

# Restart service
sudo supervisorctl restart backend
```

---

## 7. Log Monitoring

### Key Log Files
```bash
# Application logs (stdout/stderr)
/var/log/supervisor/backend.out.log
/var/log/supervisor/backend.err.log

# Watch logs in real-time
tail -f /var/log/supervisor/backend.err.log
```

### Key Log Patterns to Monitor
```bash
# Errors
grep -i "error\|exception\|failed" /var/log/supervisor/backend.err.log

# Scheduler activity
grep -i "scheduler\|SLA\|digest\|conversion email" /var/log/supervisor/backend.err.log

# Authentication issues
grep -i "401\|403\|unauthorized" /var/log/supervisor/backend.err.log
```

### Health Alerts
```bash
# Simple health check script
while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health")
  if [ "$STATUS" != "200" ]; then
    echo "ALERT: Health check failed with status $STATUS"
    # Add your alerting mechanism here
  fi
  sleep 60
done
```

---

## 8. Troubleshooting

### App Won't Start
```bash
# Check syntax errors
cd /app/backend && python -c "from server import app"

# Check for import errors
python -c "import server" 2>&1

# Check supervisor logs
tail -50 /var/log/supervisor/backend.err.log
```

### Database Connection Issues
```bash
# Test MongoDB connection
python -c "
from motor.motor_asyncio import AsyncIOMotorClient
import os
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
print('Connected:', client.server_info())
"
```

### Scheduler Running Multiple Times
```bash
# Check scheduler locks in MongoDB
python -c "
import asyncio
from config import db
async def check():
    locks = await db.scheduler_locks.find().to_list(100)
    for lock in locks:
        print(lock)
asyncio.run(check())
"

# Clear stale locks (if needed)
python -c "
import asyncio
from config import db
async def clear():
    result = await db.scheduler_locks.delete_many({})
    print(f'Deleted {result.deleted_count} locks')
asyncio.run(clear())
"
```

---

## 9. Contact & Escalation

| Issue Type | Action |
|------------|--------|
| App Down | Check logs, restart supervisor |
| DB Issues | Check MONGO_URL, verify connectivity |
| Scheduler Duplicate | Verify ENABLE_SCHEDULER on single worker |
| Auth Failures | Check JWT_SECRET consistency |

---

*Last Updated: March 2026*
*Version: 1.0.0*
