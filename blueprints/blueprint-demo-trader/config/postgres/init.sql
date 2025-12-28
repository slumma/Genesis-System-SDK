-- =============================================================================
-- Demo Trading Platform - Database Schema
-- =============================================================================
-- PostgreSQL 16 | Production-ready schema with indexes and constraints
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 100000.00,
    cash_balance DECIMAL(15, 2) NOT NULL DEFAULT 100000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create default user for demo
INSERT INTO users (username, initial_balance, cash_balance)
VALUES ('demo_trader', 100000.00, 100000.00)
ON CONFLICT (username) DO NOTHING;

-- =============================================================================
-- HOLDINGS TABLE - Current positions
-- =============================================================================
CREATE TABLE IF NOT EXISTS holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'etf', 'crypto')),
    quantity DECIMAL(18, 8) NOT NULL CHECK (quantity > 0),
    average_cost DECIMAL(15, 2) NOT NULL CHECK (average_cost >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, symbol)
);

CREATE INDEX idx_holdings_user_id ON holdings(user_id);
CREATE INDEX idx_holdings_symbol ON holdings(symbol);

-- =============================================================================
-- TRADES TABLE - Historical trade records
-- =============================================================================
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'etf', 'crypto')),
    action VARCHAR(10) NOT NULL CHECK (action IN ('buy', 'sell')),
    quantity DECIMAL(18, 8) NOT NULL CHECK (quantity > 0),
    price DECIMAL(15, 2) NOT NULL CHECK (price > 0),
    total_value DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(15, 2) DEFAULT 0.00,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_executed_at ON trades(executed_at DESC);

-- =============================================================================
-- PORTFOLIO_SNAPSHOTS TABLE - Daily portfolio value tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_value DECIMAL(15, 2) NOT NULL,
    cash_balance DECIMAL(15, 2) NOT NULL,
    holdings_value DECIMAL(15, 2) NOT NULL,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_portfolio_snapshots_user_id ON portfolio_snapshots(user_id);
CREATE INDEX idx_portfolio_snapshots_date ON portfolio_snapshots(snapshot_date DESC);

-- =============================================================================
-- WATCHLIST TABLE - User's favorite symbols
-- =============================================================================
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'etf', 'crypto')),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, symbol)
);

CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply update trigger to holdings table
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON holdings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SAMPLE WATCHLIST (Optional - for demo purposes)
-- =============================================================================
DO $$
DECLARE
    demo_user_id UUID;
BEGIN
    SELECT id INTO demo_user_id FROM users WHERE username = 'demo_trader' LIMIT 1;
    
    IF demo_user_id IS NOT NULL THEN
        INSERT INTO watchlist (user_id, symbol, asset_type) VALUES
            (demo_user_id, 'AAPL', 'stock'),
            (demo_user_id, 'MSFT', 'stock'),
            (demo_user_id, 'TSLA', 'stock'),
            (demo_user_id, 'SPY', 'etf'),
            (demo_user_id, 'QQQ', 'etf'),
            (demo_user_id, 'BTCUSD', 'crypto'),
            (demo_user_id, 'ETHUSD', 'crypto')
        ON CONFLICT (user_id, symbol) DO NOTHING;
    END IF;
END $$;
