import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, searchUsers, updateUserLimit } from '@/lib/userLimits'
import { getTodayUsage } from '@/lib/apiUsage'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

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
        // ✅ remainingLimit이 설정되어 있으면 그 값을 우선 사용
        if (user.remainingLimit !== undefined && user.remainingLimit !== null) {
          console.log(`📊 Using saved remainingLimit for user: ${user.email} (remainingLimit: ${user.remainingLimit})`)
          return {
            _id: user._id?.toString(),
            userId: user.userId,
            email: user.email,
            name: user.name || null,
            image: user.image || null,
            dailyLimit: user.dailyLimit,
            remainingLimit: user.remainingLimit,
            isDeactivated: user.isDeactivated,
            remaining: user.remainingLimit,  // remainingLimit과 동기화
            createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
            updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
          }
        }

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

/**
 * 전체 또는 특정 사용자 그룹의 할당량을 일괄 설정
 * POST /api/admin/users
 * Body:
 *   - dailyLimit: number (설정할 일일 할당량)
 *   - scope: 'all' | 'active' | 'inactive' (기본값: 'all')
 *   - excludeIds?: string[] (제외할 사용자 ID 배열)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dailyLimit, scope = 'all', excludeIds = [] } = body

    if (!dailyLimit || dailyLimit < 0) {
      return NextResponse.json(
        { success: false, error: '올바른 할당량을 입력해주세요 (0 이상)' },
        { status: 400 }
      )
    }

    console.log(`\n🔵 POST /api/admin/users (전체 할당량 설정)`)
    console.log(`📥 요청:`, { dailyLimit, scope, excludeIds })

    const { db } = await connectToDatabase()
    const usersCollection = db.collection('users')
    const userLimitsCollection = db.collection('user_limits')

    // 대상 사용자 조회
    console.log(`🔍 scope: ${scope}`)

    // user_limits에서 활성/비활성 상태 조회
    const allUserLimits = await userLimitsCollection.find({}).toArray()
    console.log(`📊 user_limits 총 개수: ${allUserLimits.length}`)

    let targetUserIds: string[] = []

    if (scope === 'active') {
      // 활성 사용자: isDeactivated가 false인 사용자
      const activeUserLimits = allUserLimits.filter((u: any) => !u.isDeactivated)
      targetUserIds = activeUserLimits.map((u: any) => u.userId)
      console.log(`✅ 활성 사용자: ${targetUserIds.length}명`)
    } else if (scope === 'inactive') {
      // 비활성 사용자: isDeactivated가 true인 사용자
      const inactiveUserLimits = allUserLimits.filter((u: any) => u.isDeactivated)
      targetUserIds = inactiveUserLimits.map((u: any) => u.userId)
      console.log(`❌ 비활성 사용자: ${targetUserIds.length}명`)
    } else {
      // 전체: 모든 사용자
      targetUserIds = allUserLimits.map((u: any) => u.userId)
      console.log(`🔄 전체 사용자: ${targetUserIds.length}명`)
    }

    // 대상 사용자들을 users 컬렉션에서 조회
    let userFilter: any = { userId: { $exists: true } }
    if (targetUserIds.length > 0) {
      userFilter.userId = { $in: targetUserIds }
    }

    const users = await usersCollection.find(userFilter).toArray()
    console.log(`📊 조회된 대상 사용자 수: ${users.length}`)

    // 일괄 업데이트
    let updateCount = 0
    const results = await Promise.all(
      users.map(async (user: any) => {
        // 제외 리스트 확인
        if (excludeIds.includes(user._id?.toString())) {
          console.log(`⏭️  제외됨: ${user.email}`)
          return null
        }

        try {
          const result = await updateUserLimit(
            user.userId,
            dailyLimit,
            user.email
          )
          updateCount++
          console.log(`✅ 업데이트됨: ${user.email} → ${dailyLimit}`)
          return {
            userId: user._id?.toString(),
            email: user.email,
            status: 'success',
            dailyLimit,
          }
        } catch (error) {
          console.error(`❌ 실패: ${user.email}`, error)
          return {
            userId: user._id?.toString(),
            email: user.email,
            status: 'failed',
            error: error instanceof Error ? error.message : '알 수 없는 오류',
          }
        }
      })
    )

    const successResults = results.filter((r) => r?.status === 'success')
    const failedResults = results.filter((r) => r?.status === 'failed')

    return NextResponse.json({
      success: true,
      message: `${successResults.length}개의 사용자 할당량이 ${dailyLimit}로 설정되었습니다`,
      data: {
        scope,
        dailyLimit,
        totalUpdated: successResults.length,
        totalFailed: failedResults.length,
        results: successResults,
        failed: failedResults,
      },
    })
  } catch (error) {
    console.error('Failed to update all users:', error)
    return NextResponse.json(
      { success: false, error: '일괄 업데이트에 실패했습니다' },
      { status: 500 }
    )
  }
}
