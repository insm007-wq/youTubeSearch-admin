'use client'

import { useState } from 'react'
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
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface BulkUpdateLimitModalProps {
  isOpen: boolean
  onClose: () => void
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  onSuccess?: (updated: number) => void
}

type Scope = 'all' | 'active' | 'inactive'

export default function BulkUpdateLimitModal({
  isOpen,
  onClose,
  totalUsers,
  activeUsers,
  inactiveUsers,
  onSuccess,
}: BulkUpdateLimitModalProps) {
  const [dailyLimit, setDailyLimit] = useState('20')
  const [scope, setScope] = useState<Scope>('all')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const scopeLabels = {
    all: `전체 (${totalUsers}명)`,
    active: `활성 사용자만 (${activeUsers}명)`,
    inactive: `비활성 사용자만 (${inactiveUsers}명)`,
  }

  const handleClose = () => {
    setError('')
    setResult(null)
    setDailyLimit('20')
    setScope('all')
    onClose()
  }

  const handleSubmit = async () => {
    setError('')

    const limit = parseInt(dailyLimit)
    if (isNaN(limit) || limit < 0) {
      setError('올바른 할당량을 입력해주세요 (0 이상)')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyLimit: limit,
          scope,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '일괄 업데이트 실패')
      }

      setResult(data.data)
      onSuccess?.(data.data.totalUpdated)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>일괄 할당량 설정</DialogTitle>
          <DialogDescription>
            선택한 사용자들의 일일 할당량을 한번에 설정합니다
          </DialogDescription>
        </DialogHeader>

        {result ? (
          // 완료 화면
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  {result.totalUpdated}명의 사용자 할당량이 설정되었습니다
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  할당량: {result.dailyLimit} (범위: {scopeLabels[result.scope as Scope]})
                </p>
                {result.totalFailed > 0 && (
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                    ⚠️ {result.totalFailed}명은 실패했습니다
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          // 입력 화면
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 대상 범위 선택 */}
            <div className="space-y-2">
              <Label htmlFor="scope" className="text-sm font-medium">
                대상 범위
              </Label>
              <Select value={scope} onValueChange={(value) => setScope(value as Scope)}>
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{scopeLabels.all}</SelectItem>
                  <SelectItem value="active">{scopeLabels.active}</SelectItem>
                  <SelectItem value="inactive">{scopeLabels.inactive}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {scope === 'all' && '모든 사용자에게 할당량을 설정합니다'}
                {scope === 'active' && '활성화된 사용자에게만 할당량을 설정합니다'}
                {scope === 'inactive' && '비활성화된 사용자에게만 할당량을 설정합니다'}
              </p>
            </div>

            {/* 할당량 입력 */}
            <div className="space-y-2">
              <Label htmlFor="daily-limit" className="text-sm font-medium">
                새 일일 할당량
              </Label>
              <Input
                id="daily-limit"
                type="number"
                min="0"
                max="999"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                placeholder="할당량 입력"
                disabled={isLoading}
                className="text-sm"
              />
              <div className="flex gap-2">
                {[5, 10, 20, 50, 100].map((limit) => (
                  <Button
                    key={limit}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDailyLimit(limit.toString())}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    {limit}회
                  </Button>
                ))}
              </div>
            </div>

            {/* 경고 */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>{scope === 'all' ? totalUsers : scope === 'active' ? activeUsers : inactiveUsers}명</strong>의
                사용자 할당량이 <strong>{dailyLimit}회</strong>로 변경됩니다.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {result ? '닫기' : '취소'}
          </Button>
          {!result && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !dailyLimit}
              className="bg-primary"
            >
              {isLoading ? '처리 중...' : '적용'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
