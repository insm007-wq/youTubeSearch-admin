'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface UsageChartProps {
  type: 'line' | 'bar' | 'pie'
  data: any[]
  title: string
  dataKey?: string
  dataKey2?: string
  colors?: string[]
}

export default function UsageChart({
  type,
  data,
  title,
  dataKey = 'totalSearches',
  dataKey2 = 'totalUsers',
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
}: UsageChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border p-6">
        <p className="text-muted-foreground text-center py-12">{title} - 데이터 없음</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {type === 'line' && (
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ fill: colors[0], r: 4 }}
              activeDot={{ r: 6 }}
              name="검색 수"
            />
            {dataKey2 && (
              <Line
                type="monotone"
                dataKey={dataKey2}
                stroke={colors[1]}
                strokeWidth={2}
                dot={{ fill: colors[1], r: 4 }}
                activeDot={{ r: 6 }}
                name="사용자 수"
              />
            )}
          </LineChart>
        )}

        {type === 'bar' && (
          <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend />
            <Bar dataKey={dataKey} fill={colors[0]} name="검색 수" />
            {dataKey2 && <Bar dataKey={dataKey2} fill={colors[1]} name="사용자 수" />}
          </BarChart>
        )}

        {type === 'pie' && (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
