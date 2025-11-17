import { NextRequest, NextResponse } from 'next/server'
import { getAuditLogs, getAuditLogsByUser } from '@/lib/auditLogs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '100')

    let logs

    if (userId) {
      logs = await getAuditLogsByUser(userId, limit)
    } else {
      logs = await getAuditLogs(limit)
    }

    const formattedLogs = logs.map(log => ({
      ...log,
      _id: log._id?.toString(),
    }))

    return NextResponse.json({
      success: true,
      data: formattedLogs,
      count: formattedLogs.length,
    })
  } catch (error) {
    console.error('Failed to fetch logs:', error)
    return NextResponse.json(
      { success: false, error: '로그를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}
