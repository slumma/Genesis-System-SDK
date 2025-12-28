# =============================================================================
# Demo Trading Platform - Market Data Integration
# =============================================================================

import os
import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict
import httpx
import yfinance as yf
from redis import Redis
import time

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
ENABLE_CRYPTO = os.getenv("ENABLE_CRYPTO", "true").lower() == "true"
ENABLE_STOCKS = os.getenv("ENABLE_STOCKS", "true").lower() == "true"
REDIS_URL = os.getenv("REDIS_URL", "redis://:localredis123@redis:6379/0")

# Redis client for caching
redis_client = None
try:
    redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
except Exception as e:
    print(f"Warning: Redis connection failed: {e}")


# =============================================================================
# Cache Helpers
# =============================================================================
def get_cached_price(symbol: str) -> Optional[Decimal]:
    """Get cached price from Redis"""
    if not redis_client:
        return None
    try:
        cached = redis_client.get(f"price:{symbol}")
        if cached:
            return Decimal(cached)
    except Exception:
        pass
    return None


def set_cached_price(symbol: str, price: Decimal, ttl: int = 10):
    """Cache price in Redis with TTL"""
    if not redis_client:
        return
    try:
        redis_client.setex(f"price:{symbol}", ttl, str(price))
    except Exception:
        pass


# =============================================================================
# Finnhub API Integration
# =============================================================================
async def get_stock_quote_finnhub(symbol: str) -> Optional[Dict]:
    """Get real-time stock quote from Finnhub"""
    if not FINNHUB_API_KEY or FINNHUB_API_KEY == "your_finnhub_api_key_here":
        return None
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://finnhub.io/api/v1/quote",
                params={"symbol": symbol, "token": FINNHUB_API_KEY}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("c"):  # Current price exists
                    return {
                        "current_price": Decimal(str(data["c"])),
                        "open_price": Decimal(str(data["o"])) if data.get("o") else None,
                        "high_price": Decimal(str(data["h"])) if data.get("h") else None,
                        "low_price": Decimal(str(data["l"])) if data.get("l") else None,
                        "previous_close": Decimal(str(data["pc"])) if data.get("pc") else None,
                        "change": Decimal(str(data["d"])) if data.get("d") else None,
                        "change_percent": Decimal(str(data["dp"])) if data.get("dp") else None,
                    }
    except Exception as e:
        print(f"Finnhub API error for {symbol}: {e}")
    
    return None


async def search_symbols_finnhub(query: str) -> List[Dict]:
    """Search for symbols using Finnhub"""
    if not FINNHUB_API_KEY or FINNHUB_API_KEY == "your_finnhub_api_key_here":
        return []
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://finnhub.io/api/v1/search",
                params={"q": query, "token": FINNHUB_API_KEY}
            )
            
            if response.status_code == 200:
                data = response.json()
                results = []
                for item in data.get("result", [])[:10]:  # Limit to 10 results
                    results.append({
                        "symbol": item.get("symbol"),
                        "name": item.get("description"),
                        "asset_type": item.get("type", "stock"),
                        "exchange": item.get("exchange")
                    })
                return results
    except Exception as e:
        print(f"Finnhub search error: {e}")
    
    return []


# =============================================================================
# yfinance Integration (Fallback & Historical Data)
# =============================================================================
def get_mock_price(symbol: str) -> Dict:
    """Generate mock price data for demo purposes"""
    # Base prices for common symbols (updated Dec 2024)
    base_prices = {
        "AAPL": 250.0,
        "MSFT": 425.0,
        "GOOGL": 175.0,
        "TSLA": 380.0,
        "AMZN": 215.0,
        "META": 575.0,
        "NVDA": 140.0,
        "SPY": 590.0,
        "QQQ": 515.0,
        "BTCUSD": 95000.0,
        "ETHUSD": 3600.0,
        "SOLUSD": 210.0,
    }
    
    import random
    import hashlib
    
    # Use symbol hash for consistent "random" variation
    seed = int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)
    random.seed(seed + int(time.time() / 60))  # Changes every minute
    
    base_price = base_prices.get(symbol, 100.0)
    variation = random.uniform(-0.02, 0.02)  # +/- 2%
    current_price = Decimal(str(base_price * (1 + variation)))
    
    previous_close = Decimal(str(base_price))
    change = current_price - previous_close
    change_percent = (change / previous_close * 100) if previous_close > 0 else Decimal("0")
    
    return {
        "current_price": current_price,
        "open_price": previous_close,
        "high_price": current_price * Decimal("1.01"),
        "low_price": current_price * Decimal("0.99"),
        "previous_close": previous_close,
        "change": change,
        "change_percent": change_percent,
    }


