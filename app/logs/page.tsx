'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, ArrowLeft, LogOut } from 'lucide-react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import LogTable from '@/app/components/LogTable'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface AuditLog {
  _id?: string
  email: string
  action: string
  targetEmail?: string
  changes?: Record<string, any>
  timestamp: Date
  status: 'success' | 'failed'
  errorMessage?: string
}

type SortField = 'timestamp' | 'action' | 'email'

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterEmail, setFilterEmail] = useState('')
  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 로그 조회
  const loadLogs = async () => {
    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (filterEmail) params.append('userId', filterEmail)
      params.append('limit', '100')

      const response = await fetch(`/api/admin/logs?${params.toString()}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '로그 조회 실패')
      }

      // 정렬
      const sorted = [...(data.data || [])].sort((a, b) => {
        let aVal: any = a[sortField]
        let bVal: any = b[sortField]

        if (sortField === 'timestamp') {
          aVal = new Date(aVal).getTime()
          bVal = new Date(bVal).getTime()
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase()
          bVal = (bVal as string).toLowerCase()
        }

        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
        }
      })

      setLogs(sorted)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(errorMsg)
      toast.error('로그 조회 실패', { description: errorMsg })
    } finally {
      setIsLoading(false)
    }
  }

  // 초기 로드
  useEffect(() => {
    loadLogs()
  }, [])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadLogs()
  }

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
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={async () => {
                await signOut({ callbackUrl: '/login' })
              }}
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">감사 로그</h1>
            <p className="text-muted-foreground">모든 관리자 작업 기록</p>
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
          </Alert>
        )}

        {/* 필터 */}
        <div className="bg-card rounded-lg border p-4">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-email">대상 사용자 이메일</Label>
                <Input
                  id="filter-email"
                  placeholder="사용자 이메일로 필터링"
                  value={filterEmail}
                  onChange={(e) => setFilterEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '조회 중...' : '검색'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFilterEmail('')
                }}
                disabled={isLoading || !filterEmail}
              >
                초기화
              </Button>
            </div>
          </form>
        </div>

        {/* 로그 테이블 */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">로그 ({logs.length}개)</h2>
          </div>
          <LogTable
            logs={logs}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            isLoading={isLoading}
          />
        </div>

        {/* 정보 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">로그 정보</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• 모든 관리자 작업이 자동으로 기록됩니다</li>
            <li>• 변경 사항을 클릭하면 상세 내용을 확인할 수 있습니다</li>
            <li>• 로그는 최근 100개까지 표시됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
