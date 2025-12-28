import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface PriceChartProps {
  symbol: string
  assetType: string
}

interface ChartData {
  date: string
  price: number
  displayDate: string
}

export function PriceChart({ symbol, assetType }: PriceChartProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [period, setPeriod] = useState<string>('1mo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

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
        
        // Transform data for recharts - API returns {symbol, period, data: [...]}
        const chartData: ChartData[] = result.data.map((item: any) => ({
          date: item.date,
          price: item.close,
          displayDate: format(new Date(item.date), 'MMM dd')
        }))

        setData(chartData)
      } catch (err) {
        console.error('Chart data error:', err)
        setError('Unable to load chart data')
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [symbol, assetType, period])

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

  const minPrice = Math.min(...data.map(d => d.price))
  const maxPrice = Math.max(...data.map(d => d.price))
  const priceChange = data[data.length - 1].price - data[0].price
  const priceChangePercent = (priceChange / data[0].price) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">{symbol}</h3>
          <div className={`text-sm ${priceChange >= 0 ? 'text-profit' : 'text-loss'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
          </div>
        </div>
        
        <div className="flex gap-1">
          {['1d', '5d', '1mo', '3mo', '6mo', '1y'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
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
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
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
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#fff'
            }}
            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
            labelFormatter={(label) => `Date: ${label}`}
          />
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
        <span>Low: ${minPrice.toFixed(2)}</span>
        <span>High: ${maxPrice.toFixed(2)}</span>
      </div>
    </div>
  )
}
