'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { AdminUser } from '@/types/user'
import './EditUserModal.css'

interface EditRemainingLimitModalProps {
  user: AdminUser | null
  isOpen: boolean
  onClose: () => void
  onSave: (userId: string, remainingLimit: number) => Promise<void>
  isLoading?: boolean
}

export default function EditRemainingLimitModal({
  user,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}: EditRemainingLimitModalProps) {
  const [newRemaining, setNewRemaining] = useState('')
  const [error, setError] = useState('')

  if (!user || !isOpen) return null

  const handleSave = async () => {
    setError('')

    const remaining = parseInt(newRemaining)
    if (isNaN(remaining) || remaining < 0) {
      setError('올바른 잔여량을 입력해주세요 (0 이상)')
      return
    }

    try {
      const userId = user._id || user.userId
      if (!userId) {
        setError('사용자 ID를 찾을 수 없습니다')
        return
      }
      await onSave(userId, remaining)
      onClose()
      setNewRemaining('')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '저장에 실패했습니다'
      setError(errorMsg)
      console.error('❌ 잔여량 저장 오류:', err)
    }
  }

  const handlePresetChange = (newValue: number) => {
    setNewRemaining(newValue.toString())
  }

  const currentRemaining = (user as any).remainingLimit !== undefined ? (user as any).remainingLimit : '-'

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-container">
        <div className="modal-header">
          <h2>잔여량 수정</h2>
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
              <label>일일 할당량:</label>
              <span>{user.dailyLimit}</span>
            </div>
            <div className="info-row">
              <label>현재 잔여량:</label>
              <span>{currentRemaining}</span>
            </div>
          </div>

          <div className="modal-form">
            <label htmlFor="remaining">새 잔여량:</label>
            <input
              id="remaining"
              type="number"
              min="0"
              max="999"
              value={newRemaining}
              onChange={(e) => setNewRemaining(e.target.value)}
              placeholder="새 잔여량 입력"
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
            disabled={isLoading || !newRemaining}
          >
            {isLoading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </>
  )
}
