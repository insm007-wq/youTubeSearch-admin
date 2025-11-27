import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, searchUsers, updateUserLimit } from '@/lib/userLimits'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    console.log(`🔵 GET /api/admin/users - query: "${query}", page: ${page}, limit: ${limit}`)

    let result

    if (query && query.trim()) {
      console.log(`🔍 검색 수행 - 검색어: "${query}"`)
      result = await searchUsers(query, page, limit)
      console.log(`📊 검색 결과: ${result.users.length}명 (전체: ${result.total}명)`)
    } else {
      console.log(`📋 전체 사용자 조회`)
      result = await getAllUsers(page, limit)
      console.log(`📊 전체 사용자: ${result.users.length}명 (전체: ${result.total}명, 페이지: ${result.page}/${result.totalPages})`)
    }

    return NextResponse.json({
      success: true,
      data: result.users,
      count: result.users.length,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { success: false, error: '사용자 목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dailyLimit, scope = 'all' } = body

    if (!dailyLimit || dailyLimit < 0) {
      return NextResponse.json(
        { success: false, error: '올바른 할당량을 입력해주세요 (0 이상)' },
        { status: 400 }
      )
    }

    console.log(`\n🔵 POST /api/admin/users (일괄 할당량 설정)`)
    console.log(`📥 요청:`, { dailyLimit, scope })

    const { db } = await connectToDatabase()
    const usersCollection = db.collection('users')

    // 대상 사용자 필터링
    let filter: any = {}

    if (scope === 'active') {
      filter = { isActive: true }
      console.log(`✅ 활성 사용자만 대상`)
    } else if (scope === 'inactive') {
      filter = { isActive: false }
      console.log(`❌ 비활성 사용자만 대상`)
    } else {
      console.log(`🔄 전체 사용자 대상`)
    }

    // 대상 사용자 조회
    const targetUsers = await usersCollection.find(filter).toArray()
    console.log(`📊 대상 사용자: ${targetUsers.length}명`)

    // KST 기준 오늘 날짜 계산
    const today = new Date()
    const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000)
    const todayStr = kstDate.toISOString().split('T')[0]

    const apiUsageCollection = db.collection('api_usage')

    // ✅ 1단계: 모든 대상 사용자의 api_usage를 한 번에 조회
    const targetEmails = targetUsers.map(u => u.email)
    const apiUsageRecords = await apiUsageCollection
      .find({
        email: { $in: targetEmails },
        date: todayStr
      })
      .toArray()

    // 2단계: Map으로 변환 (O(1) 조회)
    const usageMap = new Map(
      apiUsageRecords.map(r => [r.email, r.count || 0])
    )

    // 3단계: bulk 작업 배열 생성
    const bulkOps = targetUsers.map(user => {
      const todayUsed = usageMap.get(user.email) || 0
      const calculatedRemaining = Math.max(0, dailyLimit - todayUsed)

      return {
        updateOne: {
          filter: { email: user.email },
          update: {
            $set: {
              dailyLimit,
              remainingLimit: calculatedRemaining,
              lastResetDate: todayStr,
              updatedAt: new Date(),
            },
          }
        }
      }
    })

    // 4단계: 단일 bulkWrite 실행
    const bulkResult = await usersCollection.bulkWrite(bulkOps, { ordered: false })
    console.log(`✅ ${bulkResult.modifiedCount}명 업데이트 완료`)

    // 결과 생성
    const results = targetUsers.map((user, index) => {
      const todayUsed = usageMap.get(user.email) || 0
      const calculatedRemaining = Math.max(0, dailyLimit - todayUsed)
      return {
        email: user.email,
        status: 'success',
        dailyLimit,
        remainingLimit: calculatedRemaining,
        todayUsed,
      }
    })
    const updated = bulkResult.modifiedCount

    return NextResponse.json({
      success: true,
      message: `${updated}명의 사용자 할당량이 ${dailyLimit}로 설정되었습니다`,
      data: {
        scope,
        dailyLimit,
        totalUpdated: updated,
        totalFailed: targetUsers.length - updated,
        results,
      },
    })
  } catch (error) {
    console.error('Failed to bulk update users:', error)
    return NextResponse.json(
      { success: false, error: '일괄 업데이트에 실패했습니다' },
      { status: 500 }
    )
  }
}
