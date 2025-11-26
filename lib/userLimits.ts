import { connectToDatabase } from './mongodb'
import { AdminUser } from '@/types/user'

export async function getAllUsers(): Promise<AdminUser[]> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')
  const apiUsageCollection = db.collection('api_usage')

  // KST 기준 오늘 날짜
  const today = new Date()
  const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000)
  const todayStr = kstDate.toISOString().split('T')[0]

  const users = await usersCollection
    .find({})
    .sort({ createdAt: -1 })
    .toArray()

  return Promise.all(users.map(async (user: any) => {
    // api_usage에서 오늘 사용량 조회
    const apiUsage = await apiUsageCollection.findOne({
      email: user.email,
      date: todayStr
    })

    const todayUsed = apiUsage?.count ?? 0
    const dailyLimit = user.dailyLimit || 20
    const remainingLimit = Math.max(0, dailyLimit - todayUsed)

    return {
      email: user.email,
      name: user.name || null,
      image: user.image || null,
      dailyLimit: dailyLimit,
      remainingLimit: remainingLimit,  // ✅ api_usage 기반 실시간 계산
      todayUsed: todayUsed,            // ✅ api_usage.count에서 가져옴
      lastResetDate: user.lastResetDate || new Date().toISOString().split('T')[0],
      isActive: user.isActive !== false,
      isBanned: user.isBanned || false,
      isOnline: user.isOnline || false,
      lastActive: user.lastActive || new Date(),
      lastLogin: user.lastLogin || new Date(),
      provider: user.provider || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }))
}

export async function searchUsers(query: string): Promise<AdminUser[]> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')
  const apiUsageCollection = db.collection('api_usage')

  // KST 기준 오늘 날짜
  const today = new Date()
  const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000)
  const todayStr = kstDate.toISOString().split('T')[0]

  const searchFilter = {
    $or: [
      { email: { $regex: query, $options: 'i' } },
      { name: { $regex: query, $options: 'i' } },
    ],
  }

  const users = await usersCollection
    .find(searchFilter)
    .sort({ createdAt: -1 })
    .toArray()

  return Promise.all(users.map(async (user: any) => {
    // api_usage에서 오늘 사용량 조회
    const apiUsage = await apiUsageCollection.findOne({
      email: user.email,
      date: todayStr
    })

    const todayUsed = apiUsage?.count ?? 0
    const dailyLimit = user.dailyLimit || 20
    const remainingLimit = Math.max(0, dailyLimit - todayUsed)

    return {
      email: user.email,
      name: user.name || null,
      image: user.image || null,
      dailyLimit: dailyLimit,
      remainingLimit: remainingLimit,  // ✅ api_usage 기반 실시간 계산
      todayUsed: todayUsed,            // ✅ api_usage.count에서 가져옴
      lastResetDate: user.lastResetDate || new Date().toISOString().split('T')[0],
      isActive: user.isActive !== false,
      isBanned: user.isBanned || false,
      isOnline: user.isOnline || false,
      lastActive: user.lastActive || new Date(),
      lastLogin: user.lastLogin || new Date(),
      provider: user.provider || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }))
}

export async function getUserById(email: string): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')
  const apiUsageCollection = db.collection('api_usage')

  console.log(`🔍 getUserById - email: ${email}`)

  const user = await usersCollection.findOne({ email })

  if (user) {
    console.log(`✅ 사용자 찾음: ${user.email}`)

    // KST 기준 오늘 날짜
    const today = new Date()
    const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000)
    const todayStr = kstDate.toISOString().split('T')[0]

    // api_usage에서 오늘 사용량 조회
    const apiUsage = await apiUsageCollection.findOne({
      email: user.email,
      date: todayStr
    })

    const todayUsed = apiUsage?.count ?? 0
    const dailyLimit = user.dailyLimit || 20
    const remainingLimit = Math.max(0, dailyLimit - todayUsed)

    return {
      email: user.email,
      name: user.name || null,
      image: user.image || null,
      dailyLimit: dailyLimit,
      remainingLimit: remainingLimit,  // ✅ api_usage 기반 실시간 계산
      todayUsed: todayUsed,            // ✅ api_usage.count에서 가져옴
      lastResetDate: user.lastResetDate || new Date().toISOString().split('T')[0],
      isActive: user.isActive !== false,
      isBanned: user.isBanned || false,
      isOnline: user.isOnline || false,
      lastActive: user.lastActive || new Date(),
      lastLogin: user.lastLogin || new Date(),
      provider: user.provider || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  return null
}

