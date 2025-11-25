import { connectToDatabase } from './mongodb'
import { AdminUser } from '@/types/user'

export async function getAllUsers(): Promise<AdminUser[]> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  const users = await usersCollection
    .find({})
    .sort({ createdAt: -1 })
    .toArray()

  return users.map((user: any) => ({
    email: user.email,
    name: user.name || null,
    image: user.image || null,
    dailyLimit: user.dailyLimit || 20,
    remainingLimit: user.remainingLimit || 20,
    todayUsed: user.todayUsed || 0,
    lastResetDate: user.lastResetDate || new Date().toISOString().split('T')[0],
    isActive: user.isActive !== false,
    isBanned: user.isBanned || false,
    isOnline: user.isOnline || false,
    lastActive: user.lastActive || new Date(),
    lastLogin: user.lastLogin || new Date(),
    provider: user.provider || undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }))
}

export async function searchUsers(query: string): Promise<AdminUser[]> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

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

  return users.map((user: any) => ({
    email: user.email,
    name: user.name || null,
    image: user.image || null,
    dailyLimit: user.dailyLimit || 20,
    remainingLimit: user.remainingLimit || 20,
    todayUsed: user.todayUsed || 0,
    lastResetDate: user.lastResetDate || new Date().toISOString().split('T')[0],
    isActive: user.isActive !== false,
    isBanned: user.isBanned || false,
    isOnline: user.isOnline || false,
    lastActive: user.lastActive || new Date(),
    lastLogin: user.lastLogin || new Date(),
    provider: user.provider || undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }))
}

export async function getUserById(email: string): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  console.log(`🔍 getUserById - email: ${email}`)

  const user = await usersCollection.findOne({ email })

  if (user) {
    console.log(`✅ 사용자 찾음: ${user.email}`)
    return {
      email: user.email,
      name: user.name || null,
      image: user.image || null,
      dailyLimit: user.dailyLimit || 20,
      remainingLimit: user.remainingLimit || 20,
      todayUsed: user.todayUsed || 0,
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

  const user = await usersCollection.findOne({ email })

  if (!user) return null

  return {
    email: user.email,
    name: user.name || null,
    image: user.image || null,
    dailyLimit: user.dailyLimit || 20,
    remainingLimit: user.remainingLimit || 20,
    todayUsed: user.todayUsed || 0,
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

  console.log(`📝 updateUserLimit - email: ${email}, dailyLimit: ${dailyLimit}`)

  const updateData: any = {
    dailyLimit,
    updatedAt: new Date(),
  }

  if (remainingLimit !== undefined) {
    updateData.remainingLimit = remainingLimit
  }

  const result = await usersCollection.findOneAndUpdate(
    { email },
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
