# AI Meeting Notes & Action Items Extractor

> Transform meeting transcripts into structured notes with AI-powered extraction of action items, key points, and participant insights.

**Built with Genesis System SDK** | Portfolio-quality MVP | Production-ready patterns

---

## 🎯 Features

- **AI-Powered Extraction**: Automatically extract summaries, action items, key points, and participants from meeting transcripts
- **Meeting History**: Store and search all processed meetings
- **Action Item Tracking**: Mark action items as complete/pending
- **Clean UI**: Modern, responsive interface built with React + Tailwind CSS
- **Production Ready**: Docker Compose orchestration, database persistence, API documentation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                      │
│  • TypeScript + Tailwind CSS                                     │
│  • Meeting input & history views                                 │
│  • Action item management                                        │
│  Port: 3000 (dev) / 80 (production)                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │ REST API
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (FastAPI)                        │
│  • AI/LLM integration via OpenRouter                             │
│  • Structured data extraction                                    │
│  • RESTful endpoints + OpenAPI docs                             │
│  Port: 8000                                                      │
└──────┬────────────┬─────────────────────────────────────────────┘
       │            │
       ▼            ▼
┌──────────┐  ┌──────────┐
│Postgres16│  │ Redis 7  │
│(meetings,│  │ (cache)  │
│ actions) │  │          │
└──────────┘  └──────────┘
```

### Tech Stack

**Frontend:**
- React 18.2 + TypeScript
- Vite 5 (build tool)
- Tailwind CSS 3.4
- Lucide React (icons)

**Backend:**
- FastAPI 0.104
- SQLAlchemy (async)
- OpenRouter API (AI/LLM)
- Pydantic validation

**Infrastructure:**
- PostgreSQL 16
- Redis 7
- Docker Compose
- Nginx (production)

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- OpenRouter API Key (get free tier at [openrouter.ai](https://openrouter.ai/keys))

### Setup

1. **Clone the repository** (if using Git):
   ```bash
   cd blueprints/blueprint-ai-notetaker
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

3. **Add your OpenRouter API key** to `.env`:
   ```env
   OPENROUTER_API_KEY=your_actual_api_key_here
   ```

4. **Start all services**:
   ```bash
   docker compose up -d
   ```

5. **Access the application**:
   - **Frontend**: http://localhost:3000
   - **API Docs**: http://localhost:8000/docs
   - **API Health**: http://localhost:8000/health

### First Meeting

1. Open http://localhost:3000
2. Paste a meeting transcript
3. Click "Extract Notes"
4. View structured output with action items and participants

---

## 📖 Usage Guide

### Processing a Meeting

1. Click **"New Meeting"**
2. Paste your meeting transcript in the text area
3. Click **"Extract Notes"**
4. AI will extract:
   - Meeting title
   - Summary (2-3 sentences)
   - Key discussion points
   - Action items
   - Participants mentioned
   - Decisions made

### Managing Action Items

- Click the checkbox next to an action item to mark it complete
- Completed items show with a green checkmark and strikethrough
- All changes sync to the database immediately

### Viewing History

1. Click **"History"** button
2. Browse all processed meetings
3. Click action item checkboxes to update status
4. Click trash icon to delete a meeting

### Sample Transcript

```
Sarah: I think we should prioritize the mobile app redesign for Q2.

John: Agreed. Let's allocate two senior engineers to this project. 
I'll talk to the design team about mockups.

Maria: What about the timeline? Can we realistically get this done by Q2?

Sarah: If we start next week and work in 2-week sprints, we should be fine. 
Let's aim for a beta release by end of May.

John: Perfect. I'll schedule a kickoff meeting for next Tuesday.

Maria: I'll prepare the project brief and send it out by Friday.
```

**AI will extract:**
- **Title**: "Mobile App Redesign Planning"
- **Summary**: Team agreed to prioritize mobile app redesign for Q2...
- **Action Items**: Schedule kickoff meeting, prepare project brief, talk to design team
- **Participants**: Sarah, John, Maria
- **Decisions**: Start next week, 2-week sprints, beta by end of May

---

## 🔧 Development

### Local Development (Without Docker)