export async function getUserByEmail(email: string): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')
  const apiUsageCollection = db.collection('api_usage')

  const user = await usersCollection.findOne({ email })

  if (!user) return null

  // KST 기준 오늘 날짜
  const today = new Date()
  const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000)
  const todayStr = kstDate.toISOString().split('T')[0]

  // api_usage에서 오늘 사용량 조회
  const apiUsage = await apiUsageCollection.findOne({
    email: user.email,
    date: todayStr
  })

  const todayUsed = apiUsage?.count ?? 0
  const dailyLimit = user.dailyLimit || 20
  const remainingLimit = Math.max(0, dailyLimit - todayUsed)

  return {
    email: user.email,
    name: user.name || null,
    image: user.image || null,
    dailyLimit: dailyLimit,
    remainingLimit: remainingLimit,  // ✅ api_usage 기반 실시간 계산
    todayUsed: todayUsed,            // ✅ api_usage.count에서 가져옴
    lastResetDate: user.lastResetDate || new Date().toISOString().split('T')[0],
    isActive: user.isActive !== false,
    isBanned: user.isBanned || false,
    isOnline: user.isOnline || false,
    lastActive: user.lastActive || new Date(),
    lastLogin: user.lastLogin || new Date(),
    provider: user.provider || undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export async function updateUserLimit(
  email: string,
  dailyLimit: number,
  remainingLimit?: number
): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  console.log(`📝 updateUserLimit - email: ${email}, dailyLimit: ${dailyLimit}, remainingLimit: ${remainingLimit}`)

  const updateData: any = {
    dailyLimit,
    updatedAt: new Date(),
  }

  if (remainingLimit !== undefined) {
    updateData.remainingLimit = remainingLimit
  }

  const result = await usersCollection.findOneAndUpdate(
    { email },  // Email Primary Key
    { $set: updateData },
    { returnDocument: 'after' }
  )

  if (!result) return null

  console.log(`✅ 업데이트 완료: ${result.email}`)

  return {
    email: result.email,
    name: result.name || null,
    image: result.image || null,
    dailyLimit: result.dailyLimit || dailyLimit,
    remainingLimit: result.remainingLimit || remainingLimit || dailyLimit,
    todayUsed: result.todayUsed || 0,
    lastResetDate: result.lastResetDate || new Date().toISOString().split('T')[0],
    isActive: result.isActive !== false,
    isBanned: result.isBanned || false,
    isOnline: result.isOnline || false,
    lastActive: result.lastActive || new Date(),
    lastLogin: result.lastLogin || new Date(),
    provider: result.provider || undefined,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  }
}

