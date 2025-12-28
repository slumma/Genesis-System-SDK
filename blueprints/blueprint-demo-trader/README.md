# Demo Trading Platform

> Paper trading platform with real market data - trade stocks, ETFs, and crypto with fake money while following real-time market prices.

**Built with Genesis System SDK** | Portfolio-quality MVP | Production-ready patterns

---

## 🎯 Features

- **Real Market Data**: Live prices for stocks, ETFs, and cryptocurrency
- **Paper Trading**: Execute buy/sell orders with $100,000 virtual cash
- **Portfolio Management**: Real-time portfolio value tracking with P/L
- **Watchlist**: Track your favorite symbols with live price updates
- **Performance Analytics**: View daily, weekly, monthly, YTD, and all-time returns
- **Trade History**: Complete record of all executed trades
- **Asset Search**: Search and discover stocks, ETFs, and crypto
- **Auto-refresh**: Portfolio updates automatically every 10 seconds

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                      │
│  • TypeScript + Tailwind CSS                                     │
│  • Trading interface & performance dashboard                     │
│  • Real-time portfolio updates                                   │
│  Port: 3000 (dev) / 80 (production)                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │ REST API + WebSocket
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (FastAPI)                        │
│  • Market data integration (Finnhub, yfinance, Binance)          │
│  • Trade execution engine                                        │
│  • Portfolio calculations                                        │
│  • RESTful endpoints + WebSocket support                        │
│  Port: 8000                                                      │
└──────┬────────────┬─────────────────────────────────────────────┘
       │            │
       ▼            ▼
┌──────────┐  ┌──────────┐
│Postgres16│  │ Redis 7  │
│(trades,  │  │ (price   │
│holdings, │  │  cache)  │
│portfolio)│  │          │
└──────────┘  └──────────┘
```

### Tech Stack

**Frontend:**
- React 18.2 + TypeScript
- Vite 5 (build tool)
- Tailwind CSS 3.4
- Lucide React (icons)
- Auto-refresh portfolio updates

**Backend:**
- FastAPI 0.104
- SQLAlchemy (async ORM)
- Finnhub API (stocks/ETFs)
- yfinance (fallback & historical data)
- Binance API (crypto prices)
- Pydantic validation
- WebSocket support

**Infrastructure:**
- PostgreSQL 16 (persistent storage)
- Redis 7 (price caching)
- Docker Compose
- Nginx (production)

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Finnhub API Key (free tier - get at [finnhub.io](https://finnhub.io/register))

### Setup

1. **Navigate to the project**:
   ```bash
   cd blueprints/blueprint-demo-trader
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

3. **Add your Finnhub API key** to `.env`:
   ```env
   FINNHUB_API_KEY=your_api_key_here
   ```

4. **Start all services**:
   ```bash
   docker compose up -d
   ```

5. **Access the application**:
   - **Trading Platform**: http://localhost:3000
   - **API Docs**: http://localhost:8000/docs
   - **API Health**: http://localhost:8000/health

---

## 📖 Usage Guide

### Trading View

**Search for Assets**
1. Use the search box to find stocks (AAPL, MSFT), ETFs (SPY, QQQ), or crypto (BTCUSD, ETHUSD)
2. Click on a result to select it for trading
3. Add symbols to your watchlist for quick access

**Execute Trades**
1. Select a symbol from search or watchlist
2. Choose Buy or Sell
3. Enter the quantity
4. Click the Buy/Sell button
5. Trade executes at current market price

**View Holdings**
- See all your positions with real-time values
- Profit/Loss shown in green (gain) or red (loss)
- Average cost vs. current price displayed

**Watchlist**
- Click the "Watch" button to add symbols
- Live price updates every 10 seconds
- Click symbol to quickly select for trading
- Remove with the X button

### Performance View

**Portfolio Metrics**
- Total portfolio value
- Cash balance
- Holdings value
- Daily change (if available)

**Trade History**
- View all executed trades
- See date, symbol, action, quantity, price, and total
- Color-coded buy (green) / sell (red) indicators

---

## 🎓 Market Data Sources

### Stocks & ETFs
- **Primary**: Finnhub.io (real-time quotes, requires free API key)
- **Fallback**: yfinance (15-20 min delayed quotes, no API key needed)
- **Historical**: yfinance (daily OHLCV data)

### Cryptocurrency
- **Real-time**: Binance Public API (no authentication required)
- **Symbols**: BTCUSD, ETHUSD, BNBUSD, SOLUSD, etc.

### Caching
- Redis caches prices for 10 seconds to reduce API calls
- Auto-refresh on frontend every 10 seconds

---

## 💡 API Endpoints

### Market Data
- `GET /api/market/search?query={symbol}` - Search for assets
- `GET /api/market/quote/{symbol}?asset_type={type}` - Get current quote
- `GET /api/market/history/{symbol}?period={period}` - Historical data

### Trading
- `POST /api/trades/execute` - Execute buy/sell order
- `GET /api/trades/history` - Get trade history

