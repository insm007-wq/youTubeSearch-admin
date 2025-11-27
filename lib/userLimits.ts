import { connectToDatabase } from './mongodb'
import { AdminUser } from '@/types/user'

export async function getAllUsers(
  page: number = 1,
  limit: number = 50
): Promise<{ users: AdminUser[]; total: number; page: number; totalPages: number }> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  // KST 기준 오늘 날짜
  const today = new Date()
  const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000)
  const todayStr = kstDate.toISOString().split('T')[0]

  // ✅ Aggregation Pipeline으로 N+1 쿼리 제거
  const pipeline = [
    // 1단계: api_usage 컬렉션과 JOIN
    {
      $lookup: {
        from: 'api_usage',
        let: { userEmail: '$email' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$email', '$$userEmail'] },
                  { $eq: ['$date', todayStr] }
                ]
              }
            }
          }
        ],
        as: 'apiUsageData'
      }
    },

    // 2단계: 필드 변환 및 계산
    {
      $project: {
        email: 1,
        name: { $ifNull: ['$name', null] },
        image: { $ifNull: ['$image', null] },
        dailyLimit: { $ifNull: ['$dailyLimit', 20] },
        todayUsed: {
          $ifNull: [{ $arrayElemAt: ['$apiUsageData.count', 0] }, 0]
        },
        remainingLimit: {
          $max: [
            0,
            {
              $subtract: [
                { $ifNull: ['$dailyLimit', 20] },
                { $ifNull: [{ $arrayElemAt: ['$apiUsageData.count', 0] }, 0] }
              ]
            }
          ]
        },
        lastResetDate: {
          $ifNull: ['$lastResetDate', todayStr]
        },
        isActive: { $ifNull: ['$isActive', true] },
        isBanned: { $ifNull: ['$isBanned', false] },
        isOnline: { $ifNull: ['$isOnline', false] },
        lastActive: { $ifNull: ['$lastActive', new Date()] },
        lastLogin: { $ifNull: ['$lastLogin', new Date()] },
        provider: { $ifNull: ['$provider', null] },
        createdAt: 1,
        updatedAt: 1
      }
    },

    // 3단계: 정렬
    { $sort: { createdAt: -1 } }
  ]

  // 전체 개수 조회
  const countResult = await usersCollection.aggregate([...pipeline, { $count: 'total' }]).toArray()
  const total = countResult[0]?.total ?? 0

  // 페이지네이션 적용
  const paginatedPipeline = [
    ...pipeline,
    { $skip: (page - 1) * limit },
    { $limit: limit }
  ]

  const users = await usersCollection.aggregate(paginatedPipeline).toArray()

  return {
    users: users as AdminUser[],
    total,
    page,
    totalPages: Math.ceil(total / limit)
  }
}

export async function searchUsers(
  query: string,
  page: number = 1,
  limit: number = 50
): Promise<{ users: AdminUser[]; total: number; page: number; totalPages: number }> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

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

  // ✅ Aggregation Pipeline으로 N+1 쿼리 제거
  const pipeline = [
    // 1단계: 검색 필터
    { $match: searchFilter },

    // 2단계: api_usage 컬렉션과 JOIN
    {
      $lookup: {
        from: 'api_usage',
        let: { userEmail: '$email' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$email', '$$userEmail'] },
                  { $eq: ['$date', todayStr] }
                ]
              }
            }
          }
        ],
        as: 'apiUsageData'
      }
    },

    // 3단계: 필드 변환 및 계산
    {
      $project: {
        email: 1,
        name: { $ifNull: ['$name', null] },
        image: { $ifNull: ['$image', null] },
        dailyLimit: { $ifNull: ['$dailyLimit', 20] },
        todayUsed: {
          $ifNull: [{ $arrayElemAt: ['$apiUsageData.count', 0] }, 0]
        },
        remainingLimit: {
          $max: [
            0,
            {
              $subtract: [
                { $ifNull: ['$dailyLimit', 20] },
                { $ifNull: [{ $arrayElemAt: ['$apiUsageData.count', 0] }, 0] }
              ]
            }
          ]
        },
        lastResetDate: {
          $ifNull: ['$lastResetDate', todayStr]
        },
        isActive: { $ifNull: ['$isActive', true] },
        isBanned: { $ifNull: ['$isBanned', false] },
        isOnline: { $ifNull: ['$isOnline', false] },
        lastActive: { $ifNull: ['$lastActive', new Date()] },
        lastLogin: { $ifNull: ['$lastLogin', new Date()] },
        provider: { $ifNull: ['$provider', null] },
        createdAt: 1,
        updatedAt: 1
      }
    },

    // 4단계: 정렬
    { $sort: { createdAt: -1 } }
  ]

  // 전체 개수 조회
  const countResult = await usersCollection.aggregate([...pipeline, { $count: 'total' }]).toArray()
  const total = countResult[0]?.total ?? 0

  // 페이지네이션 적용
  const paginatedPipeline = [
    ...pipeline,
    { $skip: (page - 1) * limit },
    { $limit: limit }
  ]

  const users = await usersCollection.aggregate(paginatedPipeline).toArray()

  return {
    users: users as AdminUser[],
    total,
    page,
    totalPages: Math.ceil(total / limit)
  }
}