export async function deactivateUser(email: string): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  console.log(`🔴 deactivateUser - email: ${email}`)

  const result = await usersCollection.findOneAndUpdate(
    { email },
    {
      $set: {
        isActive: false,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )

  if (!result) return null

  console.log(`✅ 비활성화 완료: ${result.email}`)

  return {
    email: result.email,
    name: result.name || null,
    image: result.image || null,
    dailyLimit: result.dailyLimit || 20,
    remainingLimit: result.remainingLimit || 20,
    todayUsed: result.todayUsed || 0,
    lastResetDate: result.lastResetDate || new Date().toISOString().split('T')[0],
    isActive: false,
    isBanned: result.isBanned || false,
    isOnline: result.isOnline || false,
    lastActive: result.lastActive || new Date(),
    lastLogin: result.lastLogin || new Date(),
    provider: result.provider || undefined,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  }
}

export async function activateUser(
  email: string,
  dailyLimit: number = 20
): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  console.log(`🟢 activateUser - email: ${email}, dailyLimit: ${dailyLimit}`)

  const result = await usersCollection.findOneAndUpdate(
    { email },
    {
      $set: {
        isActive: true,
        dailyLimit,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )

  if (!result) return null

  console.log(`✅ 활성화 완료: ${result.email}`)

  return {
    email: result.email,
    name: result.name || null,
    image: result.image || null,
    dailyLimit,
    remainingLimit: result.remainingLimit || dailyLimit,
    todayUsed: result.todayUsed || 0,
    lastResetDate: result.lastResetDate || new Date().toISOString().split('T')[0],
    isActive: true,
    isBanned: result.isBanned || false,
    isOnline: result.isOnline || false,
    lastActive: result.lastActive || new Date(),
    lastLogin: result.lastLogin || new Date(),
    provider: result.provider || undefined,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  }
}

/**
 * 사용자가 현재 온라인 상태인지 확인 (5분 이내 활동)
 */
export function isUserOnline(lastActive?: Date): boolean {
  if (!lastActive) return false

  const now = new Date().getTime()
  const lastTime = new Date(lastActive).getTime()

  // 5분(5 * 60 * 1000 = 300000ms) 이내 활동이 있으면 온라인
  return now - lastTime < 5 * 60 * 1000
}

/**
 * 현재 온라인 사용자 수 조회
 */
export async function getOnlineUsers(): Promise<number> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

  const onlineCount = await usersCollection.countDocuments({
    isActive: true,
    isBanned: false,
    lastActive: { $gte: fiveMinutesAgo },
  })

  return onlineCount
}

/**
 * 사용자 차단
 */
export async function banUser(
  email: string,
  reason: string,
  adminEmail: string
): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  console.log(`🚫 banUser - email: ${email}, reason: ${reason}, admin: ${adminEmail}`)

  const result = await usersCollection.findOneAndUpdate(
    { email },
    {
      $set: {
        isBanned: true,
        bannedAt: new Date(),
        bannedReason: reason,
        isOnline: false,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )

  if (!result) return null

  console.log(`✅ 사용자 차단 완료: ${result.email}`)

  return {
    email: result.email,
    name: result.name || null,
    image: result.image || null,
    dailyLimit: result.dailyLimit || 20,
    remainingLimit: result.remainingLimit || 20,
    todayUsed: result.todayUsed || 0,
    lastResetDate: result.lastResetDate || new Date().toISOString().split('T')[0],
    isActive: result.isActive !== false,
    isBanned: true,
    isOnline: false,
    lastActive: result.lastActive || new Date(),
    lastLogin: result.lastLogin || new Date(),
    provider: result.provider || undefined,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  }
}

/**
 * 사용자 차단 해제
 */
export async function unbanUser(
  email: string,
  adminEmail: string
): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  console.log(`✅ unbanUser - email: ${email}, admin: ${adminEmail}`)

  const result = await usersCollection.findOneAndUpdate(
    { email },
    {
      $set: {
        isBanned: false,
        updatedAt: new Date(),
      },
      $unset: {
        bannedAt: '',
        bannedReason: '',
      },
    },
    { returnDocument: 'after' }
  )

  if (!result) return null

  console.log(`✅ 사용자 차단 해제 완료: ${result.email}`)

  return {
    email: result.email,
    name: result.name || null,
    image: result.image || null,
    dailyLimit: result.dailyLimit || 20,
    remainingLimit: result.remainingLimit || 20,
    todayUsed: result.todayUsed || 0,
    lastResetDate: result.lastResetDate || new Date().toISOString().split('T')[0],
    isActive: result.isActive !== false,
    isBanned: false,
    isOnline: result.isOnline || false,
    lastActive: result.lastActive || new Date(),
    lastLogin: result.lastLogin || new Date(),
    provider: result.provider || undefined,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  }
}
