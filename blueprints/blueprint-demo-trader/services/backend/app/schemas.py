# =============================================================================
# Demo Trading Platform - Pydantic Schemas
# =============================================================================

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


# =============================================================================
# User Schemas
# =============================================================================
class UserResponse(BaseModel):
    id: UUID
    username: str
    initial_balance: Decimal
    cash_balance: Decimal
    created_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# Holding Schemas
# =============================================================================
class HoldingResponse(BaseModel):
    id: UUID
    symbol: str
    asset_type: str
    quantity: Decimal
    average_cost: Decimal
    updated_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# Trade Schemas
# =============================================================================
class TradeRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    asset_type: str = Field(..., pattern="^(stock|etf|crypto)$")
    action: str = Field(..., pattern="^(buy|sell)$")
    quantity: Decimal = Field(..., gt=0)
    
    @field_validator('symbol')
    @classmethod
    def uppercase_symbol(cls, v: str) -> str:
        return v.upper().strip()


class TradeResponse(BaseModel):
    id: UUID
    symbol: str
    asset_type: str
    action: str
    quantity: Decimal
    price: Decimal
    total_value: Decimal
    fee: Decimal
    executed_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# Portfolio Schemas
# =============================================================================
class PortfolioHolding(BaseModel):
    symbol: str
    asset_type: str
    quantity: Decimal
    average_cost: Decimal
    current_price: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    profit_loss: Optional[Decimal] = None
    profit_loss_percent: Optional[Decimal] = None


class PortfolioResponse(BaseModel):
    user_id: UUID
    cash_balance: Decimal
    holdings_value: Decimal
    total_value: Decimal
    holdings: List[PortfolioHolding]
    daily_change: Optional[Decimal] = None
    daily_change_percent: Optional[Decimal] = None


class PortfolioSnapshotResponse(BaseModel):
    snapshot_date: datetime
    total_value: Decimal
    cash_balance: Decimal
    holdings_value: Decimal
    
    class Config:
        from_attributes = True


# =============================================================================
# Market Data Schemas
# =============================================================================
class QuoteResponse(BaseModel):
    symbol: str
    asset_type: str
    current_price: Decimal
    open_price: Optional[Decimal] = None
    high_price: Optional[Decimal] = None
    low_price: Optional[Decimal] = None
    previous_close: Optional[Decimal] = None
    change: Optional[Decimal] = None
    change_percent: Optional[Decimal] = None
    volume: Optional[int] = None
    timestamp: datetime


class SearchResult(BaseModel):
    symbol: str
    name: str
    asset_type: str
    exchange: Optional[str] = None


class HistoricalDataPoint(BaseModel):
    date: str  # Changed from timestamp to match yfinance data format
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: int


class HistoricalDataResponse(BaseModel):
    symbol: str
    period: str
    data: List[HistoricalDataPoint]


# =============================================================================
# Performance Schemas
# =============================================================================
class PerformanceMetrics(BaseModel):
    period: str
    start_value: Decimal
    end_value: Decimal
    absolute_return: Decimal
    percent_return: Decimal
    start_date: datetime
    end_date: datetime


class PerformanceResponse(BaseModel):
    daily: Optional[PerformanceMetrics] = None
    weekly: Optional[PerformanceMetrics] = None
    monthly: Optional[PerformanceMetrics] = None
    yearly: Optional[PerformanceMetrics] = None
    ytd: Optional[PerformanceMetrics] = None
    all_time: Optional[PerformanceMetrics] = None


class PortfolioValuePoint(BaseModel):
    date: datetime
    value: Decimal


# =============================================================================
# Watchlist Schemas
# =============================================================================
class WatchlistAddRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    asset_type: str = Field(..., pattern="^(stock|etf|crypto)$")
    
    @field_validator('symbol')
    @classmethod
    def uppercase_symbol(cls, v: str) -> str:
        return v.upper().strip()


class WatchlistItemResponse(BaseModel):
    id: UUID
    symbol: str
    asset_type: str
    added_at: datetime
    current_price: Optional[Decimal] = None
    change_percent: Optional[Decimal] = None
    
    class Config:
        from_attributes = True


# =============================================================================
# WebSocket Schemas
# =============================================================================
class PriceUpdate(BaseModel):
    symbol: str
    price: Decimal
    change_percent: Optional[Decimal] = None
    timestamp: datetime


class WebSocketMessage(BaseModel):
    type: str  # 'subscribe', 'unsubscribe', 'price_update', 'error'
    data: dict
