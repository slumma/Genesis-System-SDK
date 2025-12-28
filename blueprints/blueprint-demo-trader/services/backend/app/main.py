# =============================================================================
# Demo Trading Platform - FastAPI Backend
# =============================================================================
# Production-ready API following GSS patterns
# =============================================================================

import os
import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict
from uuid import UUID
import asyncio

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy import create_engine, func, and_, or_
from sqlalchemy.orm import sessionmaker, joinedload
from sqlalchemy.pool import NullPool

from app.models import Base, User, Holding, Trade, PortfolioSnapshot, WatchlistItem
from app.schemas import (
    TradeRequest, TradeResponse, PortfolioResponse, PortfolioHolding,
    QuoteResponse, SearchResult, HistoricalDataResponse, HistoricalDataPoint,
    PerformanceMetrics, PerformanceResponse, PortfolioValuePoint,
    WatchlistAddRequest, WatchlistItemResponse, UserResponse
)
from app.market_data import get_quote, search_assets, get_historical_data

# =============================================================================
# CONFIGURATION
# =============================================================================
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://traderuser:localdevpass123@postgres:5432/tradingdb")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
TRADING_FEE_PERCENT = Decimal(os.getenv("TRADING_FEE_PERCENT", "0.0"))
DEFAULT_USER = "demo_trader"

# =============================================================================
# DATABASE SETUP
# =============================================================================
engine = create_engine(DATABASE_URL, poolclass=NullPool)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# =============================================================================
# FASTAPI APP
# =============================================================================
app = FastAPI(
    title="Demo Trading Platform API",
    version="1.0.0",
    description="Paper trading platform with real market data"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in ALLOWED_ORIGINS else ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================
def get_default_user(db):
    """Get or create default user"""
    user = db.query(User).filter(User.username == DEFAULT_USER).first()
    if not user:
        user = User(username=DEFAULT_USER)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def calculate_portfolio_value(user: User, db) -> Decimal:
    """Calculate current total portfolio value"""
    total = Decimal(str(user.cash_balance))
    
    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()
    
    for holding in holdings:
        try:
            # Get current price (sync version for internal use)
            quote = asyncio.get_event_loop().run_until_complete(
                get_quote(holding.symbol, holding.asset_type)
            )
            value = Decimal(str(holding.quantity)) * quote["current_price"]
            total += value
        except Exception as e:
            print(f"Error calculating value for {holding.symbol}: {e}")
            # Use average cost as fallback
            total += Decimal(str(holding.quantity)) * Decimal(str(holding.average_cost))
    
    return total


async def execute_trade(trade_request: TradeRequest, db) -> Trade:
    """Execute a buy or sell trade"""
    user = get_default_user(db)
    
    # Get current market price
    quote = await get_quote(trade_request.symbol, trade_request.asset_type)
    current_price = quote["current_price"]
    
    # Calculate total value
    quantity = Decimal(str(trade_request.quantity))
    total_value = current_price * quantity
    fee = total_value * TRADING_FEE_PERCENT
    total_cost = total_value + fee
    
    if trade_request.action == "buy":
        # Check if user has enough cash
        if user.cash_balance < total_cost:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient funds. Need ${total_cost:.2f}, have ${user.cash_balance:.2f}"
            )
        
        # Deduct cash
        user.cash_balance -= total_cost
        
        # Update or create holding
        holding = db.query(Holding).filter(
            and_(Holding.user_id == user.id, Holding.symbol == trade_request.symbol)
        ).first()
        
        if holding:
            # Update average cost
            total_quantity = Decimal(str(holding.quantity)) + quantity
            total_cost_basis = (Decimal(str(holding.quantity)) * Decimal(str(holding.average_cost))) + total_value
            holding.average_cost = total_cost_basis / total_quantity
            holding.quantity = total_quantity
        else:
            # Create new holding
            holding = Holding(
                user_id=user.id,
                symbol=trade_request.symbol,
                asset_type=trade_request.asset_type,
                quantity=quantity,
                average_cost=current_price
            )
            db.add(holding)
    
    else:  # sell
        # Check if user has enough quantity
        holding = db.query(Holding).filter(
            and_(Holding.user_id == user.id, Holding.symbol == trade_request.symbol)
        ).first()
        
        if not holding or Decimal(str(holding.quantity)) < quantity:
            available = Decimal(str(holding.quantity)) if holding else Decimal("0")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient holdings. Need {quantity}, have {available}"
            )
        
        # Add cash (minus fee)
        user.cash_balance += (total_value - fee)
        
        # Update holding
        holding.quantity -= quantity
        
        # Remove holding if quantity is zero
        if Decimal(str(holding.quantity)) <= Decimal("0.00000001"):
            db.delete(holding)
    
    # Create trade record
    trade = Trade(
        user_id=user.id,
        symbol=trade_request.symbol,
        asset_type=trade_request.asset_type,
        action=trade_request.action,
        quantity=quantity,
        price=current_price,
        total_value=total_value,
        fee=fee
    )
    db.add(trade)
    
    db.commit()
    db.refresh(trade)
    
    return trade


# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "trading-platform",
        "version": "1.0.0"
    }


@app.get("/api/user", response_model=UserResponse)
async def get_user():
    """Get current user info"""
    db = SessionLocal()
    try:
        user = get_default_user(db)
        return user
    finally:
        db.close()


# =============================================================================
# MARKET DATA ENDPOINTS
# =============================================================================

@app.get("/api/market/search", response_model=List[SearchResult])
async def search_symbols(query: str):
    """Search for stocks, ETFs, and crypto"""
    if not query or len(query) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query must be at least 1 character"
        )
    
    results = await search_assets(query)
    return results


@app.get("/api/market/quote/{symbol}", response_model=QuoteResponse)
async def get_symbol_quote(symbol: str, asset_type: str = "stock"):
    """Get real-time quote for a symbol"""
    try:
        quote = await get_quote(symbol.upper(), asset_type)
        return quote
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unable to fetch quote: {str(e)}"
        )


@app.get("/api/market/history/{symbol}", response_model=HistoricalDataResponse)
async def get_symbol_history(symbol: str, asset_type: str = "stock", period: str = "1mo"):
    """Get historical price data"""
    try:
        data = get_historical_data(symbol.upper(), asset_type, period)
        
        return HistoricalDataResponse(
            symbol=symbol.upper(),
            period=period,
            data=[HistoricalDataPoint(**point) for point in data]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unable to fetch historical data: {str(e)}"
        )


# =============================================================================
# TRADING ENDPOINTS
# =============================================================================

@app.post("/api/trades/execute", response_model=TradeResponse, status_code=status.HTTP_201_CREATED)
async def create_trade(trade_request: TradeRequest):
    """Execute a buy or sell trade"""
    db = SessionLocal()
    try:
        trade = await execute_trade(trade_request, db)
        return trade
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Trade execution failed: {str(e)}"
        )
    finally:
        db.close()


@app.get("/api/trades/history", response_model=List[TradeResponse])
async def get_trade_history(limit: int = 100, offset: int = 0):
    """Get trade history"""
    db = SessionLocal()
    try:
        user = get_default_user(db)
        
        trades = db.query(Trade)\
            .filter(Trade.user_id == user.id)\
            .order_by(Trade.executed_at.desc())\
            .offset(offset)\
            .limit(limit)\
            .all()
        
        return trades
    finally:
        db.close()


# =============================================================================
# PORTFOLIO ENDPOINTS
# =============================================================================

@app.get("/api/portfolio", response_model=PortfolioResponse)
async def get_portfolio():
    """Get current portfolio with real-time values"""
    db = SessionLocal()
    try:
        user = get_default_user(db)
        
        holdings = db.query(Holding).filter(Holding.user_id == user.id).all()
        
        portfolio_holdings = []
        holdings_value = Decimal("0")
        
        for holding in holdings:
            try:
                quote = await get_quote(holding.symbol, holding.asset_type)
                current_price = quote["current_price"]
                quantity = Decimal(str(holding.quantity))
                average_cost = Decimal(str(holding.average_cost))
                
                current_value = current_price * quantity
                cost_basis = average_cost * quantity
                profit_loss = current_value - cost_basis
                profit_loss_percent = (profit_loss / cost_basis * 100) if cost_basis > 0 else Decimal("0")
                
                holdings_value += current_value
                
                portfolio_holdings.append(PortfolioHolding(
                    symbol=holding.symbol,
                    asset_type=holding.asset_type,
                    quantity=quantity,
                    average_cost=average_cost,
                    current_price=current_price,
                    current_value=current_value,
                    profit_loss=profit_loss,
                    profit_loss_percent=profit_loss_percent
                ))
            except Exception as e:
                print(f"Error fetching quote for {holding.symbol}: {e}")
                continue
        
        cash_balance = Decimal(str(user.cash_balance))
        total_value = cash_balance + holdings_value
        
        # Calculate daily change (if we have a snapshot from yesterday)
        yesterday = datetime.now().date() - timedelta(days=1)
        yesterday_snapshot = db.query(PortfolioSnapshot)\
            .filter(and_(
                PortfolioSnapshot.user_id == user.id,
                func.date(PortfolioSnapshot.snapshot_date) == yesterday
            ))\
            .first()
        
        daily_change = None
        daily_change_percent = None
        
        if yesterday_snapshot:
            prev_value = Decimal(str(yesterday_snapshot.total_value))
            daily_change = total_value - prev_value
            daily_change_percent = (daily_change / prev_value * 100) if prev_value > 0 else Decimal("0")
        
        return PortfolioResponse(
            user_id=user.id,
            cash_balance=cash_balance,
            holdings_value=holdings_value,
            total_value=total_value,
            holdings=portfolio_holdings,
            daily_change=daily_change,
            daily_change_percent=daily_change_percent
        )
    finally:
        db.close()


