'use client'

import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  subLabel?: string
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: string
}

export default function StatsCard({
  icon,
  label,
  value,
  subLabel,
  subValue,
  trend,
  trendValue,
  color = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
}: StatsCardProps) {
  const trendColor = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subLabel && (
            <p className="text-xs text-muted-foreground mt-2">
              {subLabel}: <span className="font-semibold">{subValue}</span>
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      </div>
      {trend && trendValue && (
        <div className={`text-sm font-medium ${trendColor[trend]}`}>
          {trend === 'up' && '↑'} {trend === 'down' && '↓'} {trendValue}
        </div>
      )}
    </div>
  )
}
