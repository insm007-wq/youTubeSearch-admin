import { Collection, Db } from 'mongodb'
import { connectToDatabase } from './mongodb'

interface UserLimit {
  _id?: string
  userId: string
  email: string
  name?: string | null
  image?: string | null
  dailyLimit: number
  isDeactivated: boolean
  createdAt: Date
  updatedAt: Date
}

async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase()
  return db
}

function getUserLimitsCollection(db: Db): Collection<UserLimit> {
  return db.collection<UserLimit>('user_limits')
}

export async function getAllUsers(): Promise<UserLimit[]> {
  const db = await getDb()

  // 1. users 컬렉션에서 모든 로그인 사용자 조회
  const usersCollection = db.collection('users')
  const users = await usersCollection.find({}).sort({ createdAt: -1 }).toArray()

  // 2. user_limits 컬렉션에서 모든 설정 조회
  const userLimitsCollection = getUserLimitsCollection(db)
  const userLimits = await userLimitsCollection.find({}).toArray()

  // userId를 key로 하는 map으로 변환
  const userLimitsMap = new Map()
  userLimits.forEach((limit: any) => {
    userLimitsMap.set(limit.userId, limit)
  })

  // 3. users와 user_limits 병합
  const result: UserLimit[] = users.map((user: any) => {
    const userId = user._id.toString() // ObjectId를 string으로 변환
    const limit = userLimitsMap.get(userId)

    if (limit) {
      // user_limits에 있으면 해당 정보 사용
      return {
        _id: limit._id?.toString(),
        userId: userId,
        email: user.email,
        name: user.name,
        image: user.image,
        dailyLimit: limit.dailyLimit,
        isDeactivated: limit.isDeactivated,
        createdAt: limit.createdAt,
        updatedAt: limit.updatedAt,
      }
    } else {
      // user_limits에 없으면 기본값 사용 (새 소셜 로그인 사용자)
      return {
        _id: user._id?.toString(),
        userId: userId,
        email: user.email,
        name: user.name,
        image: user.image,
        dailyLimit: 20, // 기본값
        isDeactivated: false, // 기본값
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    }
  })

  return result
}

export async function getUserByEmail(email: string): Promise<UserLimit | null> {
  const db = await getDb()
  const collection = getUserLimitsCollection(db)

  return collection.findOne({ email })
}

export async function getUserById(userId: string): Promise<UserLimit | null> {
  const db = await getDb()
  const userLimitsCollection = getUserLimitsCollection(db)

  // Try to find by _id (MongoDB ObjectId) first in user_limits
  try {
    const { ObjectId } = require('mongodb')
    if (ObjectId.isValid(userId)) {
      const userLimit = await userLimitsCollection.findOne({ _id: new ObjectId(userId) })
      if (userLimit) return userLimit
    }
  } catch (e) {
    // If ObjectId creation fails, fall through to userId search
  }

  // Fall back to searching by userId field in user_limits
  let userLimit = await userLimitsCollection.findOne({ userId })
  if (userLimit) return userLimit

  // If not found in user_limits, check users collection (for new social login users)
  const usersCollection = db.collection('users')
  try {
    const { ObjectId } = require('mongodb')
    if (ObjectId.isValid(userId)) {
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
      if (user) {
        // Return user data merged with default limits
        return {
          _id: user._id?.toString(),
          userId: user._id?.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          dailyLimit: 20, // 기본값
          isDeactivated: false,
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date(),
        } as UserLimit
      }
    }
  } catch (e) {
    // Ignore errors and return null
  }

  return null
}

export async function searchUsers(query: string): Promise<UserLimit[]> {
  const db = await getDb()

  // 1. users 컬렉션에서 검색
  const usersCollection = db.collection('users')
  const searchFilter = {
    $or: [
      { email: { $regex: query, $options: 'i' } },
      { name: { $regex: query, $options: 'i' } },
    ],
  }
  const users = await usersCollection.find(searchFilter).sort({ createdAt: -1 }).toArray()

  // 2. user_limits 컬렉션에서 모든 설정 조회
  const userLimitsCollection = getUserLimitsCollection(db)
  const userLimits = await userLimitsCollection.find({}).toArray()

  // userId를 key로 하는 map으로 변환
  const userLimitsMap = new Map()
  userLimits.forEach((limit: any) => {
    userLimitsMap.set(limit.userId, limit)
  })

  // 3. users와 user_limits 병합
  const result: UserLimit[] = users.map((user: any) => {
    const userId = user._id.toString() // ObjectId를 string으로 변환
    const limit = userLimitsMap.get(userId)

    if (limit) {
      return {
        _id: limit._id?.toString(),
        userId: userId,
        email: user.email,
        name: user.name,
        image: user.image,
        dailyLimit: limit.dailyLimit,
        isDeactivated: limit.isDeactivated,
        createdAt: limit.createdAt,
        updatedAt: limit.updatedAt,
      }
    } else {
      return {
        _id: user._id?.toString(),
        userId: userId,
        email: user.email,
        name: user.name,
        image: user.image,
        dailyLimit: 20,
        isDeactivated: false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    }
  })

  return result
}

// Helper function to create query filter that works with both _id and userId
// 새로 추가된 사용자는 userId 필드를 가지고 있으므로 먼저 이것으로 검색
function createUserFilter(userId: string) {
  // 먼저 userId 필드로 검색 (새 소셜 로그인 사용자)
  return { userId }
}

export async function updateUserLimit(
  userId: string,
  dailyLimit: number
): Promise<UserLimit | null> {
  const db = await getDb()
  const collection = getUserLimitsCollection(db)
  const usersCollection = db.collection('users')

  // 새 레코드를 생성하는 경우 users 컬렉션에서 이메일 정보 조회
  let userEmail = 'unknown@example.com'
  try {
    const { ObjectId } = require('mongodb')
    if (ObjectId.isValid(userId)) {
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
      if (user) {
        userEmail = user.email
      }
    }
  } catch (e) {
    // Ignore
  }

  return collection.findOneAndUpdate(
    createUserFilter(userId),
    {
      $set: {
        userId,
        email: userEmail,
        dailyLimit,
        isDeactivated: false,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    {
      returnDocument: 'after',
      upsert: true  // ✅ 새 레코드 생성
    }
  )
}

export async function deactivateUser(userId: string): Promise<UserLimit | null> {
  const db = await getDb()
  const collection = getUserLimitsCollection(db)
  const usersCollection = db.collection('users')

  // 새 레코드를 생성하는 경우 users 컬렉션에서 이메일 정보 조회
  let userEmail = 'unknown@example.com'
  try {
    const { ObjectId } = require('mongodb')
    if (ObjectId.isValid(userId)) {
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
      if (user) {
        userEmail = user.email
      }
    }
  } catch (e) {
    // Ignore
  }

  return collection.findOneAndUpdate(
    createUserFilter(userId),
    {
      $set: {
        userId,
        email: userEmail,
        isDeactivated: true,
        dailyLimit: 0,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    {
      returnDocument: 'after',
      upsert: true
    }
  )
}

export async function activateUser(userId: string, dailyLimit: number = 20): Promise<UserLimit | null> {
  const db = await getDb()
  const collection = getUserLimitsCollection(db)
  const usersCollection = db.collection('users')

  // 새 레코드를 생성하는 경우 users 컬렉션에서 이메일 정보 조회
  let userEmail = 'unknown@example.com'
  try {
    const { ObjectId } = require('mongodb')
    if (ObjectId.isValid(userId)) {
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
      if (user) {
        userEmail = user.email
      }
    }
  } catch (e) {
    // Ignore
  }

  return collection.findOneAndUpdate(
    createUserFilter(userId),
    {
      $set: {
        userId,
        email: userEmail,
        isDeactivated: false,
        dailyLimit,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    {
      returnDocument: 'after',
      upsert: true
    }
  )
}
