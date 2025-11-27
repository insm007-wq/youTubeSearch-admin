'use client'

import { useState, useMemo } from 'react'
import { Edit2, RefreshCw, ToggleRight, ToggleLeft, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react'
import { AdminUser } from '@/types/user'
import { isUserOnline } from '@/lib/userUtils'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'

interface UserTableProps {
  users: AdminUser[]
  onEdit: (user: AdminUser) => void
  onEditDailyLimit: (user: AdminUser) => void
  onResetRemaining: (user: AdminUser) => void
  onDeactivate: (user: AdminUser) => void
  onActivate: (user: AdminUser) => void
  onBan: (user: AdminUser) => void
  onUnban: (user: AdminUser) => void
  isLoading?: boolean
  currentPage?: number
  totalPages?: number
  totalUsers?: number
  onPageChange?: (page: number) => void
}

type SortField = 'email' | 'name' | 'dailyLimit' | 'remainingLimit' | 'createdAt'
type SortOrder = 'asc' | 'desc'

export default function UserTable({
  users,
  onEdit,
  onEditDailyLimit,
  onResetRemaining,
  onDeactivate,
  onActivate,
  onBan,
  onUnban,
  isLoading = false,
  currentPage: externalCurrentPage,
  totalPages: externalTotalPages,
  totalUsers: externalTotalUsers = 0,
  onPageChange,
}: UserTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('email')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [currentPage, setCurrentPageInternal] = useState(1)
  const itemsPerPage = 10

  // ✅ 백엔드 페이지네이션 또는 클라이언트 페이지네이션 모드 선택
  const isBackendPagination = externalCurrentPage !== undefined && externalTotalPages !== undefined && onPageChange !== undefined
  const displayCurrentPage = isBackendPagination ? externalCurrentPage : currentPage
  const clientTotalPages = Math.ceil(users.length / itemsPerPage)
  const displayTotalPages = isBackendPagination ? externalTotalPages : clientTotalPages

  const setCurrentPage = (page: number) => {
    if (isBackendPagination && onPageChange) {
      onPageChange(page)
    } else {
      setCurrentPageInternal(page)
    }
  }

  const formatDate = (dateValue?: string | Date) => {
    if (!dateValue) return '-'
    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return '-'

      // ✅ UTC를 KST로 변환 (+9시간)
      const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)

      return kstDate.toISOString().split('T')[0] + ' ' +
             String(kstDate.getUTCHours()).padStart(2, '0') + ':' +
             String(kstDate.getUTCMinutes()).padStart(2, '0')
    } catch {
      return '-'
    }
  }

  // 정렬 로직
  const sortedUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string).toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      }
    })
    return sorted
  }, [users, sortField, sortOrder])

  // 페이지네이션 (백엔드 페이지네이션 사용 시 정렬/필터링 스킵)
  const computedTotalPages = isBackendPagination ? externalTotalPages || 1 : Math.ceil(sortedUsers.length / itemsPerPage)
  const paginatedUsers = useMemo(() => {
    if (isBackendPagination) {
      // 백엔드에서 이미 페이지네이션된 데이터를 받으므로 그대로 반환
      return sortedUsers
    }
    // 클라이언트 페이지네이션
    const start = (currentPage - 1) * itemsPerPage
    return sortedUsers.slice(start, start + itemsPerPage)
  }, [sortedUsers, currentPage, isBackendPagination])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const toggleAllSelected = () => {
    if (selectedIds.size === paginatedUsers.length) {
      setSelectedIds(new Set())
    } else {
      const ids = new Set(paginatedUsers.map((u) => u.email))
      setSelectedIds(ids)
    }
  }

  const toggleSelected = (email: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(email)) {
      newSelected.delete(email)
    } else {
      newSelected.add(email)
    }
    setSelectedIds(newSelected)
  }

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <TableHead
      onClick={() => toggleSort(field)}
      className="cursor-pointer select-none hover:bg-muted transition-colors"
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

  if (isLoading && users.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border rounded-lg">
            <Skeleton className="w-12 h-12 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 선택된 항목 표시 */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedIds.size}개 항목 선택됨
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs"
          >
            선택 해제
          </Button>
        </div>
      )}

      {/* 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === paginatedUsers.length && paginatedUsers.length > 0}
                  onCheckedChange={toggleAllSelected}
                />
              </TableHead>
              <SortHeader field="email" label="이메일" />
              <SortHeader field="name" label="이름" />
              <TableHead>제공자</TableHead>
              <SortHeader field="dailyLimit" label="일일 할당량" />
              <SortHeader field="remainingLimit" label="잔여량" />
              <TableHead>접속 상태</TableHead>
              <TableHead>상태</TableHead>
              <SortHeader field="createdAt" label="생성일" />
              <TableHead>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow
                key={user.email}
                className={`hover:bg-muted/50 transition-colors ${
                  !user.isActive ? 'opacity-60' : ''
                }`}
              >
                <TableCell className="w-12">
                  <Checkbox
                    checked={selectedIds.has(user.email)}
                    onCheckedChange={() => toggleSelected(user.email)}
                  />
                </TableCell>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.name || '-'}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="text-xs font-medium"
                  >
                    {user.provider ? (
                      <>
                        {user.provider === 'google' && '🔵 Google'}
                        {user.provider === 'kakao' && '🟨 Kakao'}
                        {user.provider === 'naver' && '🟢 Naver'}
                      </>
                    ) : (
                      '미설정'
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => onEditDailyLimit(user)}
                    title="클릭하여 일일 할당량 수정"
                  >
                    {user.dailyLimit}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => onResetRemaining(user)}
                    title="클릭하여 잔여량 초기화"
                  >
                    {user.remainingLimit}
                  </Badge>
                </TableCell>
                {/* ✅ 접속 상태 */}
                <TableCell>
                  {isUserOnline(user.lastActive) ? (
                    <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
                      🟢 온라인
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      ⚪ 오프라인
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={!user.isActive ? 'destructive' : 'default'}
                    className="text-xs"
                  >
                    {!user.isActive ? '비활성화' : '활성화'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">작업 메뉴 열기</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onEdit(user)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>편집</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onResetRemaining(user)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>잔여량 초기화</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* ✅ 차단/차단 해제 */}
                      {!user.isBanned ? (
                        <DropdownMenuItem
                          onClick={() => onBan(user)}
                          className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400"
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span>사용자 차단</span>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onUnban(user)}
                          className="flex items-center gap-2 cursor-pointer text-green-600 dark:text-green-400"
                        >
                          <ToggleRight className="w-4 h-4" />
                          <span>차단 해제</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {!user.isActive ? (
                        <DropdownMenuItem
                          onClick={() => onActivate(user)}
                          className="flex items-center gap-2 cursor-pointer text-green-600 dark:text-green-400"
                        >
                          <ToggleRight className="w-4 h-4" />
                          <span>활성화</span>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onDeactivate(user)}
                          className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400"
                        >
                          <ToggleLeft className="w-4 h-4" />
                          <span>비활성화</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 빈 상태 */}
      {paginatedUsers.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">사용자가 없습니다</p>
        </div>
      )}

      {/* 페이지네이션 */}
      {computedTotalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isBackendPagination ? (
              <>
                전체 {externalCurrentPage && externalTotalPages ? `${externalTotalUsers || 0}개 중 표시` : '로딩 중...'}
              </>
            ) : (
              <>
                전체 {sortedUsers.length}개 중 {(displayCurrentPage - 1) * itemsPerPage + 1} ~{' '}
                {Math.min(displayCurrentPage * itemsPerPage, sortedUsers.length)}개 표시
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, displayCurrentPage - 1))}
              disabled={displayCurrentPage === 1}
            >
              이전
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const pageGroup = Math.floor((displayCurrentPage - 1) / 5)
                const page = pageGroup * 5 + i + 1
                if (page > displayTotalPages) return null

                const isCurrentPage = page === displayCurrentPage
                return (
                  <Button
                    key={page}
                    variant={isCurrentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(displayTotalPages, displayCurrentPage + 1))}
              disabled={displayCurrentPage === displayTotalPages}
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
