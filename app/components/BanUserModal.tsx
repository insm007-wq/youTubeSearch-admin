'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface BanUserModalProps {
  isOpen: boolean
  userEmail?: string | null
  userName?: string | null
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export default function BanUserModal({
  isOpen,
  userEmail,
  userName,
  onClose,
  onConfirm,
}: BanUserModalProps) {
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('차단 사유를 입력해주세요')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await onConfirm(reason)
      setReason('')
      onClose()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '차단 실패'
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            사용자 차단
          </DialogTitle>
          <DialogDescription>
            {userName} ({userEmail})을(를) 차단하려고 합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              차단된 사용자는 로그인할 수 없습니다
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              차단 사유 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="차단 사유를 입력해주세요 (예: 부적절한 행동, 규정 위반 등)"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError('')
              }}
              className="resize-none"
              rows={4}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/200자
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? '차단 중...' : '차단'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
