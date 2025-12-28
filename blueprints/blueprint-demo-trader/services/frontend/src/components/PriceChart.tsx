import { useEffect, useState, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format } from 'date-fns'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface PriceChartProps {
  symbol: string
  assetType: string
  onPriceUpdate?: (price: number) => void
  stopLoss?: number
  takeProfit?: number
  onSetStopLoss?: (price: number | undefined) => void
  onSetTakeProfit?: (price: number | undefined) => void
}

interface ChartData {
  date: string
  price: number
  displayDate: string
}

export function PriceChart({ 
  symbol, 
  assetType, 
  onPriceUpdate,
  stopLoss,
  takeProfit,
  onSetStopLoss,
  onSetTakeProfit
}: PriceChartProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [period, setPeriod] = useState<string>('1d')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [tempStopLoss, setTempStopLoss] = useState<string>('')
  const [tempTakeProfit, setTempTakeProfit] = useState<string>('')

  // Check if market is open (9:30 AM - 4:00 PM EST, Mon-Fri)
  const isMarketHours = useCallback(() => {
    const now = new Date()
    const day = now.getDay() // 0 = Sunday, 6 = Saturday
    const hour = now.getHours()
    const minute = now.getMinutes()
    
    // Weekend
    if (day === 0 || day === 6) return false
    
    // Before 9:30 AM
    if (hour < 9 || (hour === 9 && minute < 30)) return false
    
    // After 4:00 PM
    if (hour >= 16) return false
    
    return true
  }, [])

  // Fetch historical data
  useEffect(() => {
    if (!symbol) return

    const fetchChartData = async () => {
      setLoading(true)
      setError('')
      
      try {
        const response = await fetch(
          `${API_URL}/api/market/history/${symbol}?period=${period}&asset_type=${assetType}`
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch chart data')
        }

        const result = await response.json()
        
        // Check if we have valid data
        if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
          setError('No price data available for this symbol')
          setData([])
          return
        }
        
        // Transform data for recharts
        const chartData: ChartData[] = result.data.map((item: any) => ({
          date: item.date,
          price: item.close,
          displayDate: period === '1d' ? format(new Date(item.date), 'HH:mm') : format(new Date(item.date), 'MMM dd')
        }))

        setData(chartData)
        
        // Set initial live price
        if (chartData.length > 0) {
          setLivePrice(chartData[chartData.length - 1].price)
        }
      } catch (err) {
        console.error('Chart data error:', err)
        setError('Unable to load chart data')
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [symbol, assetType, period])

  // Live price updates
  useEffect(() => {
    if (!symbol || !isLive) return

    const updateInterval = isMarketHours() ? 1000 : 5000 // 1 second during market hours, 5 seconds otherwise

    const fetchLivePrice = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/market/quote/${symbol}?asset_type=${assetType}`
        )
        
        if (response.ok) {
          const quote = await response.json()
          const newPrice = quote.current_price
          
          setLivePrice(newPrice)
          
          // Notify parent component of price update
          if (onPriceUpdate) {
            onPriceUpdate(newPrice)
          }
          
          // Add to chart data if on intraday view
          if (period === '1d' && data.length > 0) {
            const now = new Date()
            const newDataPoint: ChartData = {
              date: now.toISOString(),
              price: newPrice,
              displayDate: format(now, 'HH:mm')
            }
            
            setData(prev => {
              // Limit to last 100 points for performance
              const updated = [...prev, newDataPoint]
              return updated.slice(-100)
            })
          }
        }
      } catch (err) {
        console.error('Live price update failed:', err)
      }
    }

    const interval = setInterval(fetchLivePrice, updateInterval)
    
    // Initial fetch
    fetchLivePrice()
    
    return () => clearInterval(interval)
  }, [symbol, assetType, isLive, period, data.length, onPriceUpdate, isMarketHours])

  const handleSetStopLoss = () => {
    const value = parseFloat(tempStopLoss)
    if (!isNaN(value) && value > 0) {
      onSetStopLoss?.(value)
      setTempStopLoss('')
    }
  }

  const handleSetTakeProfit = () => {
    const value = parseFloat(tempTakeProfit)
    if (!isNaN(value) && value > 0) {
      onSetTakeProfit?.(value)
      setTempTakeProfit('')
    }
  }

  if (loading && data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-700/50 rounded">
        <div className="text-slate-400">Loading chart...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-700/50 rounded">
        <div className="text-slate-400">{error}</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-700/50 rounded">
        <div className="text-slate-400">No chart data available</div>
      </div>
    )
  }

  // Safely calculate price metrics with fallbacks
  const prices = data.map(d => d.price).filter(p => p != null && !isNaN(p))
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 100
  const firstPrice = data[0]?.price || 0
  const lastPrice = data[data.length - 1]?.price || 0
  const priceChange = livePrice ? livePrice - firstPrice : lastPrice - firstPrice
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0
  const currentPrice = livePrice || lastPrice || 0

  return (
    <div className="space-y-3">
      {/* Header with price and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-xl">{symbol}</h3>
          <div className="text-2xl font-bold">${Number(currentPrice || 0).toFixed(2)}</div>
          <div className={`text-sm flex items-center gap-1 ${priceChange >= 0 ? 'text-profit' : 'text-loss'}`}>
            {priceChange >= 0 ? '+' : ''}{Number(priceChangePercent || 0).toFixed(2)}%
            {isLive && <span className="ml-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-slate-400">LIVE</span>
            </span>}
          </div>
        </div>
        
        {/* Live Toggle */}
        <button
          onClick={() => setIsLive(!isLive)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            isLive
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          {isLive ? '🔴 Live Trading' : '▶ Start Live'}
        </button>
      </div>

      {/* Period selector */}
      <div className="flex gap-1">
        {['1d', '5d', '1mo', '3mo', '6mo', '1y'].map((p) => (
          <button
            key={p}
            onClick={() => {
              setPeriod(p)
              setIsLive(false) // Disable live mode when changing period
            }}
            className={`px-2 py-1 text-xs rounded ${
              period === p
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Stop Loss / Take Profit Controls */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-700/50 rounded">
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Stop Loss</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={tempStopLoss}
              onChange={(e) => setTempStopLoss(e.target.value)}
              placeholder={stopLoss ? Number(stopLoss).toFixed(2) : 'Price'}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-red-400"
              step="0.01"
            />
            <button
              onClick={handleSetStopLoss}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
            >
              Set
            </button>
            {stopLoss && (
              <button
                onClick={() => onSetStopLoss?.(undefined)}
                className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs"
              >
                ✕
              </button>
            )}
          </div>
          {stopLoss && (
            <div className="text-xs text-red-400">Active: ${Number(stopLoss).toFixed(2)}</div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400">Take Profit</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={tempTakeProfit}
              onChange={(e) => setTempTakeProfit(e.target.value)}
              placeholder={takeProfit ? Number(takeProfit).toFixed(2) : 'Price'}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-green-400"
              step="0.01"
            />
            <button
              onClick={handleSetTakeProfit}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs"
            >
              Set
            </button>
            {takeProfit && (
              <button
                onClick={() => onSetTakeProfit?.(undefined)}
                className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs"
              >
                ✕
              </button>
            )}
          </div>
          {takeProfit && (
            <div className="text-xs text-green-400">Active: ${Number(takeProfit).toFixed(2)}</div>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={500}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="displayDate"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#9ca3af' }}
          />
          <YAxis
            domain={[minPrice * 0.98, maxPrice * 1.02]}
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#9ca3af' }}
            tickFormatter={(value) => `$${Number(value || 0).toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#fff'
            }}
            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
            labelFormatter={(label) => `Time: ${label}`}
          />
          
          {/* Stop Loss Line */}
          {stopLoss && (
            <ReferenceLine
              y={stopLoss}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ 
                value: `Stop Loss: $${Number(stopLoss).toFixed(2)}`, 
                fill: '#ef4444',
                fontSize: 12,
                position: 'right'
              }}
            />
          )}
          
          {/* Take Profit Line */}
          {takeProfit && (
            <ReferenceLine
              y={takeProfit}
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ 
                value: `Take Profit: $${Number(takeProfit).toFixed(2)}`, 
                fill: '#10b981',
                fontSize: 12,
                position: 'right'
              }}
            />
          )}
          
          {/* Price Line */}
          <Line
            type="monotone"
            dataKey="price"
            stroke={priceChange >= 0 ? '#10b981' : '#ef4444'}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex justify-between text-xs text-slate-400">
        <span>Low: ${Number(minPrice || 0).toFixed(2)}</span>
        <span>High: ${Number(maxPrice || 0).toFixed(2)}</span>
        {isMarketHours() && <span className="text-green-400">● Market Open</span>}
        {!isMarketHours() && <span className="text-slate-500">● Market Closed</span>}
      </div>
    </div>
  )
}
