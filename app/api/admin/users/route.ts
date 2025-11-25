import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, searchUsers, updateUserLimit } from '@/lib/userLimits'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    console.log(`🔵 GET /api/admin/users - query: "${query}"`)

    let users

    if (query && query.trim()) {
      console.log(`🔍 검색 수행 - 검색어: "${query}"`)
      users = await searchUsers(query)
      console.log(`📊 검색 결과: ${users.length}명`)
      if (users.length > 0) {
        console.log(`📋 첫 번째 결과:`, users[0])
      }
    } else {
      console.log(`📋 전체 사용자 조회`)
      users = await getAllUsers()
      console.log(`📊 전체 사용자: ${users.length}명`)
    }

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
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

    // 일괄 업데이트
    let updated = 0
    const results = []

    for (const user of targetUsers) {
      try {
        const result = await usersCollection.updateOne(
          { email: user.email },
          {
            $set: {
              dailyLimit,
              remainingLimit: dailyLimit,
              updatedAt: new Date(),
            },
          }
        )

        if (result.modifiedCount > 0) {
          updated++
          console.log(`✅ ${user.email} → dailyLimit: ${dailyLimit}`)
          results.push({
            email: user.email,
            status: 'success',
            dailyLimit,
          })
        }
      } catch (error) {
        console.error(`❌ ${user.email} 업데이트 실패:`, error)
        results.push({
          email: user.email,
          status: 'failed',
          error: error instanceof Error ? error.message : '알 수 없는 오류',
        })
      }
    }

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