@app.get("/api/portfolio/value-history", response_model=List[PortfolioValuePoint])
async def get_portfolio_value_history(period: str = "1M"):
    """Get portfolio value over time"""
    db = SessionLocal()
    try:
        user = get_default_user(db)
        
        # Calculate date range based on period
        end_date = datetime.now()
        if period == "1D":
            start_date = end_date - timedelta(days=1)
        elif period == "1W":
            start_date = end_date - timedelta(weeks=1)
        elif period == "1M":
            start_date = end_date - timedelta(days=30)
        elif period == "3M":
            start_date = end_date - timedelta(days=90)
        elif period == "1Y":
            start_date = end_date - timedelta(days=365)
        elif period == "YTD":
            start_date = datetime(end_date.year, 1, 1)
        else:  # ALL
            start_date = user.created_at
        
        snapshots = db.query(PortfolioSnapshot)\
            .filter(and_(
                PortfolioSnapshot.user_id == user.id,
                PortfolioSnapshot.snapshot_date >= start_date
            ))\
            .order_by(PortfolioSnapshot.snapshot_date)\
            .all()
        
        # Include current value as the latest point
        current_value = calculate_portfolio_value(user, db)
        
        value_points = [
            PortfolioValuePoint(
                date=snapshot.snapshot_date,
                value=Decimal(str(snapshot.total_value))
            )
            for snapshot in snapshots
        ]
        
        # Add current value
        value_points.append(PortfolioValuePoint(
            date=datetime.now(),
            value=current_value
        ))
        
        return value_points
    finally:
        db.close()


# =============================================================================
# PERFORMANCE ENDPOINTS
# =============================================================================

@app.get("/api/performance/metrics", response_model=PerformanceResponse)
async def get_performance_metrics():
    """Get performance metrics for different time periods"""
    db = SessionLocal()
    try:
        user = get_default_user(db)
        current_value = calculate_portfolio_value(user, db)
        now = datetime.now()
        
        metrics = {}
        
        # Define periods
        periods = {
            "daily": timedelta(days=1),
            "weekly": timedelta(weeks=1),
            "monthly": timedelta(days=30),
            "yearly": timedelta(days=365),
        }
        
        for period_name, delta in periods.items():
            start_date = now - delta
            
            snapshot = db.query(PortfolioSnapshot)\
                .filter(and_(
                    PortfolioSnapshot.user_id == user.id,
                    PortfolioSnapshot.snapshot_date >= start_date
                ))\
                .order_by(PortfolioSnapshot.snapshot_date)\
                .first()
            
            if snapshot:
                start_value = Decimal(str(snapshot.total_value))
                absolute_return = current_value - start_value
                percent_return = (absolute_return / start_value * 100) if start_value > 0 else Decimal("0")
                
                metrics[period_name] = PerformanceMetrics(
                    period=period_name,
                    start_value=start_value,
                    end_value=current_value,
                    absolute_return=absolute_return,
                    percent_return=percent_return,
                    start_date=snapshot.snapshot_date,
                    end_date=now
                )
        
        # YTD
        ytd_start = datetime(now.year, 1, 1)
        ytd_snapshot = db.query(PortfolioSnapshot)\
            .filter(and_(
                PortfolioSnapshot.user_id == user.id,
                PortfolioSnapshot.snapshot_date >= ytd_start
            ))\
            .order_by(PortfolioSnapshot.snapshot_date)\
            .first()
        
        if ytd_snapshot:
            start_value = Decimal(str(ytd_snapshot.total_value))
            absolute_return = current_value - start_value
            percent_return = (absolute_return / start_value * 100) if start_value > 0 else Decimal("0")
            
            metrics["ytd"] = PerformanceMetrics(
                period="ytd",
                start_value=start_value,
                end_value=current_value,
                absolute_return=absolute_return,
                percent_return=percent_return,
                start_date=ytd_snapshot.snapshot_date,
                end_date=now
            )
        
        # All time
        initial_balance = Decimal(str(user.initial_balance))
        all_time_return = current_value - initial_balance
        all_time_percent = (all_time_return / initial_balance * 100) if initial_balance > 0 else Decimal("0")
        
        metrics["all_time"] = PerformanceMetrics(
            period="all_time",
            start_value=initial_balance,
            end_value=current_value,
            absolute_return=all_time_return,
            percent_return=all_time_percent,
            start_date=user.created_at,
            end_date=now
        )
        
        return PerformanceResponse(**metrics)
    finally:
        db.close()


