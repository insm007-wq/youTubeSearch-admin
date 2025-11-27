'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Users, Search, AlertCircle, Zap } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import StatsCard from '@/app/components/StatsCard'
import UsageChart from '@/app/components/UsageChart'

interface StatsData {
  today: {
    date: string
    totalSearches: number
    totalUsers: number
    avgPerUser: number
    limit: number
  }
  daily: Array<{
    date: string
    totalSearches: number
    totalUsers: number
    avgPerUser: number
  }>
  users: {
    active: number
    inactive: number
    banned: number
    totalUsers: number
    totalRemainingQuota: number
    avgDailyLimit: number
  }
  topUsers: Array<{
    email: string
    totalSearches: number
    dailyLimit: number
    remainingLimit: number
    isActive: boolean
  }>
  quotaDistribution: {
    veryLow: number
    low: number
    medium: number
    high: number
  }
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/stats')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '통계를 불러오는데 실패했습니다')
      }

      setStats(data.data)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(errorMsg)
      toast.error('통계 로드 실패', { description: errorMsg })
    } finally {
      setIsLoading(false)
    }
  }

  if (!stats && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-muted-foreground">통계를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-muted-foreground">통계 데이터를 불러올 수 없습니다</p>
        </div>
      </div>
    )
  }

  // 할당량 분포 데이터 준비
  const quotaDistributionData = [
    { name: '0-25% 사용', value: stats.quotaDistribution.veryLow },
    { name: '25-50% 사용', value: stats.quotaDistribution.low },
    { name: '50-75% 사용', value: stats.quotaDistribution.medium },
    { name: '75-100% 사용', value: stats.quotaDistribution.high },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* 헤더 */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                돌아가기
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">API 사용량 통계</h1>
            <p className="text-muted-foreground">실시간 사용량 분석 및 트렌드</p>
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* 에러 배너 */}
        {error && (
          <Alert variant="destructive" className="animate-in fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setError('')}
            >
              닫기
            </Button>
          </Alert>
        )}

        {/* 오늘의 통계 */}
        <div>
          <h2 className="text-xl font-bold mb-4">오늘의 통계</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              icon={<Search className="w-6 h-6" />}
              label="총 검색 수"
              value={stats.today.totalSearches}
              subLabel="기본 할당량"
              subValue={stats.today.limit.toString()}
              color="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            />
            <StatsCard
              icon={<Users className="w-6 h-6" />}
              label="활성 사용자"
              value={stats.today.totalUsers}
              subLabel="평균/사용자"
              subValue={stats.today.avgPerUser.toFixed(1)}
              color="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            />
            <StatsCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="할당량 활용"
              value={`${stats.users.totalUsers}명`}
              subLabel="전체 사용자"
              subValue={`${stats.users.active}명 활성`}
              color="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
            />
            <StatsCard
              icon={<Zap className="w-6 h-6" />}
              label="잔여 할당량"
              value={stats.users.totalRemainingQuota}
              subLabel="평균 할당"
              subValue={stats.users.avgDailyLimit.toString()}
              color="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
            />
          </div>
        </div>

        {/* 사용자 통계 */}
        <div>
          <h2 className="text-xl font-bold mb-4">사용자 통계</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 rounded-lg border p-4">
              <p className="text-sm text-muted-foreground mb-2">활성 사용자</p>
              <p className="text-2xl font-bold">{stats.users.active}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">🟢 활성</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-lg border p-4">
              <p className="text-sm text-muted-foreground mb-2">비활성 사용자</p>
              <p className="text-2xl font-bold">{stats.users.inactive}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">⚪ 비활성</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-lg border p-4">
              <p className="text-sm text-muted-foreground mb-2">차단된 사용자</p>
              <p className="text-2xl font-bold">{stats.users.banned}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">🚫 차단됨</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-lg border p-4">
              <p className="text-sm text-muted-foreground mb-2">총 사용자</p>
              <p className="text-2xl font-bold">{stats.users.totalUsers}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">👥 전체</p>
            </div>
          </div>
        </div>

        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 7일 추세 */}
          <UsageChart
            type="line"
            data={stats.daily}
            title="최근 7일 사용량 추세"
            dataKey="totalSearches"
            dataKey2="totalUsers"
            colors={['#3b82f6', '#10b981']}
          />

          {/* 할당량 분포 */}
          <UsageChart
            type="pie"
            data={quotaDistributionData}
            title="할당량 사용률 분포"
            colors={['#10b981', '#f59e0b', '#ef4444', '#8b5cf6']}
          />
        </div>

        {/* 상위 사용자 */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold">상위 검색 사용자</h2>
            <p className="text-sm text-muted-foreground mt-1">누적 검색이 많은 사용자 Top 10</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">이메일</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">누적 검색</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">일일 할당</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">잔여</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.topUsers.map((user) => (
                  <tr key={user.email} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium">{user.email}</td>
                    <td className="px-6 py-4 text-right text-sm">{user.totalSearches}</td>
                    <td className="px-6 py-4 text-right text-sm">{user.dailyLimit}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium">{user.remainingLimit}</td>
                    <td className="px-6 py-4 text-center text-sm">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          🟢 활성
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                          ⚪ 비활성
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 정보 섹션 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">통계 정보</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• 오늘의 통계는 현재 날짜 기준으로 집계됩니다</li>
            <li>• 최근 7일 추세는 지난 7일간의 누적 데이터를 표시합니다</li>
            <li>• 할당량 분포는 현재 할당량 대비 사용량 비율을 보여줍니다</li>
            <li>• 상위 사용자는 누적 검색 수 기준으로 정렬됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
