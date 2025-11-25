import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUserLimit, deactivateUser, activateUser } from '@/lib/userLimits'

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
    const { dailyLimit, action, remainingLimit } = body

    console.log(`🔵 PATCH /api/admin/users/${email}`, { dailyLimit, action, remainingLimit })

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
      if (result) updatedUser = result
    } else if (action === 'activate') {
      const limit = dailyLimit || 20
      console.log(`🟢 활성화 실행 - email: ${email}, limit: ${limit}`)
      const result = await activateUser(email, limit)
      if (result) updatedUser = result
    } else if (action === 'reset_remaining') {
      console.log(`🔄 잔여량 초기화 - email: ${email}, remainingLimit: ${user.dailyLimit}로 설정`)
      const result = await updateUserLimit(email, user.dailyLimit, user.dailyLimit)
      if (result) updatedUser = result
    } else if (remainingLimit !== undefined && dailyLimit === undefined) {
      console.log(`📝 잔여량 수정 - email: ${email}, remainingLimit: ${remainingLimit}`)
      const result = await updateUserLimit(email, user.dailyLimit, remainingLimit)
      if (result) updatedUser = result
    } else if (dailyLimit !== undefined) {
      console.log(`📝 할당량 수정 - email: ${email}, ${user.dailyLimit} → ${dailyLimit}`)
      const result = await updateUserLimit(email, dailyLimit, user.remainingLimit)
      if (result) updatedUser = result
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
