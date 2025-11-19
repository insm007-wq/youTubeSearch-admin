import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, searchUsers } from '@/lib/userLimits'
import { getTodayUsage } from '@/lib/apiUsage'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    let users

    if (query && query.trim()) {
      users = await searchUsers(query)
    } else {
      users = await getAllUsers()
    }

    // Fetch remaining usage for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        let remaining = user.dailyLimit
        try {
          if (user.userId && !user.isDeactivated) {
            console.log(`📊 Fetching usage for user: ${user.email} (userId: ${user.userId})`)
            const usage = await getTodayUsage(user.userId)
            console.log(`   ✅ Usage found - used: ${usage.used}, remaining: ${usage.remaining}`)
            remaining = usage.remaining
          } else {
            console.log(`⏭️  Skipping user: ${user.email} (userId: ${user.userId}, isDeactivated: ${user.isDeactivated})`)
          }
        } catch (error) {
          // If error, use dailyLimit as remaining
          console.error(`❌ Failed to fetch usage for user ${user.email}:`, error instanceof Error ? error.message : error)
        }

        return {
          _id: user._id?.toString(),
          userId: user.userId,
          email: user.email,
          name: user.name || null,
          image: user.image || null,
          dailyLimit: user.dailyLimit,
          remainingLimit: user.remainingLimit,  // 👈 remainingLimit 추가
          isDeactivated: user.isDeactivated,
          remaining,
          createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
          updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: usersWithStats,
      count: usersWithStats.length,
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { success: false, error: '사용자 목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}
