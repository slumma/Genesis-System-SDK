import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, LineChart, Activity, Search, Plus, X } from 'lucide-react'
import { PriceChart } from './components/PriceChart'

// API Base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Portfolio {
  user_id: string
  cash_balance: number
  holdings_value: number
  total_value: number
  holdings: Holding[]
  daily_change?: number
  daily_change_percent?: number
}

interface Holding {
  symbol: string
  asset_type: string
  quantity: number
  average_cost: number
  current_price?: number
  current_value?: number
  profit_loss?: number
  profit_loss_percent?: number
}

interface Trade {
  id: string
  symbol: string
  asset_type: string
  action: string
  quantity: number
  price: number
  total_value: number
  executed_at: string
}

interface SearchResult {
  symbol: string
  name: string
  asset_type: string
}

interface WatchlistItem {
  id: string
  symbol: string
  asset_type: string
  current_price?: number
  change_percent?: number
}

function App() {
  const [activeTab, setActiveTab] = useState<'trading' | 'performance'>('trading')
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')
  const [selectedAssetType, setSelectedAssetType] = useState<string>('stock')
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy')
  const [tradeQuantity, setTradeQuantity] = useState('')
  const [tradeMode, setTradeMode] = useState<'shares' | 'dollars'>('shares')
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Fetch portfolio
  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`${API_URL}/api/portfolio`)
      const data = await response.json()
      setPortfolio(data)
    } catch (error) {
      console.error('Failed to fetch portfolio:', error)
    }
  }

  // Fetch trades
  const fetchTrades = async () => {
    try {
      const response = await fetch(`${API_URL}/api/trades/history?limit=50`)
      const data = await response.json()
      setTrades(data)
    } catch (error) {
      console.error('Failed to fetch trades:', error)
    }
  }

  // Fetch watchlist
  const fetchWatchlist = async () => {
    try {
      const response = await fetch(`${API_URL}/api/watchlist`)
      const data = await response.json()
      setWatchlist(data)
    } catch (error) {
      console.error('Failed to fetch watchlist:', error)
    }
  }

  // Search assets
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 1) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/market/search?query=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  // Select symbol from search
  const selectSymbol = (result: SearchResult) => {
    setSelectedSymbol(result.symbol)
    setSelectedAssetType(result.asset_type)
    setSearchQuery('')
    setSearchResults([])
    fetchCurrentPrice(result.symbol, result.asset_type)
  }

  // Fetch current price for a symbol
  const fetchCurrentPrice = async (symbol: string, assetType: string) => {
    try {
      const response = await fetch(`${API_URL}/api/market/quote?symbol=${encodeURIComponent(symbol)}&asset_type=${assetType}`)
      const data = await response.json()
      setCurrentPrice(data.current_price || null)
    } catch (error) {
      console.error('Failed to fetch current price:', error)
      setCurrentPrice(null)
    }
  }

  // Execute trade
  const executeTrade = async () => {
    if (!selectedSymbol || !tradeQuantity || parseFloat(tradeQuantity) <= 0) {
      setMessage('Please enter a valid symbol and quantity')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Calculate quantity in shares
      let quantityInShares = parseFloat(tradeQuantity)
      if (tradeMode === 'dollars') {
        if (!currentPrice) {
          setMessage('Error: Unable to determine current price')
          setLoading(false)
          return
        }
        quantityInShares = parseFloat(tradeQuantity) / currentPrice
      }

      const response = await fetch(`${API_URL}/api/trades/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          asset_type: selectedAssetType,
          action: tradeAction,
          quantity: quantityInShares
        })
      })

      if (response.ok) {
        const resultMessage = tradeMode === 'dollars' 
          ? `${tradeAction === 'buy' ? 'Bought' : 'Sold'} $${tradeQuantity} (${quantityInShares.toFixed(4)} shares) of ${selectedSymbol}`
          : `${tradeAction === 'buy' ? 'Bought' : 'Sold'} ${tradeQuantity} shares of ${selectedSymbol}`
        setMessage(resultMessage)
        setTradeQuantity('')
        fetchPortfolio()
        fetchTrades()
      } else {
        const error = await response.json()
        setMessage(`Error: ${error.detail}`)
      }
    } catch (error) {
      setMessage('Trade failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Add to watchlist
  const addToWatchlist = async (symbol: string, asset_type: string) => {
    try {
      const response = await fetch(`${API_URL}/api/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, asset_type })
      })

      if (response.ok) {
        fetchWatchlist()
      }
    } catch (error) {
      console.error('Failed to add to watchlist:', error)
    }
  }

  // Remove from watchlist
  const removeFromWatchlist = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/watchlist/${id}`, { method: 'DELETE' })
      fetchWatchlist()
    } catch (error) {
      console.error('Failed to remove from watchlist:', error)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchPortfolio()
    fetchTrades()
    fetchWatchlist()
  }, [])

  // Auto-refresh portfolio every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPortfolio()
      fetchWatchlist()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="text-blue-400" />
              Demo Trading Platform
            </h1>
            {portfolio && (
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm text-slate-400">Portfolio Value</div>
                  <div className="text-xl font-bold">${portfolio.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400">Cash</div>
                  <div className="text-lg">${portfolio.cash_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('trading')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'trading'
                  ? 'border-b-2 border-blue-400 text-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={18} />
                Trading
              </div>
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'performance'
                  ? 'border-b-2 border-blue-400 text-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <LineChart size={18} />
                Performance
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-[calc(100vh-180px)]">
        {activeTab === 'trading' ? (
          <>
            {/* Left Sidebar - Watchlist & Search */}
            <div className="w-80 bg-slate-800 border-r border-slate-700 overflow-y-auto">
              <div className="p-4 space-y-6">
                {/* Search */}
                <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Search size={20} />
                  Search Assets
                </h2>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search stocks, ETFs, crypto..."
                    className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-2 focus:outline-none focus:border-blue-400"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded max-h-60 overflow-y-auto z-10">
                      {searchResults.map((result) => (
                        <div
                          key={result.symbol}
                          className="px-4 py-2 hover:bg-slate-600 cursor-pointer flex items-center justify-between"
                          onClick={() => selectSymbol(result)}
                        >
                          <div>
                            <div className="font-semibold">{result.symbol}</div>
                            <div className="text-sm text-slate-400">{result.name}</div>
                          </div>
                          <span className="text-xs px-2 py-1 bg-slate-800 rounded">{result.asset_type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Watchlist */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Watchlist</h2>
                <div className="space-y-2">
                  {watchlist.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-slate-700 rounded">
                      <div className="flex-1 cursor-pointer" onClick={() => {
                        setSelectedSymbol(item.symbol)
                        setSelectedAssetType(item.asset_type)
                      }}>
                        <div className="font-semibold">{item.symbol}</div>
                        {item.current_price !== undefined && item.current_price !== null && typeof item.current_price === 'number' && (
                          <div className="flex items-center gap-2 text-sm">
                            <span>${item.current_price.toFixed(2)}</span>
                            {item.change_percent !== undefined && item.change_percent !== null && typeof item.change_percent === 'number' && (
                              <span className={item.change_percent >= 0 ? 'text-profit' : 'text-loss'}>
                                {item.change_percent >= 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromWatchlist(item.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {watchlist.length === 0 && (
                    <div className="text-slate-400 text-center py-4">No symbols in watchlist</div>
                  )}
                </div>
              </div>
              </div>
            </div>

            {/* Middle Column - Trade Panel */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-slate-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Trade</h2>
                
                {selectedSymbol && (
                  <>
                    <div className="mb-4 p-3 bg-slate-700 rounded flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xl">{selectedSymbol}</div>
                        <div className="text-sm text-slate-400 capitalize">{selectedAssetType}</div>
                      </div>
                      <button
                        onClick={() => addToWatchlist(selectedSymbol, selectedAssetType)}
                        className="text-sm px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded"
                      >
                        <Plus size={16} className="inline" /> Watch
                      </button>
                    </div>
                    
                    {/* Price Chart */}
                    <div className="mb-4 p-4 bg-slate-700/50 rounded">
                      <PriceChart symbol={selectedSymbol} assetType={selectedAssetType} />
                    </div>
                  </>
                )}

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTradeAction('buy')}
                      className={`flex-1 py-3 rounded font-semibold transition-colors ${
                        tradeAction === 'buy'
                          ? 'bg-profit text-white'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => setTradeAction('sell')}
                      className={`flex-1 py-3 rounded font-semibold transition-colors ${
                        tradeAction === 'sell'
                          ? 'bg-loss text-white'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      Sell
                    </button>
                  </div>

                  {/* Trade Mode Toggle */}
                  <div className="flex gap-2 p-1 bg-slate-700 rounded">
                    <button
                      onClick={() => setTradeMode('shares')}
                      className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                        tradeMode === 'shares'
                          ? 'bg-blue-500 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Shares
                    </button>
                    <button
                      onClick={() => setTradeMode('dollars')}
                      className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                        tradeMode === 'dollars'
                          ? 'bg-blue-500 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Dollars
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      {tradeMode === 'shares' ? 'Shares' : 'Amount ($)'}
                    </label>
                    <input
                      type="number"
                      value={tradeQuantity}
                      onChange={(e) => setTradeQuantity(e.target.value)}
                      placeholder={tradeMode === 'shares' ? 'Enter shares quantity' : 'Enter dollar amount'}
                      min="0"
                      step={tradeMode === 'shares' ? '0.01' : '1'}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-2 focus:outline-none focus:border-blue-400"
                    />
                    {tradeMode === 'dollars' && currentPrice && tradeQuantity && (
                      <div className="text-xs text-slate-400 mt-1">
                        ≈ {(parseFloat(tradeQuantity) / currentPrice).toFixed(4)} shares
                      </div>
                    )}
                  </div>

                  <button
                    onClick={executeTrade}
                    disabled={loading || !selectedSymbol || !tradeQuantity}
                    className={`w-full py-3 rounded font-semibold ${
                      loading || !selectedSymbol || !tradeQuantity
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : tradeAction === 'buy'
                        ? 'bg-profit hover:bg-green-600 text-white'
                        : 'bg-loss hover:bg-red-600 text-white'
                    }`}
                  >
                    {loading ? 'Processing...' : `${tradeAction === 'buy' ? 'Buy' : 'Sell'} ${selectedSymbol || ''}`}
                  </button>

                  {message && (
                    <div className={`p-3 rounded text-sm ${
                      message.includes('Error') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'
                    }`}>
                      {message}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Holdings */}
            <div className="w-80 overflow-y-auto p-4">
              <div className="bg-slate-800 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign size={20} />
                  Holdings
                </h2>
                <div className="space-y-2">
                  {portfolio?.holdings && portfolio.holdings.length > 0 ? portfolio.holdings.map((holding) => {
                    const profitLoss = holding.profit_loss !== null && holding.profit_loss !== undefined ? Number(holding.profit_loss) : 0
                    const currentValue = holding.current_value !== null && holding.current_value !== undefined ? Number(holding.current_value) : 0
                    const currentPrice = holding.current_price !== null && holding.current_price !== undefined ? Number(holding.current_price) : 0
                    const quantity = holding.quantity !== null && holding.quantity !== undefined ? Number(holding.quantity) : 0
                    const avgCost = holding.average_cost !== null && holding.average_cost !== undefined ? Number(holding.average_cost) : 0
                    
                    return (
                    <div key={holding.symbol} className="p-3 bg-slate-700 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{holding.symbol || 'Unknown'}</span>
                        <span className={profitLoss >= 0 ? 'text-profit' : 'text-loss'}>
                          {profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 flex justify-between">
                        <span>{quantity.toFixed(4)} shares</span>
                        <span>${currentValue.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Avg: ${avgCost.toFixed(2)} | Now: ${currentPrice.toFixed(2)}
                      </div>
                    </div>
                  )}) : null}
                  {portfolio?.holdings.length === 0 && (
                    <div className="text-slate-400 text-center py-4">No holdings yet</div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Performance Tab */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">Total Value</div>
                <div className="text-3xl font-bold">${portfolio?.total_value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
                {portfolio?.daily_change !== null && portfolio?.daily_change !== undefined && (
                  <div className={`text-sm mt-2 flex items-center gap-1 ${portfolio.daily_change >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {portfolio.daily_change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {portfolio.daily_change >= 0 ? '+' : ''}${portfolio.daily_change.toFixed(2)} ({portfolio.daily_change_percent?.toFixed(2)}%) today
                  </div>
                )}
              </div>
              
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">Cash Balance</div>
                <div className="text-3xl font-bold">${portfolio?.cash_balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">Holdings Value</div>
                <div className="text-3xl font-bold">${portfolio?.holdings_value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
              </div>
            </div>

            {/* Trade History */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Trades</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Symbol</th>
                      <th className="pb-2">Action</th>
                      <th className="pb-2">Quantity</th>
                      <th className="pb-2">Price</th>
                      <th className="pb-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => {
                      const price = Number(trade.price) || 0
                      const totalValue = Number(trade.total_value) || 0
                      const quantity = Number(trade.quantity) || 0
                      
                      return (
                      <tr key={trade.id} className="border-b border-slate-700/50">
                        <td className="py-3 text-sm">{new Date(trade.executed_at).toLocaleString()}</td>
                        <td className="py-3 font-semibold">{trade.symbol}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            trade.action === 'buy' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
                          }`}>
                            {trade.action.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3">{quantity.toFixed(4)}</td>
                        <td className="py-3">${price.toFixed(2)}</td>
                        <td className="py-3 font-semibold">${totalValue.toFixed(2)}</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
                {trades.length === 0 && (
                  <div className="text-slate-400 text-center py-8">No trades yet</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