# =============================================================================
# WATCHLIST ENDPOINTS
# =============================================================================

@app.get("/api/watchlist", response_model=List[WatchlistItemResponse])
async def get_watchlist():
    """Get user's watchlist with current prices"""
    db = SessionLocal()
    try:
        user = get_default_user(db)
        
        watchlist_items = db.query(WatchlistItem)\
            .filter(WatchlistItem.user_id == user.id)\
            .order_by(WatchlistItem.added_at.desc())\
            .all()
        
        result = []
        for item in watchlist_items:
            try:
                quote = await get_quote(item.symbol, item.asset_type)
                result.append(WatchlistItemResponse(
                    id=item.id,
                    symbol=item.symbol,
                    asset_type=item.asset_type,
                    added_at=item.added_at,
                    current_price=quote.get("current_price"),
                    change_percent=quote.get("change_percent")
                ))
            except Exception as e:
                print(f"Error fetching quote for {item.symbol}: {e}")
                result.append(WatchlistItemResponse(
                    id=item.id,
                    symbol=item.symbol,
                    asset_type=item.asset_type,
                    added_at=item.added_at
                ))
        
        return result
    finally:
        db.close()


@app.post("/api/watchlist", response_model=WatchlistItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(request: WatchlistAddRequest):
    """Add symbol to watchlist"""
    db = SessionLocal()
    try:
        user = get_default_user(db)
        
        # Check if already in watchlist
        existing = db.query(WatchlistItem)\
            .filter(and_(
                WatchlistItem.user_id == user.id,
                WatchlistItem.symbol == request.symbol
            ))\
            .first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Symbol already in watchlist"
            )
        
        item = WatchlistItem(
            user_id=user.id,
            symbol=request.symbol,
            asset_type=request.asset_type
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        
        return WatchlistItemResponse(
            id=item.id,
            symbol=item.symbol,
            asset_type=item.asset_type,
            added_at=item.added_at
        )
    finally:
        db.close()


@app.delete("/api/watchlist/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(item_id: UUID):
    """Remove symbol from watchlist"""
    db = SessionLocal()
    try:
        user = get_default_user(db)
        
        item = db.query(WatchlistItem)\
            .filter(and_(
                WatchlistItem.id == item_id,
                WatchlistItem.user_id == user.id
            ))\
            .first()
        
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Watchlist item not found"
            )
        
        db.delete(item)
        db.commit()
    finally:
        db.close()


# =============================================================================
# WEBSOCKET FOR REAL-TIME PRICE UPDATES
# =============================================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[WebSocket, set] = {}
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = set()
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]
    
    def subscribe(self, websocket: WebSocket, symbols: List[str]):
        if websocket in self.subscriptions:
            self.subscriptions[websocket].update(symbols)
    
    def unsubscribe(self, websocket: WebSocket, symbols: List[str]):
        if websocket in self.subscriptions:
            self.subscriptions[websocket].difference_update(symbols)
    
    async def broadcast_price_update(self, symbol: str, data: dict):
        for connection in self.active_connections:
            if symbol in self.subscriptions.get(connection, set()):
                try:
                    await connection.send_json(data)
                except Exception:
                    pass


manager = ConnectionManager()


@app.websocket("/ws/prices")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "subscribe":
                symbols = data.get("symbols", [])
                manager.subscribe(websocket, symbols)
                await websocket.send_json({"type": "subscribed", "symbols": symbols})
            
            elif data.get("type") == "unsubscribe":
                symbols = data.get("symbols", [])
                manager.unsubscribe(websocket, symbols)
                await websocket.send_json({"type": "unsubscribed", "symbols": symbols})
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


# =============================================================================
# STARTUP EVENT
# =============================================================================
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables initialized")
    print("✓ Trading Platform API ready")