**Backend:**
```bash
cd services/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd services/frontend
npm install
npm run dev
```

### Environment Variables

See `.env.example` for all configuration options:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | ✅ Yes | - | API key from openrouter.ai |
| `OPENROUTER_MODEL` | No | `anthropic/claude-haiku-4.5` | AI model to use |
| `POSTGRES_PASSWORD` | No | `localdevpassword123` | Database password |
| `ALLOWED_ORIGINS` | No | `*` | CORS allowed origins |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/meetings/process` | POST | Process new transcript |
| `/api/meetings` | GET | List all meetings |
| `/api/meetings/{id}` | GET | Get specific meeting |
| `/api/meetings/{id}` | DELETE | Delete meeting |
| `/api/action-items/{id}` | PATCH | Update action item status |

Full API documentation: http://localhost:8000/docs

---

## 🧪 Testing

### Smoke Tests

```bash
# Check all services are running
docker compose ps

# Backend health check
curl http://localhost:8000/health

# Frontend accessible
curl http://localhost:3000

# Database connection
docker compose exec postgres psql -U meetingnotesuser -d meetingnotesdb -c "\dt"
```

### Test AI Processing

```bash
curl -X POST http://localhost:8000/api/meetings/process \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "John: We need to finish the report by Friday. Sarah: I will handle the data analysis."
  }'
```

---

## 📁 Project Structure

```
blueprint-ai-notetaker/
├── .env.example              # Environment configuration template
├── docker-compose.yml        # Services orchestration
├── README.md                 # This file
│
├── config/
│   └── postgres/
│       └── init.sql          # Database schema
│
└── services/
    ├── backend/              # FastAPI application
    │   ├── Dockerfile
    │   ├── requirements.txt
    │   └── app/
    │       ├── __init__.py
    │       └── main.py       # API + AI logic
    │
    └── frontend/             # React application
        ├── Dockerfile
        ├── nginx.conf
        ├── package.json
        ├── vite.config.ts
        ├── tailwind.config.js
        ├── index.html
        └── src/
            ├── main.tsx
            ├── App.tsx       # Main React component
            └── index.css
```

---

## 🐛 Troubleshooting

### Services won't start

```bash
# Check if ports are in use
netstat -ano | findstr ":3000 :8000 :5432 :6379"

# View logs
docker compose logs -f

# Restart services
docker compose down
docker compose up -d
```

### "OPENROUTER_API_KEY not configured"

Make sure you:
1. Created `.env` file from `.env.example`
2. Added your actual API key
3. Restarted services: `docker compose restart api`

### Database connection errors

```bash
# Wait for database to be ready
docker compose logs postgres

# Manually connect to verify
docker compose exec postgres psql -U meetingnotesuser -d meetingnotesdb
```

### Frontend shows blank page

```bash
# Check frontend build logs
docker compose logs frontend

# Rebuild frontend
docker compose up -d --build frontend
```

---

## 🎓 Learning Resources

- **Genesis System SDK**: See main repository docs at `/AI_INSTRUCTIONS.md`
- **FastAPI**: https://fastapi.tiangolo.com/
- **React**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **OpenRouter**: https://openrouter.ai/docs

---

## 🚢 Deployment

### Production Checklist

- [ ] Change all default passwords in `.env`
- [ ] Set `ALLOWED_ORIGINS` to your domain
- [ ] Use production database (not local)
- [ ] Set up SSL certificates
- [ ] Configure backup strategy
- [ ] Set up monitoring/alerts
- [ ] Review API rate limits

### Docker Compose Production

```bash
# Build for production
docker compose -f docker-compose.yml up -d --build

# Use external database
# Update DATABASE_URL in .env to point to production DB
```

---

## 📝 License

MIT License - Feel free to use for learning, portfoliosor commercial projects.

---

## 🙏 Acknowledgments

- Built with [Genesis System SDK](https://github.com/Inceptium-ai/Genesis-System-SDK)
- AI powered by [OpenRouter](https://openrouter.ai/)
- Icons by [Lucide](https://lucide.dev/)

---

## 📧 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API docs at http://localhost:8000/docs
3. Check Genesis SDK documentation
4. Open an issue in the repository

---

**Happy note-taking! 📝✨**
