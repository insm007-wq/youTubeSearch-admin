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
  const collection = db.collection<UserLimit>('user_limits')
  // 이메일을 프라이머리 키로 설정
  collection.createIndex({ email: 1 }, { unique: true }).catch(() => {
    // 인덱스가 이미 존재할 수 있음
  })
  return collection
}

export async function getAllUsers(): Promise<UserLimit[]> {
  const db = await getDb()

  // 메인 프로젝트의 users 컬렉션 사용 (userId: "provider:providerAccountId" 형식)
  const usersCollection = db.collection('users')
  const users = await usersCollection.find({}).sort({ createdAt: -1 }).toArray()

  // user_limits 컬렉션에서 모든 설정 조회
  const userLimitsCollection = getUserLimitsCollection(db)
  const userLimits = await userLimitsCollection.find({}).toArray()

  console.log(`\n📊 getAllUsers 시작`)
  console.log(`📊 user_limits 컬렉션 조회 결과 (${userLimits.length}개):`)
  userLimits.forEach((limit: any) => {
    console.log(`  ├─ userId: ${limit.userId}`)
    console.log(`     ├─ isDeactivated: ${limit.isDeactivated}`)
    console.log(`     ├─ dailyLimit: ${limit.dailyLimit}`)
    console.log(`     └─ email: ${limit.email}`)
  })

  // userId를 key로 하는 map으로 변환
  const userLimitsMap = new Map()
  userLimits.forEach((limit: any) => {
    userLimitsMap.set(limit.userId, limit)
  })

  // users와 user_limits 병합
  const resultPromises = users
    .filter((user: any) => user.userId && user.email) // userId 필드가 있는 사용자만 필터링 (메인의 users 컬렉션 구조)
    .map(async (user: any) => {
      // user.userId는 "kakao:4539914115" 형식
      // user_limits에서 찾을 때는 email로 검색하는 것이 가장 안전함
      const userEmail = user.email
      const limit = userLimits.find((l: any) => l.email === userEmail)

      if (limit) {
        // user_limits에 있으면 해당 정보 사용
        // user.userId는 이미 "google:123456" 형식이므로 그대로 사용
        console.log(`  ✅ user_limits에서 찾음: ${userEmail} (userId: ${user.userId}, isDeactivated: ${limit.isDeactivated})`)
        return {
          _id: user._id?.toString(),
          userId: user.userId, // 이미 "provider:id" 형식
          email: limit.email,
          name: user.name,
          image: user.image,
          dailyLimit: limit.dailyLimit,
          isDeactivated: limit.isDeactivated,
          createdAt: limit.createdAt,
          updatedAt: limit.updatedAt,
        }
      } else {
        // user_limits에 없으면 자동으로 생성
        console.log(`  ⚠️  user_limits에 없음 - 자동 생성: ${user.userId}`)
        const newLimit = await updateUserLimit(user.userId, 15, user.email)
        if (newLimit) {
          return {
            _id: user._id?.toString(),
            userId: user.userId, // 이미 "provider:id" 형식
            email: newLimit.email,
            name: user.name,
            image: user.image,
            dailyLimit: newLimit.dailyLimit,
            isDeactivated: newLimit.isDeactivated,
            createdAt: newLimit.createdAt,
            updatedAt: newLimit.updatedAt,
          }
        }

        // 생성 실패 시 기본값 반환
        return {
          _id: user._id?.toString(),
          userId: user.userId,
          email: user.email,
          name: user.name,
          image: user.image,
          dailyLimit: 15, // 기본값: 15
          isDeactivated: false, // 기본값
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      }
    })

  const result = await Promise.all(resultPromises)

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

  console.log(`\n🔍 getUserById 시작 - userId: ${userId}`)

  // Try to find by _id (MongoDB ObjectId) first in user_limits
  try {
    const { ObjectId } = require('mongodb')
    if (ObjectId.isValid(userId)) {
      console.log(`   ├─ ObjectId로 검색 시도: { _id: new ObjectId("${userId}") }`)
      const userLimit = await userLimitsCollection.findOne({ _id: new ObjectId(userId) })
      if (userLimit) {
        console.log(`   ├─ ✅ user_limits에서 찾음:`, {
          _id: userLimit._id,
          userId: userLimit.userId,
          email: userLimit.email,
          isDeactivated: userLimit.isDeactivated,
        })
        return userLimit
      }
      console.log(`   ├─ user_limits에서 못 찾음`)
    }
  } catch (e) {
    console.log(`   ├─ ObjectId 변환 실패:`, e)
  }

  // Fall back to searching by userId field in user_limits
  console.log(`   ├─ userId 필드로 검색 시도: { userId: "${userId}" }`)
  let userLimit = await userLimitsCollection.findOne({ userId })
  if (userLimit) {
    console.log(`   ├─ ✅ user_limits에서 찾음:`, {
      _id: userLimit._id,
      userId: userLimit.userId,
      email: userLimit.email,
      isDeactivated: userLimit.isDeactivated,
    })
    return userLimit
  }
  console.log(`   ├─ user_limits에서 못 찾음`)

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

  // 메인 프로젝트의 users 컬렉션에서 검색 (userId 필드가 있는 사용자만)
  const usersCollection = db.collection('users')
  const searchFilter = {
    userId: { $exists: true }, // 메인 프로젝트 구조 필터링
    $or: [
      { email: { $regex: query, $options: 'i' } },
      { name: { $regex: query, $options: 'i' } },
    ],
  }
  const users = await usersCollection.find(searchFilter).sort({ createdAt: -1 }).toArray()

  // user_limits 컬렉션에서 모든 설정 조회
  const userLimitsCollection = getUserLimitsCollection(db)
  const userLimits = await userLimitsCollection.find({}).toArray()

  // userId를 key로 하는 map으로 변환
  const userLimitsMap = new Map()
  userLimits.forEach((limit: any) => {
    userLimitsMap.set(limit.userId, limit)
  })

  // users와 user_limits 병합
  const result: UserLimit[] = users.map((user: any) => {
    const userId = user.userId // 메인에서 저장된 "provider:providerAccountId" 형식
    const limit = userLimitsMap.get(userId)

    if (limit) {
      return {
        _id: user._id?.toString(),
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
        dailyLimit: 15, // 기본값: 15
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
  dailyLimit: number,
  userEmail?: string
): Promise<UserLimit | null> {
  const db = await getDb()
  const collection = getUserLimitsCollection(db)
  const usersCollection = db.collection('users')

  // 새 레코드를 생성하는 경우 users 컬렉션에서 이메일 정보 조회
  let email = userEmail || 'unknown@example.com'

  // userEmail이 제공되지 않았을 경우만 조회
  if (!userEmail) {
    try {
      const { ObjectId } = require('mongodb')
      if (ObjectId.isValid(userId)) {
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
        if (user) {
          email = user.email
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  console.log(`📝 updateUserLimit 시작 - userId: ${userId}, dailyLimit: ${dailyLimit}, email: ${email}`)

  const filter = createUserFilter(userId)
  const existingRecord = await collection.findOne(filter)
  const currentIsDeactivated = existingRecord?.isDeactivated ?? false

  console.log(`   ├─ 기존 isDeactivated: ${currentIsDeactivated}`)

  const result = await collection.findOneAndUpdate(
    filter,
    {
      $set: {
        userId,
        email,
        dailyLimit,
        isDeactivated: currentIsDeactivated,  // 🔑 기존 상태 유지 (false로 리셋하지 않음)
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

  console.log(`   ├─ 저장된 isDeactivated: ${result?.isDeactivated}`)
  return result
}

export async function deactivateUser(userId: string): Promise<UserLimit | null> {
  const db = await getDb()
  const collection = getUserLimitsCollection(db)
  const usersCollection = db.collection('users')

  console.log(`🔴 deactivateUser 시작 - userId: ${userId}`)

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

  const filter = createUserFilter(userId)
  console.log(`📍 검색 필터: ${JSON.stringify(filter)}`)

  const result = await collection.findOneAndUpdate(
    filter,
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

  console.log(`✅ deactivateUser 결과:`, {
    isDeactivated: result?.isDeactivated,
    dailyLimit: result?.dailyLimit,
    userId: result?.userId,
    email: result?.email,
  })

  // 저장 후 즉시 재조회하여 확인
  const verify = await collection.findOne(filter)
  console.log(`🔍 저장 확인 재조회:`, {
    found: !!verify,
    isDeactivated: verify?.isDeactivated,
    dailyLimit: verify?.dailyLimit,
    userId: verify?.userId,
  })

  return result
}

export async function activateUser(userId: string, dailyLimit: number = 20): Promise<UserLimit | null> {
  const db = await getDb()
  const collection = getUserLimitsCollection(db)
  const usersCollection = db.collection('users')

  console.log(`🟢 activateUser 시작 - userId: ${userId}, dailyLimit: ${dailyLimit}`)

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

  const filter = createUserFilter(userId)
  const result = await collection.findOneAndUpdate(
    filter,
    {
      $set: {
        userId,
        email: userEmail,
        isDeactivated: false,  // 활성화: false로 명시적 설정
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

  console.log(`✅ activateUser 결과:`, {
    isDeactivated: result?.isDeactivated,
    dailyLimit: result?.dailyLimit,
  })

  return result
}
