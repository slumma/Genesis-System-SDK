# Quick Start Guide - Demo Trading Platform

Get your trading platform up and running in 5 minutes!

## Step 1: Get a Free Finnhub API Key

1. Go to https://finnhub.io/register
2. Sign up for a free account
3. Go to your dashboard: https://finnhub.io/dashboard
4. Copy your API key (looks like: `xxxxxxxxxxxxxxxxxx`)

> **Note:** The free tier gives you 60 API calls per minute, which is plenty for this demo!

## Step 2: Configure Environment

```bash
# Navigate to the project directory
cd blueprints/blueprint-demo-trader

# Copy the example environment file
cp .env.example .env
```

Open `.env` and add your Finnhub API key:

```env
FINNHUB_API_KEY=your_actual_api_key_here
```

## Step 3: Start the Platform

```bash
# Start all services with Docker Compose
docker compose up -d

# Check that all services are running
docker compose ps
```

You should see 4 services running:
- ✅ trading-platform-frontend (port 3000)
- ✅ trading-platform-api (port 8000)
- ✅ trading-platform-postgres (port 5432)
- ✅ trading-platform-redis (port 6379)

## Step 4: Access the Platform

Open your browser and go to:

**🎯 Trading Platform:** http://localhost:3000

You'll see:
- $100,000 in virtual cash
- Watchlist with sample symbols (AAPL, MSFT, TSLA, etc.)
- Trading interface ready to use

## Step 5: Make Your First Trade

1. **Search for a stock** - Try searching for "apple" or "AAPL"
2. **Click on AAPL** in the search results
3. **Enter quantity** - Try buying 10 shares
4. **Click "Buy AAPL"**
5. **Check your portfolio** - You should see AAPL in your holdings!

## Step 6: Explore Features

**Trading View:**
- Search for stocks, ETFs, and crypto
- Add/remove symbols from watchlist
- Execute buy and sell orders
- View real-time portfolio values

**Performance View:**
- See your trade history
- Track portfolio metrics
- View gains/losses

## Next Steps

- 📖 Read the full [README.md](./README.md) for detailed documentation
- 🔍 Explore the API at http://localhost:8000/docs
- 💡 Try trading crypto (search for "BTC" or "bitcoin")
- 📊 Check performance metrics after a few trades

## Quick Commands

```bash
# View logs
docker compose logs -f

# Stop all services
docker compose down

# Restart services
docker compose restart

# Reset everything (including data)
docker compose down -v
docker compose up -d
```

## Troubleshooting

**No prices showing?**
- Make sure your Finnhub API key is set in `.env`
- The system will fall back to yfinance (slower but works without API key)

**Services not starting?**
```bash
# Check for port conflicts
netstat -ano | findstr ":3000 :8000 :5432 :6379"

# View detailed logs
docker compose logs -f
```

**Need to reset your portfolio?**
```bash
# This will reset all data
docker compose down -v
docker compose up -d
```

## Support

- Check troubleshooting section in [README.md](./README.md)
- View API documentation at http://localhost:8000/docs
- Check service health at http://localhost:8000/health

---

**Happy Trading! 📈**
