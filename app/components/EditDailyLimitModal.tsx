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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
      setNewLimit('')
      setError('')
    }
  }

  const handleSave = async () => {
    setError('')
    console.log(`🎯 handleSave 모달 클릭 - user:`, user)

    const limit = parseInt(newLimit)
    console.log(`📊 limit: ${limit}, isNaN: ${isNaN(limit)}`)

    if (isNaN(limit) || limit < 0) {
      setError('올바른 할당량을 입력해주세요 (0 이상)')
      return
    }

    try {
      if (!user) {
        setError('사용자를 찾을 수 없습니다')
        console.error(`❌ user가 null`)
        return
      }
      const userId = user._id || user.userId
      console.log(`👤 userId 결정 - _id: ${user._id}, userId: ${user.userId}, 최종: ${userId}`)

      if (!userId) {
        setError('사용자 ID를 찾을 수 없습니다')
        console.error(`❌ userId가 없음`)
        return
      }
      console.log(`✅ onSave 호출 시작 - userId: ${userId}, limit: ${limit}`)
      await onSave(userId, limit)
      console.log(`✅ onSave 호출 완료`)
      handleOpenChange(false)
    } catch (err) {
      console.error(`❌ 모달 저장 에러:`, err)
      setError(err instanceof Error ? err.message : '저장에 실패했습니다')
    }
  }

  const setPresetLimit = (limit: number) => {
    setNewLimit(limit.toString())
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>일일 할당량 수정</DialogTitle>
          <DialogDescription>
            {user.email}의 일일 할당량을 설정합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 사용자 정보 */}
          <div className="space-y-2 bg-muted p-3 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <p className="text-muted-foreground">이메일</p>
                <p className="font-medium break-all text-xs">{user.email}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">현재 할당량</p>
                <p className="font-medium text-sm">{user.dailyLimit}</p>
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
            <Label htmlFor="limit" className="text-sm font-medium">
              새 할당량
            </Label>
            <Input
              id="limit"
              type="number"
              min="0"
              max="999"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder="새 할당량 입력"
              disabled={isLoading}
              className="text-sm"
            />
            <div className="flex gap-2 mt-2">
              {[5, 10, 20, 50].map((limit) => (
                <Button
                  key={limit}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPresetLimit(limit)}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {limit}회
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
            disabled={isLoading || !newLimit}
            className="bg-primary"
          >
            {isLoading ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
