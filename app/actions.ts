'use server'

import { connectToDatabase } from '@/lib/mongodb'

/**
 * Get the count of online users (server action)
 * Online threshold: 30 minutes (1800 seconds) of activity
 */
export async function getOnlineUsersAction() {
  try {
    const { db } = await connectToDatabase()
    const usersCollection = db.collection('users')

    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)

    console.log(`🔵 [getOnlineUsersAction] 온라인 사용자 조회 - 기준시간: ${thirtyMinutesAgo.toISOString()}`)

    const onlineCount = await usersCollection.countDocuments({
      isActive: true,
      isBanned: false,
      lastActive: { $gte: thirtyMinutesAgo },
    })

    console.log(`✅ [getOnlineUsersAction] 온라인 사용자: ${onlineCount}명`)

    return onlineCount
  } catch (error) {
    console.error('❌ [getOnlineUsersAction] 오류:', error)
    return 0
  }
}
