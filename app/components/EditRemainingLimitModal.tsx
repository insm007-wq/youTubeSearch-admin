'use client'

import { useState } from 'react'
import { AdminUser } from '@/types/user'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
      setNewRemaining('')
      setError('')
    }
  }

  const handleSave = async () => {
    setError('')

    const remaining = parseInt(newRemaining)
    if (isNaN(remaining) || remaining < 0) {
      setError('올바른 잔여량을 입력해주세요 (0 이상)')
      return
    }

    try {
      if (!user) {
        setError('사용자를 찾을 수 없습니다')
        return
      }
      const userId = user._id || user.userId
      if (!userId) {
        setError('사용자 ID를 찾을 수 없습니다')
        return
      }
      await onSave(userId, remaining)
      handleOpenChange(false)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '저장에 실패했습니다'
      setError(errorMsg)
      console.error('❌ 잔여량 저장 오류:', err)
    }
  }

  const setPresetRemaining = (value: number) => {
    setNewRemaining(value.toString())
  }

  if (!user) return null

  const currentRemaining =
    (user as any).remainingLimit !== undefined
      ? (user as any).remainingLimit
      : (user as any).remaining
      ? (user as any).remaining
      : '-'

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>잔여량 수정</DialogTitle>
          <DialogDescription>
            {user.email}의 잔여량을 설정합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 사용자 정보 */}
          <div className="space-y-2 bg-muted p-3 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">이메일</p>
                <p className="font-medium break-all text-xs">{user.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">User ID</p>
                <p className="font-mono text-xs break-all">{user.userId || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">일일 할당량</p>
                <p className="font-medium text-sm">{user.dailyLimit}</p>
              </div>
              <div>
                <p className="text-muted-foreground">현재 잔여량</p>
                <p className="font-medium text-sm">{currentRemaining}</p>
              </div>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 입력 폼 */}
          <div className="space-y-2">
            <Label htmlFor="remaining" className="text-sm font-medium">
              새 잔여량
            </Label>
            <Input
              id="remaining"
              type="number"
              min="0"
              max="999"
              value={newRemaining}
              onChange={(e) => setNewRemaining(e.target.value)}
              placeholder="새 잔여량 입력"
              disabled={isLoading}
              className="text-sm"
            />
            <div className="flex gap-2 mt-2">
              {[5, 10, 20, 50].map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPresetRemaining(value)}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {value}회
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !newRemaining}
            className="bg-primary"
          >
            {isLoading ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
