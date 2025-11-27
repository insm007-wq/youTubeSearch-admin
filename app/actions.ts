'use server'

import { connectToDatabase } from '@/lib/mongodb'

/**
 * Get the count of online users (server action)
 */
export async function getOnlineUsersAction() {
  try {
    const { db } = await connectToDatabase()
    const usersCollection = db.collection('users')

    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

    const onlineCount = await usersCollection.countDocuments({
      isActive: true,
      isBanned: false,
      lastActive: { $gte: fiveMinutesAgo },
    })

    return onlineCount
  } catch (error) {
    console.error('Failed to get online users:', error)
    return 0
  }
}
