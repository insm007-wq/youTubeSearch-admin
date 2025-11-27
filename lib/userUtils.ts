/**
 * Pure utility functions for user data that don't require database access.
 * These can be safely imported in client components.
 */

import { AdminUser } from '@/types/user'

/**
 * Check if a user is currently online based on their last active time.
 * Online threshold: 5 minutes (300 seconds) of activity
 */
export function isUserOnline(lastActive?: Date | string): boolean {
  if (!lastActive) return false

  const lastActiveTime = new Date(lastActive).getTime()
  const now = new Date().getTime()
  const fiveMinutesInMs = 5 * 60 * 1000

  return now - lastActiveTime < fiveMinutesInMs
}

/**
 * Format a date to Korean locale
 */
export function formatDate(dateValue?: string | Date): string {
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
      second: '2-digit',
    })
  } catch {
    return '-'
  }
}

/**
 * Get user status badge information
 */
export function getUserStatusInfo(user: AdminUser) {
  if (user.isBanned) {
    return { label: '차단됨', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: '🚫' }
  }
  if (!user.isActive) {
    return { label: '비활성화', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: '⚪' }
  }
  return { label: '활성화', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: '🟢' }
}

/**
 * Calculate quota usage percentage
 */
export function getQuotaUsagePercent(user: AdminUser): number {
  if (user.dailyLimit === 0) return 0
  const used = user.dailyLimit - user.remainingLimit
  return Math.round((used / user.dailyLimit) * 100)
}

/**
 * Get quota usage status based on percentage
 */
export function getQuotaUsageStatus(percent: number): 'low' | 'medium' | 'high' | 'full' {
  if (percent < 50) return 'low'
  if (percent < 75) return 'medium'
  if (percent < 100) return 'high'
  return 'full'
}

/**
 * Get time elapsed since a date
 */
export function getTimeElapsed(date?: Date | string): string {
  if (!date) return '미접속'

  const targetDate = new Date(date).getTime()
  const now = new Date().getTime()
  const elapsedMs = now - targetDate

  const seconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  return `${days}일 전`
}
