'use client'

import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import SearchBar from './components/SearchBar'
import UserTable from './components/UserTable'
import EditDailyLimitModal from './components/EditDailyLimitModal'
import { AdminUser } from '@/types/user'
import './page.css'

type User = AdminUser

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 초기 사용자 목록 로드
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '사용자 목록을 불러오는데 실패했습니다')
      }

      setUsers(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setIsLoading(true)
    setError('')

    try {
      const url = query ? `/api/admin/users?q=${encodeURIComponent(query)}` : '/api/admin/users'
      const response = await fetch(url)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '검색에 실패했습니다')
      }

      setUsers(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setShowEditModal(true)
  }

  const handleEditDailyLimit = (user: User) => {
    setEditingUser(user)
    setShowDailyLimitModal(true)
  }

  const handleSaveDailyLimit = async (userId: string, newLimit: number) => {
    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dailyLimit: newLimit }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '저장에 실패했습니다')
      }

      // 사용자 목록 업데이트 (이메일 기반)
      setUsers(
        users.map((u) => (
          u.email === data.data._id
            ? { ...u, dailyLimit: data.data.dailyLimit }
            : u
        ))
      )

      setShowDailyLimitModal(false)
      setEditingUser(null)
    } catch (err) {
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetRemaining = async (user: User) => {
    setIsLoading(true)

    try {
      console.log(`🔄 잔여량 초기화 요청:`, { email: user.email, dailyLimit: user.dailyLimit })

      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reset_remaining' }),
      })

      const data = await response.json()
      console.log(`📥 잔여량 초기화 응답:`, data)

      if (!data.success) {
        throw new Error(data.error || '초기화에 실패했습니다')
      }

      // 사용자 목록 업데이트 (이메일 기반)
      setUsers(
        users.map((u) =>
          u.email === user.email
            ? { ...u, remainingLimit: data.data.remainingLimit }
            : u
        )
      )

      console.log(`✅ 잔여량 초기화 완료:`, { email: user.email, remainingLimit: data.data.remainingLimit })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다'
      console.error(`❌ 잔여량 초기화 오류:`, err)
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveLimit = async (userId: string, newLimit: number, newRemaining?: number) => {
    setIsSaving(true)

    try {
      // userId is actually the _id from MongoDB
      const requestBody: any = { dailyLimit: newLimit }
      if (newRemaining !== undefined) {
        requestBody.remainingLimit = newRemaining
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '저장에 실패했습니다')
      }

      // 사용자 목록 업데이트 (이메일 기반)
      setUsers(
        users.map((u) => (
          u.email === data.data._id
            ? {
                ...u,
                dailyLimit: data.data.dailyLimit,
                ...(data.data.remainingLimit !== undefined && { remainingLimit: data.data.remainingLimit }),
              }
            : u
        ))
      )

      setShowEditModal(false)
      setEditingUser(null)
    } catch (err) {
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivate = async (user: User) => {
    setIsLoading(true)

    try {
      console.log('🔴 비활성화 요청:', {
        _id: user._id,
        userId: user.userId,
        email: user.email,
        isDeactivated: user.isDeactivated,
        url: `/api/admin/users/${user._id}`,
      })

      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'deactivate' }),
      })

      const data = await response.json()

      console.log('📤 비활성화 API 응답:', data)

      if (!data.success) {
        throw new Error(data.error || '비활성화 실패')
      }

      console.log('✅ 비활성화 완료, 상태 업데이트:', {
        _id: user._id,
        isDeactivated: data.data?.isDeactivated,
        dailyLimit: data.data?.dailyLimit,
      })

      setUsers(
        users.map((u) =>
          u.email === user.email
            ? { ...u, isDeactivated: true }  // 🔑 dailyLimit 유지 (0으로 변경하지 않음)
            : u
        )
      )

      // 자동 새로고침 제거 - 사용자가 수동으로 새로고침 하도록 함
      // 이렇게 하면 console 로그를 확인할 수 있음
      console.log('💡 팁: F5를 눌러 새로고침 하면 DB에서 최신 데이터를 조회합니다')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
      console.error('❌ 비활성화 오류:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivate = async (user: User) => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'activate', dailyLimit: 20 }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '활성화 실패')
      }

      setUsers(
        users.map((u) =>
          u.email === user.email
            ? { ...u, isDeactivated: false }  // 🔑 서버에서 반환된 dailyLimit 유지
            : u
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>YouTube 검색 관리자 대시보드</h1>
        <p className="subtitle">사용자 관리 및 할당량 설정</p>
      </div>

      <div className="admin-content">
        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          isLoading={isLoading}
        />

        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">전체 사용자</span>
            <span className="stat-value">{users.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">활성 사용자</span>
            <span className="stat-value">{users.filter((u) => !u.isDeactivated).length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">비활성 사용자</span>
            <span className="stat-value">{users.filter((u) => u.isDeactivated).length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">전체 잔여량</span>
            <span className="stat-value">{users.reduce((sum, u) => sum + (u.remaining ?? 0), 0)}</span>
          </div>
        </div>

        <UserTable
          users={users}
          onEdit={handleEditClick}
          onEditDailyLimit={handleEditDailyLimit}
          onResetRemaining={handleResetRemaining}
          onDeactivate={handleDeactivate}
          onActivate={handleActivate}
        />
      </div>

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
    </div>
  )
}