export async function getUserById(email: string): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  console.log(`🔍 getUserById - email: ${email}`)

  // KST 기준 오늘 날짜
  const today = new Date()
  const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000)
  const todayStr = kstDate.toISOString().split('T')[0]

  // ✅ Aggregation Pipeline으로 N+1 쿼리 제거
  const pipeline = [
    // 1단계: 이메일로 필터
    { $match: { email } },

    // 2단계: api_usage 컬렉션과 JOIN
    {
      $lookup: {
        from: 'api_usage',
        let: { userEmail: '$email' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$email', '$$userEmail'] },
                  { $eq: ['$date', todayStr] }
                ]
              }
            }
          }
        ],
        as: 'apiUsageData'
      }
    },

    // 3단계: 필드 변환 및 계산
    {
      $project: {
        email: 1,
        name: { $ifNull: ['$name', null] },
        image: { $ifNull: ['$image', null] },
        dailyLimit: { $ifNull: ['$dailyLimit', 20] },
        todayUsed: {
          $ifNull: [{ $arrayElemAt: ['$apiUsageData.count', 0] }, 0]
        },
        remainingLimit: {
          $max: [
            0,
            {
              $subtract: [
                { $ifNull: ['$dailyLimit', 20] },
                { $ifNull: [{ $arrayElemAt: ['$apiUsageData.count', 0] }, 0] }
              ]
            }
          ]
        },
        lastResetDate: {
          $ifNull: ['$lastResetDate', todayStr]
        },
        isActive: { $ifNull: ['$isActive', true] },
        isBanned: { $ifNull: ['$isBanned', false] },
        isOnline: { $ifNull: ['$isOnline', false] },
        lastActive: { $ifNull: ['$lastActive', new Date()] },
        lastLogin: { $ifNull: ['$lastLogin', new Date()] },
        provider: { $ifNull: ['$provider', null] },
        createdAt: 1,
        updatedAt: 1
      }
    },

    // 4단계: 첫 결과만
    { $limit: 1 }
  ]

  const results = await usersCollection.aggregate(pipeline).toArray()

  if (results.length > 0) {
    console.log(`✅ 사용자 찾음: ${results[0].email}`)
    return results[0] as AdminUser
  }

  return null
}

export async function getUserByEmail(email: string): Promise<AdminUser | null> {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection('users')

  // KST 기준 오늘 날짜
  const today = new Date()
  const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000)
  const todayStr = kstDate.toISOString().split('T')[0]

  // ✅ Aggregation Pipeline으로 N+1 쿼리 제거
  const pipeline = [
    // 1단계: 이메일로 필터
    { $match: { email } },

    // 2단계: api_usage 컬렉션과 JOIN
    {
      $lookup: {
        from: 'api_usage',
        let: { userEmail: '$email' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$email', '$$userEmail'] },
                  { $eq: ['$date', todayStr] }
                ]
              }
            }
          }
        ],
        as: 'apiUsageData'
      }
    },

    // 3단계: 필드 변환 및 계산
    {
      $project: {
        email: 1,
        name: { $ifNull: ['$name', null] },
        image: { $ifNull: ['$image', null] },
        dailyLimit: { $ifNull: ['$dailyLimit', 20] },
        todayUsed: {
          $ifNull: [{ $arrayElemAt: ['$apiUsageData.count', 0] }, 0]
        },
        remainingLimit: {
          $max: [
            0,
            {
              $subtract: [
                { $ifNull: ['$dailyLimit', 20] },
                { $ifNull: [{ $arrayElemAt: ['$apiUsageData.count', 0] }, 0] }
              ]
            }
          ]
        },
        lastResetDate: {
          $ifNull: ['$lastResetDate', todayStr]
        },
        isActive: { $ifNull: ['$isActive', true] },
        isBanned: { $ifNull: ['$isBanned', false] },
        isOnline: { $ifNull: ['$isOnline', false] },
        lastActive: { $ifNull: ['$lastActive', new Date()] },
        lastLogin: { $ifNull: ['$lastLogin', new Date()] },
        provider: { $ifNull: ['$provider', null] },
        createdAt: 1,
        updatedAt: 1
      }
    },

    // 4단계: 첫 결과만
    { $limit: 1 }
  ]

  const results = await usersCollection.aggregate(pipeline).toArray()

  if (results.length > 0) {
    return results[0] as AdminUser
  }

  return null
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
