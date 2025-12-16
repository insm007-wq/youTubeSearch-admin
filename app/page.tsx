'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, Users, UserCheck, UserX, Zap, Settings2, UserCog, FileText, BarChart3, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import SearchBar from './components/SearchBar'
import UserTable from './components/UserTable'
import EditUserModal from './components/EditUserModal'
import EditDailyLimitModal from './components/EditDailyLimitModal'
import EditRemainingLimitModal from './components/EditRemainingLimitModal'
import BulkUpdateLimitModal from './components/BulkUpdateLimitModal'
import BanUserModal from './components/BanUserModal'
import { AdminUser } from '@/types/user'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getOnlineUsersAction } from '@/app/actions'

type User = AdminUser

interface StatCard {
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false)
  const [showRemainingModal, setShowRemainingModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [showBanModal, setShowBanModal] = useState(false)
  const [banningUser, setBanningUser] = useState<User | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [activeUsers, setActiveUsers] = useState(0)
  const [deactivatedUsers, setDeactivatedUsers] = useState(0)
  const [depletedUsers, setDepletedUsers] = useState(0)
  const [totalAllUsers, setTotalAllUsers] = useState(0)
  const [filterType, setFilterType] = useState<'all' | 'online' | 'active' | 'inactive' | 'depleted'>('all')

  // 초기 사용자 목록 로드
  useEffect(() => {
    loadUsers()
    loadStats()
  }, [])

  // 통계 정보 로드
  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      const data = await response.json()

      if (data.success && data.data.users) {
        console.log(`📊 통계 로드: 활성=${data.data.users.active}, 비활성=${data.data.users.inactive}, 온라인=${data.data.users.onlineUsers}, 소진=${data.data.users.depletedUsers}`)
        setTotalAllUsers(data.data.users.totalUsers || 0)
        setActiveUsers(data.data.users.active || 0)
        setDeactivatedUsers(data.data.users.inactive || 0)
        setOnlineUsers(data.data.users.onlineUsers || 0)
        setDepletedUsers(data.data.users.depletedUsers || 0)
      }
    } catch (err) {
      console.error('❌ 통계 로드 실패:', err)
    }
  }

  const loadUsers = async (page: number = 1, query: string = '', filter: string = 'all') => {
    setIsLoading(true)
    setError('')

    try {
      // ✅ 페이지, 검색어, 필터를 모두 포함한 URL 생성
      let url = `/api/admin/users?page=${page}&limit=10`
      if (query && query.trim()) {
        url += `&q=${encodeURIComponent(query)}`
      }
      if (filter && filter !== 'all') {
        url += `&filter=${filter}`
      }

      console.log(`🔍 사용자 로드 - url: ${url}`)
      const response = await fetch(url)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '사용자 목록을 불러오는데 실패했습니다')
      }

      setUsers(data.data)
      setCurrentPage(data.pagination?.page || page)
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalUsers(data.pagination?.total || 0)

      console.log(`📊 로드 완료 - 페이지: ${data.pagination?.page}, 전체: ${data.pagination?.total}명`)

      // ✅ 현재 접속자 수 조회
      try {
        const onlineCount = await getOnlineUsersAction()
        setOnlineUsers(onlineCount)
      } catch (err) {
        console.error('❌ 접속자 수 조회 실패:', err)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(errorMsg)
      toast.error('사용자 로드 실패', { description: errorMsg })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    // ✅ 검색할 때 페이지 1로 초기화
    setCurrentPage(1)
    await loadUsers(1, query, filterType)
  }

  // 카드 클릭 핸들러
  const handleCardClick = async (filter: 'all' | 'online' | 'active' | 'inactive' | 'depleted') => {
    setFilterType(filter)
    setCurrentPage(1)
    setSearchQuery('')
    await loadUsers(1, '', filter)
    await loadStats()
  }

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setShowEditModal(true)
  }

  const handleEditDailyLimit = (user: User) => {
    setEditingUser(user)
    setShowDailyLimitModal(true)
  }

  const handleEditRemaining = (user: User) => {
    setEditingUser(user)
    setShowRemainingModal(true)
  }

  const handleSaveDailyLimit = async (email: string, newLimit: number) => {
    setIsSaving(true)
    console.log(`📝 handleSaveDailyLimit 시작 - email: ${email}, newLimit: ${newLimit}`)
    try {
      const response = await fetch(`/api/admin/users/${email}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyLimit: newLimit }),
      })

      const data = await response.json()
      console.log(`📥 응답:`, data)

      if (!data.success) {
        throw new Error(data.error || '저장에 실패했습니다')
      }

      // 응답된 이메일 기준으로 업데이트
      const updatedEmail = data.data.email
      console.log(`🔄 사용자 업데이트 - 이메일: ${updatedEmail}, dailyLimit: ${data.data.dailyLimit}`)

      setUsers(
        users.map((u) => {
          if (u.email === updatedEmail) {
            console.log(`✅ 일치함: ${u.email}`)
            return { ...u, dailyLimit: data.data.dailyLimit }
          }
          return u
        })
      )

      toast.success('할당량이 업데이트되었습니다')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다'
      console.error(`❌ 에러:`, err)
      toast.error('저장 실패', { description: errorMsg })
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveRemaining = async (email: string, newRemaining: number) => {
    setIsSaving(true)
    console.log(`📝 handleSaveRemaining 시작 - email: ${email}, newRemaining: ${newRemaining}`)
    try {
      const response = await fetch(`/api/admin/users/${email}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remainingLimit: newRemaining }),
      })

      const data = await response.json()
      console.log(`📥 응답:`, data)

      if (!data.success) {
        throw new Error(data.error || '저장에 실패했습니다')
      }

      const updatedEmail = data.data.email
      console.log(`🔄 사용자 업데이트 - 이메일: ${updatedEmail}, remainingLimit: ${data.data.remainingLimit}`)

      setUsers(
        users.map((u) => {
          if (u.email === updatedEmail) {
            console.log(`✅ 일치함: ${u.email}`)
            return { ...u, remainingLimit: data.data.remainingLimit }
          }
          return u
        })
      )
      toast.success('잔여량이 업데이트되었습니다')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다'
      console.error(`❌ 에러:`, err)
      toast.error('저장 실패', { description: errorMsg })
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetRemaining = async (user: User) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.email}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_remaining' }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '초기화에 실패했습니다')
      }

      setUsers(
        users.map((u) =>
          u.email === user.email ? { ...u, remainingLimit: data.data.remainingLimit } : u
        )
      )
      toast.success('잔여량이 초기화되었습니다')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(errorMsg)
      toast.error('초기화 실패', { description: errorMsg })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveLimit = async (email: string, newLimit: number, newRemaining?: number) => {
    setIsSaving(true)
    console.log(`📝 handleSaveLimit 시작 - email: ${email}, newLimit: ${newLimit}, newRemaining: ${newRemaining}`)
    try {
      const requestBody: any = { dailyLimit: newLimit }
      if (newRemaining !== undefined) {
        requestBody.remainingLimit = newRemaining
      }

      const response = await fetch(`/api/admin/users/${email}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      console.log(`📥 응답:`, data)

      if (!data.success) {
        throw new Error(data.error || '저장에 실패했습니다')
      }

      const updatedEmail = data.data.email
      console.log(`🔄 사용자 업데이트 - 이메일: ${updatedEmail}, dailyLimit: ${data.data.dailyLimit}, remainingLimit: ${data.data.remainingLimit}`)

      setUsers(
        users.map((u) => {
          if (u.email === updatedEmail) {
            console.log(`✅ 일치함: ${u.email}`)
            return {
              ...u,
              dailyLimit: data.data.dailyLimit,
              ...(data.data.remainingLimit !== undefined && {
                remainingLimit: data.data.remainingLimit,
              }),
            }
          }
          return u
        })
      )
      toast.success('사용자 정보가 업데이트되었습니다')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다'
      console.error(`❌ 에러:`, err)
      toast.error('저장 실패', { description: errorMsg })
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivate = async (user: User) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.email}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate' }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '비활성화 실패')
      }

      setUsers(users.map((u) => (u.email === user.email ? { ...u, isActive: false } : u)))
      toast.success('사용자가 비활성화되었습니다')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(errorMsg)
      toast.error('비활성화 실패', { description: errorMsg })
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivate = async (user: User) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.email}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', dailyLimit: 20 }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '활성화 실패')
      }

      setUsers(users.map((u) => (u.email === user.email ? { ...u, isActive: true } : u)))
      toast.success('사용자가 활성화되었습니다')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(errorMsg)
      toast.error('활성화 실패', { description: errorMsg })
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ 사용자 차단
  const handleBan = (user: User) => {
    setBanningUser(user)
    setShowBanModal(true)
  }

  const handleBanConfirm = async (reason: string) => {
    if (!banningUser) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${banningUser.email}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ban', bannedReason: reason }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '차단 실패')
      }

      setUsers(users.map((u) => (u.email === banningUser.email ? { ...u, isBanned: true } : u)))
      toast.success(`${banningUser.name || banningUser.email}을(를) 차단했습니다`)
      setBanningUser(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(errorMsg)
      toast.error('차단 실패', { description: errorMsg })
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ 사용자 차단 해제
  const handleUnban = async (user: User) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.email}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unban' }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '차단 해제 실패')
      }

      setUsers(users.map((u) => (u.email === user.email ? { ...u, isBanned: false } : u)))
      toast.success(`${user.name || user.email}을(를) 차단 해제했습니다`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(errorMsg)
      toast.error('차단 해제 실패', { description: errorMsg })
    } finally {
      setIsLoading(false)
    }
  }

  // 통계 데이터 (API에서 로드됨 - 전체 DB 기준)
  // activeUsers, deactivatedUsers, totalRemaining은 state에서 관리됨

  const stats: StatCard[] = [
    {
      icon: <Users className="w-5 h-5" />,
      label: '전체 사용자',
      value: totalAllUsers,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      icon: <UserCog className="w-5 h-5" />,
      label: '현재 접속자',
      value: onlineUsers,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: <UserCheck className="w-5 h-5" />,
      label: '활성 사용자',
      value: activeUsers,
      color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    },
    {
      icon: <UserX className="w-5 h-5" />,
      label: '비활성 사용자',
      value: deactivatedUsers,
      color: 'bg-red-500/10 text-red-600 dark:text-red-400',
    },
    {
      icon: <AlertCircle className="w-5 h-5" />,
      label: '할당량 소진',
      value: depletedUsers,
      color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* 헤더 */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div
              className="space-y-2 cursor-pointer hover:opacity-75 transition-opacity"
              onClick={handleRefresh}
              title="클릭하여 새로 고침"
            >
              <h1 className="text-3xl font-bold tracking-tight">유튜브 스카웃 관리자</h1>
              <p className="text-muted-foreground">사용자 관리 및 할당량 설정 대시보드</p>
            </div>
            <div className="flex gap-2">
              <Link href="/stats">
                <Button variant="outline" size="sm" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  통계
                </Button>
              </Link>
              <Link href="/logs">
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="w-4 h-4" />
                  감사 로그
                </Button>
              </Link>
              <Button
                variant="outline"
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

        {/* 검색 바 */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const filterMap = ['all', 'online', 'active', 'inactive', 'depleted']
            const filter = filterMap[idx] as 'all' | 'online' | 'active' | 'inactive' | 'depleted'
            const isSelected = filterType === filter

            return (
              <div
                key={idx}
                onClick={() => handleCardClick(filter)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 shadow-md'
                    : 'bg-white dark:bg-zinc-900 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 사용자 테이블 */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">사용자 목록</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBulkModal(true)}
              className="gap-2"
            >
              <Settings2 className="w-4 h-4" />
              일괄 할당량 설정
            </Button>
          </div>
          <div className="p-4">
            <UserTable
              users={users}
              onEdit={handleEditClick}
              onEditDailyLimit={handleEditDailyLimit}
              onResetRemaining={handleResetRemaining}
              onDeactivate={handleDeactivate}
              onActivate={handleActivate}
              onBan={handleBan}
              onUnban={handleUnban}
              isLoading={isLoading}
              currentPage={currentPage}
              totalPages={totalPages}
              totalUsers={totalUsers}
              onPageChange={(page) => loadUsers(page, searchQuery, filterType)}
            />
          </div>
        </div>
      </div>

      {/* 모달들 */}
      <EditUserModal
        user={editingUser}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingUser(null)
        }}
        onSave={handleSaveLimit}
        isLoading={isSaving}
      />

      <EditDailyLimitModal
        user={editingUser}
        isOpen={showDailyLimitModal}
        onClose={() => {
          setShowDailyLimitModal(false)
          setEditingUser(null)
        }}
        onSave={handleSaveDailyLimit}
        isLoading={isSaving}
      />

      <EditRemainingLimitModal
        user={editingUser}
        isOpen={showRemainingModal}
        onClose={() => {
          setShowRemainingModal(false)
          setEditingUser(null)
        }}
        onSave={handleSaveRemaining}
        isLoading={isSaving}
      />

      <BulkUpdateLimitModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        totalUsers={users.length}
        activeUsers={activeUsers}
        inactiveUsers={deactivatedUsers}
        onSuccess={(updated) => {
          toast.success(`${updated}명의 사용자 할당량이 설정되었습니다`)
          loadUsers()
          setShowBulkModal(false)
        }}
      />

      {/* ✅ 차단 모달 */}
      <BanUserModal
        isOpen={showBanModal}
        userEmail={banningUser?.email}
        userName={banningUser?.name}
        onClose={() => {
          setShowBanModal(false)
          setBanningUser(null)
        }}
        onConfirm={handleBanConfirm}
      />
    </div>
  )
}
