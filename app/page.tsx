'use client'

import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import SearchBar from './components/SearchBar'
import UserTable from './components/UserTable'
import EditUserModal from './components/EditUserModal'
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

  const handleSaveLimit = async (userId: string, newLimit: number) => {
    setIsSaving(true)

    try {
      // userId is actually the _id from MongoDB
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

      // 사용자 목록 업데이트
      setUsers(
        users.map((u) => (u._id === data.data._id ? { ...u, dailyLimit: data.data.dailyLimit } : u))
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
    if (!confirm(`${user.email} 사용자를 비활성화하시겠습니까?`)) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'deactivate' }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '비활성화 실패')
      }

      setUsers(
        users.map((u) =>
          u._id === user._id
            ? { ...u, isDeactivated: true, dailyLimit: 0 }
            : u
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivate = async (user: User) => {
    if (!confirm(`${user.email} 사용자를 활성화하시겠습니까?`)) {
      return
    }

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
          u._id === user._id
            ? { ...u, isDeactivated: false, dailyLimit: 20 }
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
          onDeactivate={handleDeactivate}
          onActivate={handleActivate}
        />
      </div>

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
    </div>
  )
}
