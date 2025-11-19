export interface AdminUser {
  _id?: string
  userId?: string
  email: string
  name?: string | null
  image?: string | null
  dailyLimit: number
  remainingLimit?: number
  isDeactivated: boolean
  createdAt?: string | Date
  updatedAt?: string | Date
  remaining?: number
}
