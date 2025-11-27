import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { getGlobalStats } from '@/lib/apiUsage'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'day' // 'day', 'week', 'month'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const { db } = await connectToDatabase()
    const usageCollection = db.collection('api_usage')
    const usersCollection = db.collection('users')

    // 기본 통계 조회
    const stats = await getGlobalStats()

    // 시간대별 통계 (최근 7일)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const dateFormat = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // 최근 7일 일일 통계
    const dailyStats = await usageCollection
      .aggregate([
        {
          $match: {
            date: {
              $gte: dateFormat(sevenDaysAgo),
              $lte: dateFormat(now),
            },
          },
        },
        {
          $group: {
            _id: '$date',
            totalSearches: { $sum: '$count' },
            totalUsers: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ])
      .toArray()

    // 현재 접속 사용자 수 (30분 이내)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    const onlineCount = await usersCollection.countDocuments({
      isActive: true,
      isBanned: false,
      lastActive: { $gte: thirtyMinutesAgo },
    })

    // 전체 사용자 통계
    const userStats = await usersCollection
      .aggregate([
        {
          $facet: {
            active: [{ $match: { isActive: true } }, { $count: 'count' }],
            inactive: [{ $match: { isActive: false } }, { $count: 'count' }],
            banned: [{ $match: { isBanned: true } }, { $count: 'count' }],
            totalQuota: [
              { $group: { _id: null, total: { $sum: '$remainingLimit' } } },
            ],
            avgDailyLimit: [
              { $group: { _id: null, avg: { $avg: '$dailyLimit' } } },
            ],
          },
        },
      ])
      .toArray()

    const userStatsData = userStats[0] || {}

    // 상위 사용자 (가장 많이 사용)
    const topUsers = await usageCollection
      .aggregate([
        {
          $group: {
            _id: '$email',
            totalSearches: { $sum: '$count' },
          },
        },
        { $sort: { totalSearches: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'email',
            as: 'userInfo',
          },
        },
        {
          $project: {
            email: '$_id',
            totalSearches: 1,
            dailyLimit: {
              $arrayElemAt: ['$userInfo.dailyLimit', 0],
            },
            remainingLimit: {
              $arrayElemAt: ['$userInfo.remainingLimit', 0],
            },
            isActive: {
              $arrayElemAt: ['$userInfo.isActive', 0],
            },
          },
        },
      ])
      .toArray()

    // 할당량 사용률 분포 (0-25%, 25-50%, 50-75%, 75-100%)
    const quotaDistribution = await usersCollection
      .aggregate([
        {
          $addFields: {
            usedPercent: {
              $cond: [
                { $eq: ['$dailyLimit', 0] },
                0,
                {
                  $multiply: [
                    { $divide: [{ $subtract: ['$dailyLimit', '$remainingLimit'] }, '$dailyLimit'] },
                    100,
                  ],
                },
              ],
            },
          },
        },
        {
          $facet: {
            veryLow: [
              { $match: { usedPercent: { $lt: 25 } } },
              { $count: 'count' },
            ],
            low: [
              { $match: { usedPercent: { $gte: 25, $lt: 50 } } },
              { $count: 'count' },
            ],
            medium: [
              { $match: { usedPercent: { $gte: 50, $lt: 75 } } },
              { $count: 'count' },
            ],
            high: [
              { $match: { usedPercent: { $gte: 75 } } },
              { $count: 'count' },
            ],
          },
        },
      ])
      .toArray()

    const distribution = quotaDistribution[0] || {}

    return NextResponse.json({
      success: true,
      data: {
        today: stats,
        daily: dailyStats.map((day: any) => ({
          date: day._id,
          totalSearches: day.totalSearches,
          totalUsers: day.totalUsers,
          avgPerUser: day.totalUsers > 0 ? Math.round(day.totalSearches / day.totalUsers * 100) / 100 : 0,
        })),
        users: {
          active: userStatsData.active?.[0]?.count || 0,
          inactive: userStatsData.inactive?.[0]?.count || 0,
          banned: userStatsData.banned?.[0]?.count || 0,
          onlineUsers: onlineCount,
          totalUsers: (userStatsData.active?.[0]?.count || 0) + (userStatsData.inactive?.[0]?.count || 0),
          totalRemainingQuota: userStatsData.totalQuota?.[0]?.total || 0,
          avgDailyLimit: userStatsData.avgDailyLimit?.[0]?.avg ? Math.round(userStatsData.avgDailyLimit[0].avg) : 0,
        },
        topUsers: topUsers.map((user: any) => ({
          email: user.email,
          totalSearches: user.totalSearches,
          dailyLimit: user.dailyLimit || 0,
          remainingLimit: user.remainingLimit || 0,
          isActive: user.isActive || false,
        })),
        quotaDistribution: {
          veryLow: distribution.veryLow?.[0]?.count || 0, // 0-25% 사용
          low: distribution.low?.[0]?.count || 0, // 25-50% 사용
          medium: distribution.medium?.[0]?.count || 0, // 50-75% 사용
          high: distribution.high?.[0]?.count || 0, // 75-100% 사용
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json(
      { success: false, error: '통계를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}
