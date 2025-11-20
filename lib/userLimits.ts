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
    _id: user._id?.toString(),
    email: user.email,
    name: user.name || null,
    image: user.image || null,
    dailyLimit: user.dailyLimit || 15,
    remainingLimit: user.remainingLimit || 15,
    isActive: user.isActive !== false, // 기본값 true
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
    _id: user._id?.toString(),
    email: user.email,
    name: user.name || null,
    image: user.image || null,
    dailyLimit: user.dailyLimit || 15,
    remainingLimit: user.remainingLimit || 15,
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }))
}

export async function getUserById(userId: string): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  console.log(`🔍 getUserById - userId: ${userId}`)

  try {
    const { ObjectId } = require('mongodb')
    if (ObjectId.isValid(userId)) {
      const user = await usersCollection.findOne({
        _id: new ObjectId(userId),
      })

      if (user) {
        console.log(`✅ 사용자 찾음: ${user.email}`)
        return {
          _id: user._id?.toString(),
          email: user.email,
          name: user.name || null,
          image: user.image || null,
          dailyLimit: user.dailyLimit || 15,
          remainingLimit: user.remainingLimit || 15,
          isActive: user.isActive !== false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      }
    }
  } catch (e) {
    console.log(`ObjectId 변환 실패:`, e)
  }

  return null
}

export async function getUserByEmail(email: string): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  const user = await usersCollection.findOne({ email })

  if (!user) return null

  return {
    _id: user._id?.toString(),
    email: user.email,
    name: user.name || null,
    image: user.image || null,
    dailyLimit: user.dailyLimit || 15,
    remainingLimit: user.remainingLimit || 15,
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export async function updateUserLimit(
  userId: string,
  dailyLimit: number,
  userEmail?: string,
  remainingLimit?: number
): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  console.log(
    `📝 updateUserLimit - userId: ${userId}, dailyLimit: ${dailyLimit}, remainingLimit: ${remainingLimit}`
  )

  const { ObjectId } = require('mongodb')
  let filter: any = {}

  if (ObjectId.isValid(userId)) {
    filter = { _id: new ObjectId(userId) }
  } else {
    filter = { email: userId }
  }

  const updateData: any = {
    dailyLimit,
    updatedAt: new Date(),
  }

  if (remainingLimit !== undefined) {
    updateData.remainingLimit = remainingLimit
  }

  const result = await usersCollection.findOneAndUpdate(filter, {
    $set: updateData,
  })

  if (!result) return null

  console.log(`✅ 업데이트 완료: ${result.email}`)

  return {
    _id: result._id?.toString(),
    email: result.email,
    name: result.name || null,
    image: result.image || null,
    dailyLimit: result.dailyLimit || dailyLimit,
    remainingLimit: result.remainingLimit || remainingLimit || dailyLimit,
    isActive: result.isActive !== false,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  }
}

export async function deactivateUser(userId: string): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  console.log(`🔴 deactivateUser - userId: ${userId}`)

  const { ObjectId } = require('mongodb')
  let filter: any = {}

  if (ObjectId.isValid(userId)) {
    filter = { _id: new ObjectId(userId) }
  } else {
    filter = { email: userId }
  }

  const result = await usersCollection.findOneAndUpdate(filter, {
    $set: {
      isActive: false,
      updatedAt: new Date(),
    },
  })

  if (!result) return null

  console.log(`✅ 비활성화 완료: ${result.email}`)

  return {
    _id: result._id?.toString(),
    email: result.email,
    name: result.name || null,
    image: result.image || null,
    dailyLimit: result.dailyLimit || 15,
    remainingLimit: result.remainingLimit || 15,
    isActive: false,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  }
}

export async function activateUser(
  userId: string,
  dailyLimit: number = 20
): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  console.log(`🟢 activateUser - userId: ${userId}, dailyLimit: ${dailyLimit}`)

  const { ObjectId } = require('mongodb')
  let filter: any = {}

  if (ObjectId.isValid(userId)) {
    filter = { _id: new ObjectId(userId) }
  } else {
    filter = { email: userId }
  }

  const result = await usersCollection.findOneAndUpdate(filter, {
    $set: {
      isActive: true,
      dailyLimit,
      updatedAt: new Date(),
    },
  })

  if (!result) return null

  console.log(`✅ 활성화 완료: ${result.email}`)

  return {
    _id: result._id?.toString(),
    email: result.email,
    name: result.name || null,
    image: result.image || null,
    dailyLimit,
    remainingLimit: result.remainingLimit || dailyLimit,
    isActive: true,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  }
}
