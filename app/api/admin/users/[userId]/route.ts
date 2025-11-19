import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUserLimit, deactivateUser, activateUser } from '@/lib/userLimits'
import { logUserLimitChange, logUserDeactivation, logUserActivation } from '@/lib/auditLogs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const userId = (await params).userId
    const user = await getUserById(userId)

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        _id: user._id?.toString(),
      },
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
    const _id = (await params).userId
    const body = await request.json()
    const { dailyLimit, action, remainingLimit } = body

    console.log(`\n🔵 PATCH /api/admin/users/[${_id}]`)
    console.log(`📥 요청 body:`, { dailyLimit, action, remainingLimit })

    const user = await getUserById(_id)

    if (!user) {
      console.log(`❌ 사용자를 찾을 수 없음: ${_id}`)
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    console.log(`👤 조회된 사용자:`, {
      _id: user._id,
      userId: user.userId,
      email: user.email,
      isDeactivated: user.isDeactivated,
      dailyLimit: user.dailyLimit,
    })

    let updatedUser: any = user
    let log

    // user.userId는 "google:103840..." 형식 (실제 userId)
    const actualUserId = user.userId

    if (action === 'deactivate') {
      console.log(`🔴 비활성화 실행 - actualUserId: ${actualUserId}`)
      const result = await deactivateUser(actualUserId)
      if (result) updatedUser = result
      log = await logUserDeactivation(actualUserId, user.email)
      console.log(`✅ 비활성화 완료 - isDeactivated: ${result?.isDeactivated}`)
    } else if (action === 'activate') {
      const limit = dailyLimit || 20
      console.log(`🟢 활성화 실행 - actualUserId: ${actualUserId}, limit: ${limit}`)
      const result = await activateUser(actualUserId, limit)
      if (result) updatedUser = result
      log = await logUserActivation(actualUserId, user.email, limit)
      console.log(`✅ 활성화 완료 - isDeactivated: ${result?.isDeactivated}`)
    } else if (action === 'reset_remaining') {
      // remainingLimit을 dailyLimit으로 초기화
      console.log(`🔄 잔여량 초기화 - actualUserId: ${actualUserId}, remainingLimit: ${user.dailyLimit}로 설정`)
      const result = await updateUserLimit(actualUserId, user.dailyLimit, user.email, user.dailyLimit)
      if (result) updatedUser = result
      console.log(`✅ 잔여량 초기화 완료 - remainingLimit: ${result?.remainingLimit}`)
    } else if (remainingLimit !== undefined && dailyLimit === undefined) {
      // remainingLimit만 수정하는 경우
      console.log(`📝 잔여량 수정 - actualUserId: ${actualUserId}, remainingLimit: ${remainingLimit}`)
      const result = await updateUserLimit(actualUserId, user.dailyLimit, user.email, remainingLimit)
      if (result) updatedUser = result
    } else if (dailyLimit !== undefined) {
      const previousLimit = user.dailyLimit
      // dailyLimit만 수정하는 경우: 기존 remainingLimit 보존
      console.log(`📝 할당량 수정 - actualUserId: ${actualUserId}, ${previousLimit} → ${dailyLimit}, 기존 remainingLimit 보존: ${user.remainingLimit}`)
      const result = await updateUserLimit(actualUserId, dailyLimit, user.email, user.remainingLimit)
      if (result) updatedUser = result
      log = await logUserLimitChange(actualUserId, user.email, previousLimit, dailyLimit)
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedUser,
        _id: user.email,  // 이메일을 프라이머리 키로 사용
        remainingLimit: updatedUser?.remainingLimit,  // remainingLimit 명시적으로 포함
      },
      log,
    })
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { success: false, error: '사용자 정보를 업데이트하는데 실패했습니다' },
      { status: 500 }
    )
  }
}
