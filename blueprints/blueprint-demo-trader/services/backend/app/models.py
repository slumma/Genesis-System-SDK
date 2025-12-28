# =============================================================================
# Demo Trading Platform - Database Models
# =============================================================================

from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), nullable=False, unique=True)
    initial_balance = Column(Numeric(15, 2), nullable=False, default=Decimal('100000.00'))
    cash_balance = Column(Numeric(15, 2), nullable=False, default=Decimal('100000.00'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    holdings = relationship("Holding", back_populates="user", cascade="all, delete-orphan")
    trades = relationship("Trade", back_populates="user", cascade="all, delete-orphan")
    snapshots = relationship("PortfolioSnapshot", back_populates="user", cascade="all, delete-orphan")
    watchlist = relationship("WatchlistItem", back_populates="user", cascade="all, delete-orphan")


class Holding(Base):
    __tablename__ = "holdings"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    asset_type = Column(String(20), nullable=False)
    quantity = Column(Numeric(18, 8), nullable=False)
    average_cost = Column(Numeric(15, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="holdings")
    
    __table_args__ = (
        CheckConstraint('quantity > 0', name='check_positive_quantity'),
        CheckConstraint('average_cost >= 0', name='check_non_negative_cost'),
        CheckConstraint("asset_type IN ('stock', 'etf', 'crypto')", name='check_valid_asset_type'),
    )


class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    asset_type = Column(String(20), nullable=False)
    action = Column(String(10), nullable=False)
    quantity = Column(Numeric(18, 8), nullable=False)
    price = Column(Numeric(15, 2), nullable=False)
    total_value = Column(Numeric(15, 2), nullable=False)
    fee = Column(Numeric(15, 2), default=Decimal('0.00'))
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="trades")
    
    __table_args__ = (
        CheckConstraint('quantity > 0', name='check_trade_positive_quantity'),
        CheckConstraint('price > 0', name='check_trade_positive_price'),
        CheckConstraint("action IN ('buy', 'sell')", name='check_valid_action'),
        CheckConstraint("asset_type IN ('stock', 'etf', 'crypto')", name='check_trade_valid_asset_type'),
    )


class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    total_value = Column(Numeric(15, 2), nullable=False)
    cash_balance = Column(Numeric(15, 2), nullable=False)
    holdings_value = Column(Numeric(15, 2), nullable=False)
    snapshot_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="snapshots")


class WatchlistItem(Base):
    __tablename__ = "watchlist"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    asset_type = Column(String(20), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="watchlist")
    
    __table_args__ = (
        CheckConstraint("asset_type IN ('stock', 'etf', 'crypto')", name='check_watchlist_valid_asset_type'),
    )