def get_stock_quote_yfinance(symbol: str) -> Optional[Dict]:
    """Get stock quote using yfinance - tries multiple methods for real data"""
    try:
        ticker = yf.Ticker(symbol)
        
        # Try fast_info first (most reliable for real-time data)
        try:
            fast_info = ticker.fast_info
            if hasattr(fast_info, "last_price") and fast_info.last_price and fast_info.last_price > 0:
                return {
                    "current_price": Decimal(str(fast_info.last_price)),
                    "open_price": Decimal(str(fast_info.open)) if hasattr(fast_info, "open") else None,
                    "high_price": Decimal(str(fast_info.day_high)) if hasattr(fast_info, "day_high") else None,
                    "low_price": Decimal(str(fast_info.day_low)) if hasattr(fast_info, "day_low") else None,
                    "previous_close": Decimal(str(fast_info.previous_close)) if hasattr(fast_info, "previous_close") else None,
                }
        except Exception:
            pass
        
        # Try info dict as backup
        info = ticker.info
        if info:
            current_price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("price")
            if current_price and current_price > 0:
                return {
                    "current_price": Decimal(str(current_price)),
                    "open_price": Decimal(str(info["regularMarketOpen"])) if "regularMarketOpen" in info else None,
                    "high_price": Decimal(str(info["regularMarketDayHigh"])) if "regularMarketDayHigh" in info else None,
                    "low_price": Decimal(str(info["regularMarketDayLow"])) if "regularMarketDayLow" in info else None,
                    "previous_close": Decimal(str(info["previousClose"])) if "previousClose" in info else None,
                    "volume": info.get("regularMarketVolume"),
                }
        
        # If no valid data found, fall back to mock
        print(f"No valid yfinance data for {symbol}, using mock")
        return get_mock_price(symbol)
        
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "Too Many Requests" in error_str:
            print(f"Rate limited for {symbol}, using mock data")
        else:
            print(f"yfinance error for {symbol}: {e}")
        return get_mock_price(symbol)


def get_mock_historical_data(symbol: str, period: str = "1mo") -> List[Dict]:
    """Generate mock historical data for demo purposes"""
    import random
    import hashlib
    
    # Base prices for common symbols (updated Dec 2024 - matches current prices)
    base_prices = {
        "AAPL": 250.0,
        "MSFT": 425.0,
        "GOOGL": 175.0,
        "TSLA": 380.0,
        "AMZN": 215.0,
        "META": 575.0,
        "NVDA": 140.0,
        "SPY": 590.0,
        "QQQ": 515.0,
        "BTCUSD": 95000.0,
        "ETHUSD": 3600.0,
        "SOLUSD": 210.0,
    }
    
    base_price = base_prices.get(symbol, 100.0)
    
    # Determine number of days
    days_map = {
        "1d": 1,
        "5d": 5,
        "1mo": 30,
        "3mo": 90,
        "6mo": 180,
        "1y": 365
    }
    days = days_map.get(period, 30)
    
    # Generate historical data
    data = []
    current_date = datetime.now()
    price = base_price
    
    # Use symbol for consistent seed
    seed = int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)
    random.seed(seed)
    
    for i in range(days, 0, -1):
        date = current_date - timedelta(days=i)
        
        # Random walk with small variations
        change = random.uniform(-0.015, 0.015)  # +/- 1.5% daily
        price = price * (1 + change)
        
        # Generate OHLC
        day_high = price * random.uniform(1.001, 1.015)
        day_low = price * random.uniform(0.985, 0.999)
        open_price = price * random.uniform(0.995, 1.005)
        close_price = price
        
        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "open": round(open_price, 2),
            "high": round(day_high, 2),
            "low": round(day_low, 2),
            "close": round(close_price, 2),
            "volume": random.randint(1000000, 100000000)
        })
    
    return data


