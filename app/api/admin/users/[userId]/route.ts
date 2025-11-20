import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUserLimit, deactivateUser, activateUser } from '@/lib/userLimits'

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
      email: user.email,
      isActive: user.isActive,
      dailyLimit: user.dailyLimit,
    })

    let updatedUser: any = user

    if (action === 'deactivate') {
      console.log(`🔴 비활성화 실행 - _id: ${_id}`)
      const result = await deactivateUser(_id)
      if (result) updatedUser = result
      console.log(`✅ 비활성화 완료 - isActive: ${result?.isActive}`)
    } else if (action === 'activate') {
      const limit = dailyLimit || 20
      console.log(`🟢 활성화 실행 - _id: ${_id}, limit: ${limit}`)
      const result = await activateUser(_id, limit)
      if (result) updatedUser = result
      console.log(`✅ 활성화 완료 - isActive: ${result?.isActive}`)
    } else if (action === 'reset_remaining') {
      // remainingLimit을 dailyLimit으로 초기화
      console.log(`🔄 잔여량 초기화 - _id: ${_id}, remainingLimit: ${user.dailyLimit}로 설정`)
      const result = await updateUserLimit(_id, user.dailyLimit, undefined, user.dailyLimit)
      if (result) updatedUser = result
      console.log(`✅ 잔여량 초기화 완료 - remainingLimit: ${result?.remainingLimit}`)
    } else if (remainingLimit !== undefined && dailyLimit === undefined) {
      // remainingLimit만 수정하는 경우
      console.log(`📝 잔여량 수정 - _id: ${_id}, remainingLimit: ${remainingLimit}`)
      const result = await updateUserLimit(_id, user.dailyLimit, undefined, remainingLimit)
      if (result) updatedUser = result
    } else if (dailyLimit !== undefined) {
      const previousLimit = user.dailyLimit
      // dailyLimit만 수정하는 경우: 기존 remainingLimit 보존
      console.log(`📝 할당량 수정 - _id: ${_id}, ${previousLimit} → ${dailyLimit}`)
      const result = await updateUserLimit(_id, dailyLimit, undefined, user.remainingLimit)
      if (result) updatedUser = result
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedUser,
        _id: updatedUser?._id?.toString() || user._id,
      },
    })
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { success: false, error: '사용자 정보를 업데이트하는데 실패했습니다' },
      { status: 500 }
    )
  }
}
