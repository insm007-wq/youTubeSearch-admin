import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, searchUsers } from '@/lib/userLimits'

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
