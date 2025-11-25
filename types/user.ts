export interface AdminUser {
  email: string  // Primary Key
  name?: string | null
  image?: string | null
  dailyLimit: number
  remainingLimit: number
  todayUsed: number
  lastResetDate: string
  isActive: boolean
  isBanned: boolean
  bannedAt?: Date
  bannedReason?: string
  isOnline: boolean
  lastActive: Date
  lastLogin: Date
  provider?: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface User extends AdminUser {
  emailVerified?: Date | null
}
