import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUserLimit, deactivateUser, activateUser, banUser, unbanUser } from '@/lib/userLimits'
import { createAuditLog } from '@/lib/auditLogs'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const email = (await params).userId  // URL params로 email 받음
    const user = await getUserById(email)

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json(
      { success: false, error: '사용자 정보를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const email = (await params).userId  // URL params로 email 받음
    const body = await request.json()
    const { dailyLimit, action, remainingLimit, bannedReason } = body

    console.log(`🔵 PATCH /api/admin/users/${email}`, { dailyLimit, action, remainingLimit, bannedReason })

    const user = await getUserById(email)

    if (!user) {
      console.log(`❌ 사용자를 찾을 수 없음: ${email}`)
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    console.log(`👤 조회된 사용자: ${email}, isActive: ${user.isActive}, dailyLimit: ${user.dailyLimit}`)

    let updatedUser: any = user

    if (action === 'deactivate') {
      console.log(`🔴 비활성화 실행 - email: ${email}`)
      const result = await deactivateUser(email)
      if (result) {
        updatedUser = result
        // ✅ 감사 로그 기록
        await createAuditLog({
          email: 'admin@youtube-search.com',
          action: 'DEACTIVATE_USER',
          targetEmail: email,
          status: 'success',
          changes: { isActive: false }
        })
      }
    } else if (action === 'activate') {
      const limit = dailyLimit || 20
      console.log(`🟢 활성화 실행 - email: ${email}, limit: ${limit}`)
      const result = await activateUser(email, limit)
      if (result) {
        updatedUser = result
        // ✅ 감사 로그 기록
        await createAuditLog({
          email: 'admin@youtube-search.com',
          action: 'ACTIVATE_USER',
          targetEmail: email,
          status: 'success',
          changes: { isActive: true, dailyLimit: limit }
        })
      }
    } else if (action === 'ban') {
      // ✅ 사용자 차단
      console.log(`🚫 차단 실행 - email: ${email}, reason: ${bannedReason}`)
      const result = await banUser(email, bannedReason || '관리자에 의해 차단됨', 'admin@youtube-search.com')
      if (result) {
        updatedUser = result
        // ✅ 감사 로그 기록
        await createAuditLog({
          email: 'admin@youtube-search.com',
          action: 'BAN_USER',
          targetEmail: email,
          status: 'success',
          changes: { isBanned: true, bannedReason: bannedReason || '관리자에 의해 차단됨' }
        })
      }
    } else if (action === 'unban') {
      // ✅ 사용자 차단 해제
      console.log(`✅ 차단 해제 실행 - email: ${email}`)
      const result = await unbanUser(email, 'admin@youtube-search.com')
      if (result) {
        updatedUser = result
        // ✅ 감사 로그 기록
        await createAuditLog({
          email: 'admin@youtube-search.com',
          action: 'UNBAN_USER',
          targetEmail: email,
          status: 'success',
          changes: { isBanned: false }
        })
      }
    } else if (action === 'reset_remaining') {
      console.log(`🔄 잔여량 초기화 - email: ${email}`)

      const today = new Date()
      const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000)
      const todayStr = kstDate.toISOString().split('T')[0]

      const { db } = await connectToDatabase()
      const apiUsageCollection = db.collection('api_usage')

      // ✅ api_usage 컬렉션에서 오늘의 기록 초기화 (count = 0으로 리셋)
      await apiUsageCollection.updateOne(
        { email, date: todayStr },
        {
          $set: {
            count: 0,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      )

      console.log(`  → api_usage.count를 0으로 초기화`)

      // users 컬렉션도 업데이트 (remainingLimit = dailyLimit)
      const result = await updateUserLimit(email, user.dailyLimit, user.dailyLimit)
      if (result) {
        updatedUser = result
        // ✅ 감사 로그 기록
        await createAuditLog({
          email: 'admin@youtube-search.com',
          action: 'RESET_REMAINING',
          targetEmail: email,
          status: 'success',
          changes: { remainingLimit: user.dailyLimit, apiUsageCount: 0 }
        })
      }
    } else if (remainingLimit !== undefined && dailyLimit === undefined) {
      console.log(`📝 잔여량 수정 - email: ${email}, remainingLimit: ${remainingLimit}`)
      const result = await updateUserLimit(email, user.dailyLimit, remainingLimit)
      if (result) {
        updatedUser = result
        // ✅ 감사 로그 기록
        await createAuditLog({
          email: 'admin@youtube-search.com',
          action: 'UPDATE_REMAINING_LIMIT',
          targetEmail: email,
          status: 'success',
          changes: { remainingLimit: remainingLimit }
        })
      }
    } else if (dailyLimit !== undefined) {
      console.log(`📝 할당량 수정 - email: ${email}, ${user.dailyLimit} → ${dailyLimit}`)

      // api_usage에서 오늘 사용량 조회
      const today = new Date()
      const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000)
      const todayStr = kstDate.toISOString().split('T')[0]

      // 임시로 db 연결 (유저 수정용)
      let apiUsageDb
      try {
        const dbConn = await connectToDatabase()
        apiUsageDb = dbConn.db
      } catch (error) {
        console.warn(`⚠️ api_usage 조회 실패:`, error)
        apiUsageDb = null
      }

      let todayUsed = 0
      if (apiUsageDb) {
        const apiUsageCollection = apiUsageDb.collection('api_usage')
        const apiUsage = await apiUsageCollection.findOne({
          email,
          date: todayStr
        })
        todayUsed = apiUsage?.count ?? 0
      }

      const calculatedRemaining = Math.max(0, dailyLimit - todayUsed)

      const result = await updateUserLimit(email, dailyLimit, calculatedRemaining)
      if (result) {
        updatedUser = result
        // ✅ 감사 로그 기록
        await createAuditLog({
          email: 'admin@youtube-search.com',
          action: 'UPDATE_DAILY_LIMIT',
          targetEmail: email,
          status: 'success',
          changes: {
            dailyLimit: dailyLimit,
            remainingLimit: calculatedRemaining
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
    })
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { success: false, error: '사용자 정보를 업데이트하는데 실패했습니다' },
      { status: 500 }
    )
  }
}
