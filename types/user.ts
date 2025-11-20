export interface AdminUser {
  _id: string
  email: string
  name?: string | null
  image?: string | null
  dailyLimit: number
  remainingLimit: number
  isActive: boolean
  provider?: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface User extends AdminUser {
  emailVerified?: Date | null
}
