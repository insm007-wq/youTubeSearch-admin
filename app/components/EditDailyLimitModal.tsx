'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { AdminUser } from '@/types/user'
import './EditUserModal.css'

interface EditDailyLimitModalProps {
  user: AdminUser | null
  isOpen: boolean
  onClose: () => void
  onSave: (userId: string, dailyLimit: number) => Promise<void>
  isLoading?: boolean
}

export default function EditDailyLimitModal({
  user,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}: EditDailyLimitModalProps) {
  const [newLimit, setNewLimit] = useState('')
  const [error, setError] = useState('')

  if (!user || !isOpen) return null

  const handleSave = async () => {
    setError('')

    const limit = parseInt(newLimit)
    if (isNaN(limit) || limit < 0) {
      setError('올바른 할당량을 입력해주세요 (0 이상)')
      return
    }

    try {
      const userId = user._id || user.userId
      if (!userId) {
        setError('사용자 ID를 찾을 수 없습니다')
        return
      }
      await onSave(userId, limit)
      onClose()
      setNewLimit('')
    } catch (err) {
      setError('저장에 실패했습니다')
    }
  }

  const handlePresetChange = (newValue: number) => {
    setNewLimit(newValue.toString())
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-container">
        <div className="modal-header">
          <h2>일일 할당량 수정</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-info">
            <div className="info-row">
              <label>이메일:</label>
              <span>{user.email}</span>
            </div>
            <div className="info-row">
              <label>User ID:</label>
              <span className="user-id">{user.userId}</span>
            </div>
            <div className="info-row">
              <label>현재 할당량:</label>
              <span>{user.dailyLimit}</span>
            </div>
          </div>

          <div className="modal-form">
            <label htmlFor="limit">새 할당량:</label>
            <input
              id="limit"
              type="number"
              min="0"
              max="999"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder="새 할당량 입력"
              disabled={isLoading}
            />

            {error && <div className="error-message">{error}</div>}

            <div className="preset-buttons">
              <button
                type="button"
                className="preset-btn"
                onClick={() => handlePresetChange(5)}
                disabled={isLoading}
              >
                5회
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => handlePresetChange(10)}
                disabled={isLoading}
              >
                10회
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => handlePresetChange(20)}
                disabled={isLoading}
              >
                20회
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => handlePresetChange(50)}
                disabled={isLoading}
              >
                50회
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={isLoading}>
            취소
          </button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={isLoading || !newLimit}
          >
            {isLoading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </>
  )
}
