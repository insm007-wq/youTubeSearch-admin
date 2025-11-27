'use client'

import { useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface AuditLog {
  _id?: string
  email: string
  action: string
  targetEmail?: string
  changes?: Record<string, any>
  timestamp: Date
  status: 'success' | 'failed'
  errorMessage?: string
}

interface LogTableProps {
  logs: AuditLog[]
  sortField?: 'timestamp' | 'action' | 'email'
  sortOrder?: 'asc' | 'desc'
  onSort?: (field: 'timestamp' | 'action' | 'email') => void
  isLoading?: boolean
}

export default function LogTable({
  logs,
  sortField = 'timestamp',
  sortOrder = 'desc',
  onSort,
  isLoading = false,
}: LogTableProps) {
  const formatDate = (dateValue?: string | Date) => {
    if (!dateValue) return '-'
    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return '-'

      // ✅ UTC를 KST로 변환 (+9시간)
      const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)

      return kstDate.toISOString().split('T')[0] + ' ' +
             String(kstDate.getUTCHours()).padStart(2, '0') + ':' +
             String(kstDate.getUTCMinutes()).padStart(2, '0') + ':' +
             String(kstDate.getUTCSeconds()).padStart(2, '0')
    } catch {
      return '-'
    }
  }

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, { label: string; color: string }> = {
      'UPDATE_DAILY_LIMIT': { label: '할당량 수정', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      'UPDATE_REMAINING_LIMIT': { label: '잔여량 수정', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
      'DEACTIVATE_USER': { label: '비활성화', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      'ACTIVATE_USER': { label: '활성화', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      'BAN_USER': { label: '사용자 차단', color: 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100' },
      'UNBAN_USER': { label: '차단 해제', color: 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100' },
      'RESET_REMAINING': { label: '잔여량 초기화', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      'BULK_UPDATE_DAILY_LIMIT': { label: '일괄 할당량 설정', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
    }

    const config = actionMap[action] || { label: action, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' }
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getStatusBadge = (status: 'success' | 'failed') => {
    return (
      <Badge variant={status === 'success' ? 'default' : 'destructive'}>
        {status === 'success' ? '✅ 성공' : '❌ 실패'}
      </Badge>
    )
  }

  const SortHeader = ({ field, label }: { field: 'timestamp' | 'action' | 'email'; label: string }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => onSort?.(field)}
    >
      <div className="flex items-center gap-2">
        {label}
        {sortField === field && (
          sortOrder === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )
        )}
      </div>
    </TableHead>
  )

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <SortHeader field="timestamp" label="시간" />
            <SortHeader field="email" label="관리자" />
            <SortHeader field="action" label="액션" />
            <TableHead>대상 사용자</TableHead>
            <TableHead>변경 사항</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                로그가 없습니다
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log._id} className="hover:bg-muted/50">
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(log.timestamp)}
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {log.email}
                </TableCell>
                <TableCell>
                  {getActionBadge(log.action)}
                </TableCell>
                <TableCell className="text-sm">
                  {log.targetEmail || '-'}
                </TableCell>
                <TableCell className="text-sm">
                  {log.changes ? (
                    <details className="cursor-pointer">
                      <summary className="hover:underline">보기</summary>
                      <pre className="mt-2 bg-muted p-2 rounded text-xs overflow-auto max-w-xs">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {getStatusBadge(log.status)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