### Portfolio
- `GET /api/portfolio` - Get current portfolio with real-time prices
- `GET /api/portfolio/value-history?period={period}` - Portfolio value over time

### Watchlist
- `GET /api/watchlist` - Get watchlist with current prices
- `POST /api/watchlist` - Add symbol to watchlist
- `DELETE /api/watchlist/{id}` - Remove from watchlist

### Performance
- `GET /api/performance/metrics` - Get performance metrics for all periods

Full API documentation: http://localhost:8000/docs

---

## 📁 Project Structure

```
blueprint-demo-trader/
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
    │       ├── main.py       # API routes & endpoints
    │       ├── models.py     # SQLAlchemy models
    │       ├── schemas.py    # Pydantic schemas
    │       └── market_data.py # Market data integrations
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

## 🔧 Development

### Local Development (Without Docker)

**Backend:**
```bash
cd services/backend
pip install -r requirements.txt

# Set environment variables
export FINNHUB_API_KEY=your_api_key
export DATABASE_URL=postgresql://traderuser:localdevpass123@localhost:5432/tradingdb
export REDIS_URL=redis://:localredis123@localhost:6379/0

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
| `FINNHUB_API_KEY` | Recommended | - | API key from finnhub.io |
| `ENABLE_CRYPTO` | No | `true` | Enable crypto trading |
| `ENABLE_STOCKS` | No | `true` | Enable stock/ETF trading |
| `INITIAL_BALANCE` | No | `100000.00` | Starting cash balance |
| `TRADING_FEE_PERCENT` | No | `0.0` | Trading fee percentage |
| `DATABASE_URL` | No | (auto) | PostgreSQL connection string |
| `REDIS_URL` | No | (auto) | Redis connection string |
| `ALLOWED_ORIGINS` | No | `*` | CORS allowed origins |

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
docker compose exec postgres psql -U traderuser -d tradingdb -c "\dt"
```

### Test Trading

```bash
# Execute a buy order
curl -X POST http://localhost:8000/api/trades/execute \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "asset_type": "stock",
    "action": "buy",
    "quantity": 10
  }'

# Get portfolio
curl http://localhost:8000/api/portfolio

# Search for assets
curl "http://localhost:8000/api/market/search?query=tesla"
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

### No market data / "Unable to fetch quote"

**Without Finnhub API key:**
- Set `FINNHUB_API_KEY` in `.env`
- System will fall back to yfinance (works but slower)

**With Finnhub API key:**
- Verify API key is correct at [finnhub.io/dashboard](https://finnhub.io/dashboard)
- Check API rate limits (free tier: 60 calls/minute)
- Try a different symbol

### Database connection errors

```bash
# Wait for database to be ready
docker compose logs postgres

# Manually connect to verify
docker compose exec postgres psql -U traderuser -d tradingdb

# Reset database
docker compose down -v
docker compose up -d
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

- **Genesis System SDK**: See main repository docs
- **FastAPI**: https://fastapi.tiangolo.com/
- **React**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **Finnhub**: https://finnhub.io/docs/api
- **yfinance**: https://pypi.org/project/yfinance/
- **Binance API**: https://binance-docs.github.io/apidocs/spot/en/

---

## 🚢 Deployment

### Production Checklist

- [ ] Change all default passwords in `.env`
- [ ] Set `ALLOWED_ORIGINS` to your domain
- [ ] Use production database (not local)
- [ ] Set up SSL certificates (HTTPS)
- [ ] Configure backup strategy for database
- [ ] Set up monitoring/alerts
- [ ] Review Finnhub API rate limits
- [ ] enable trading fees if desired (`TRADING_FEE_PERCENT`)

### Docker Compose Production

```bash
# Build for production
docker compose -f docker-compose.yml up -d --build

# Use external database
# Update DATABASE_URL in .env to point to production DB
```

---

## 📊 Features Roadmap

**Implemented** ✅
- Real-time market data for stocks, ETFs, crypto
- Buy/sell trade execution
- Portfolio tracking with P/L
- Watchlist functionality
- Trade history
- Performance metrics
- Auto-refresh updates

**Future Enhancements** 💡
- Price charts (candlestick/line charts)
- Limit orders & stop-loss
- Portfolio value charts over time
- Asset allocation pie charts
- Multi-user support with authentication
- Email notifications for trades
- Advanced analytics (Sharpe ratio, etc.)
- Options trading
- Real-time WebSocket price streaming

---

## 📝 License

MIT License - Feel free to use for learning, portfolios, or commercial projects.

---

## 🙏 Acknowledgments

- Built with [Genesis System SDK](https://github.com/Inceptium-ai/Genesis-System-SDK)
- Market data provided by [Finnhub](https://finnhub.io/), [yfinance](https://pypi.org/project/yfinance/), and [Binance](https://www.binance.com/)
- Icons by [Lucide](https://lucide.dev/)

---

## 📧 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API docs at http://localhost:8000/docs
3. Check Genesis SDK documentation
4. Open an issue in the repository

---

**Happy Trading! 📈💰**