def get_historical_data_yfinance(symbol: str, period: str = "1mo") -> List[Dict]:
    """Get historical price data from yfinance (fallback to mock if rate limited)"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        
        if hist.empty:
            print(f"No historical data for {symbol}, using mock data")
            return get_mock_historical_data(symbol, period)
        
        data = []
        for index, row in hist.iterrows():
            data.append({
                "date": index.strftime("%Y-%m-%d"),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"])
            })
        
        return data
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "Too Many Requests" in error_str:
            print(f"Rate limited for historical data {symbol}, using mock data")
            return get_mock_historical_data(symbol, period)
        print(f"Historical data error for {symbol}: {e}")
        return get_mock_historical_data(symbol, period)


# =============================================================================
# Crypto Price Integration (Binance Public API)
# =============================================================================
async def get_crypto_price(symbol: str) -> Optional[Dict]:
    """Get crypto price from Binance (no auth required for public data)"""
    # Convert symbol format: BTCUSD -> BTCUSDT
    binance_symbol = symbol.replace("USD", "USDT")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://api.binance.com/api/v3/ticker/24hr",
                params={"symbol": binance_symbol}
            )
            
            if response.status_code == 200:
                data = response.json()
                current_price = Decimal(data["lastPrice"])
                previous_close = Decimal(data["prevClosePrice"])
                change_percent = Decimal(data["priceChangePercent"])
                
                return {
                    "current_price": current_price,
                    "open_price": Decimal(data["openPrice"]),
                    "high_price": Decimal(data["highPrice"]),
                    "low_price": Decimal(data["lowPrice"]),
                    "previous_close": previous_close,
                    "change_percent": change_percent,
                    "volume": int(float(data["volume"]))
                }
    except Exception as e:
        print(f"Binance API error for {symbol}: {e}")
    
    return None


# =============================================================================
# Unified Market Data Interface
# =============================================================================
async def get_quote(symbol: str, asset_type: str) -> Dict:
    """Get real-time quote for any asset type"""
    
    # Check cache first
    cached_price = get_cached_price(symbol)
    if cached_price:
        return {
            "symbol": symbol,
            "asset_type": asset_type,
            "current_price": cached_price,
            "timestamp": datetime.now(),
            "cached": True
        }
    
    quote_data = None
    
    # Get quote based on asset type
    if asset_type == "crypto":
        quote_data = await get_crypto_price(symbol)
    else:
        # Try Finnhub first for stocks/ETFs
        quote_data = await get_stock_quote_finnhub(symbol)
        
        # Fallback to yfinance if Finnhub fails
        if not quote_data:
            quote_data = get_stock_quote_yfinance(symbol)
    
    if not quote_data:
        raise ValueError(f"Unable to fetch quote for {symbol}")
    
    # Cache the price
    set_cached_price(symbol, quote_data["current_price"])
    
    # Calculate change if not provided
    if "change" not in quote_data and quote_data.get("previous_close"):
        quote_data["change"] = quote_data["current_price"] - quote_data["previous_close"]
    
    if "change_percent" not in quote_data and quote_data.get("previous_close") and quote_data["previous_close"] > 0:
        quote_data["change_percent"] = (quote_data["change"] / quote_data["previous_close"]) * 100
    
    return {
        "symbol": symbol,
        "asset_type": asset_type,
        "timestamp": datetime.now(),
        **quote_data
    }


async def search_assets(query: str) -> List[Dict]:
    """Search for assets across all types"""
    results = []
    
    # Search stocks via Finnhub
    if ENABLE_STOCKS:
        finnhub_results = await search_symbols_finnhub(query)
        results.extend(finnhub_results)
    
    # Add common crypto symbols if query matches
    if ENABLE_CRYPTO:
        crypto_symbols = {
            "BTC": "Bitcoin",
            "ETH": "Ethereum",
            "BNB": "Binance Coin",
            "SOL": "Solana",
            "ADA": "Cardano",
            "XRP": "Ripple",
            "DOT": "Polkadot",
            "DOGE": "Dogecoin",
            "AVAX": "Avalanche",
            "MATIC": "Polygon"
        }
        
        query_upper = query.upper()
        for symbol, name in crypto_symbols.items():
            if query_upper in symbol or query_upper in name.upper():
                results.append({
                    "symbol": f"{symbol}USD",
                    "name": name,
                    "asset_type": "crypto",
                    "exchange": "Binance"
                })
    
    return results[:20]  # Limit results


def get_historical_data(symbol: str, asset_type: str, period: str = "1mo") -> List[Dict]:
    """Get historical price data"""
    # For now, only using yfinance for historical data
    # Crypto historical data could be added via Binance historical endpoint
    return get_historical_data_yfinance(symbol, period)
