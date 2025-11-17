'use client'

import { useState } from 'react'
import { Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { AdminUser } from '@/types/user'
import './UserTable.css'

interface UserTableProps {
  users: AdminUser[]
  onEdit: (user: AdminUser) => void
  onDeactivate: (user: AdminUser) => void
  onActivate: (user: AdminUser) => void
}

export default function UserTable({ users, onEdit, onDeactivate, onActivate }: UserTableProps) {
  const formatDate = (dateValue?: string | Date) => {
    if (!dateValue) return '-'
    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '-'
    }
  }

  return (
    <div className="user-table-container">
      <table className="user-table">
        <thead>
          <tr>
            <th>이메일</th>
            <th>이름</th>
            <th>User ID</th>
            <th>일일 할당량</th>
            <th>잔여량</th>
            <th>상태</th>
            <th>생성일</th>
            <th>수정일</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id || user.email} className={user.isDeactivated ? 'deactivated' : ''}>
              <td>{user.email}</td>
              <td className="name-cell">{user.name || '-'}</td>
              <td className="user-id">{user.userId || '-'}</td>
              <td>
                <span className="quota-badge">{user.dailyLimit}</span>
              </td>
              <td>
                <span className="remaining-badge">{user.remaining ?? user.dailyLimit}</span>
              </td>
              <td>
                <span className={`status-badge ${user.isDeactivated ? 'deactivated' : 'active'}`}>
                  {user.isDeactivated ? '비활성화' : '활성화'}
                </span>
              </td>
              <td className="date-cell">{formatDate(user.createdAt)}</td>
              <td className="date-cell">{formatDate(user.updatedAt)}</td>
              <td className="actions-cell">
                <button
                  className="action-btn edit-btn"
                  onClick={() => onEdit(user)}
                  title="수정"
                >
                  <Edit2 size={16} />
                </button>
                {user.isDeactivated ? (
                  <button
                    className="action-btn activate-btn"
                    onClick={() => onActivate(user)}
                    title="활성화"
                  >
                    <ToggleRight size={16} />
                  </button>
                ) : (
                  <button
                    className="action-btn deactivate-btn"
                    onClick={() => onDeactivate(user)}
                    title="비활성화"
                  >
                    <ToggleLeft size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <div className="empty-state">
          <p>사용자가 없습니다</p>
        </div>
      )}
    </div>
  )
}
