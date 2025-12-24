# Quick Start Guide - AI Meeting Notes

## Step 1: Get OpenRouter API Key

1. Visit https://openrouter.ai/keys
2. Sign up (free tier available)
3. Copy your API key

## Step 2: Create .env File

```bash
# In blueprints/blueprint-ai-notetaker directory
cp .env.example .env
```

Then edit `.env` and add your API key:
```env
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
```

## Step 3: Start the Application

```bash
cd c:\Users\thesa\Documents\GitHub\Genesis-System-SDK\blueprints\blueprint-ai-notetaker
docker compose up -d
```

This will:
- Download Docker images (first time only - takes a few minutes)
- Build backend and frontend containers
- Start PostgreSQL and Redis
- Launch all services

## Step 4: Wait for Build to Complete

The first build takes 5-10 minutes. Check progress:

```bash
docker compose logs -f
```

Press Ctrl+C to exit logs.

## Step 5: Access the Application

Once all services are running:

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Verify Services Are Running

```bash
docker compose ps
```

You should see 4 services running:
- meeting-notes-frontend
- meeting-notes-api
- meeting-notes-postgres
- meeting-notes-redis

## Troubleshooting

### TypeScript Errors in VS Code
**Normal!** They disappear after npm install (happens during Docker build).

### Services Not Starting
```bash
# View logs
docker compose logs

# Restart services
docker compose restart

# Rebuild everything
docker compose down
docker compose up -d --build
```

### Port Already in Use
Change ports in `docker-compose.yml`:
```yaml
ports:
  - "3001:80"  # Instead of 3000
  - "8001:8000"  # Instead of 8000
```

## Stop the Application

```bash
docker compose down
```

## Remove Everything (Including Data)

```bash
docker compose down -v
```

## Next Steps

1. Visit http://localhost:3000
2. Paste a meeting transcript
3. Click "Extract Notes"
4. See AI-extracted action items and summaries!

---

**Need Help?** See README.md for full documentation.
