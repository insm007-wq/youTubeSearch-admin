import { ObjectId } from 'mongodb'
import { connectToDatabase } from './mongodb'

interface AuditLog {
  _id?: ObjectId
  email: string  // 작업을 수행한 관리자 또는 사용자 이메일
  action: string  // 수행한 작업 (예: 'DEACTIVATE_USER', 'UPDATE_LIMIT')
  targetEmail?: string  // 대상 사용자 이메일
  changes?: Record<string, any>  // 변경 내용
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  status: 'success' | 'failed'  // 작업 결과
  errorMessage?: string
}

export async function createAuditLog(log: Omit<AuditLog, '_id' | 'timestamp'>): Promise<AuditLog> {
  const { db } = await connectToDatabase()
  const collection = db.collection<AuditLog>('audit_logs')

  const logEntry: AuditLog = {
    ...log,
    timestamp: new Date(),
  }

  const result = await collection.insertOne(logEntry as any)

  return {
    ...logEntry,
    _id: result.insertedId,
  }
}

export async function getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  const { db } = await connectToDatabase()
  const collection = db.collection<AuditLog>('audit_logs')

  const logs = await collection
    .find({})
    .sort({ timestamp: -1 })
    .limit(Math.min(limit, 1000))
    .toArray()

  return logs
}

export async function getAuditLogsByUser(email: string, limit: number = 100): Promise<AuditLog[]> {
  const { db } = await connectToDatabase()
  const collection = db.collection<AuditLog>('audit_logs')

  const logs = await collection
    .find({
      $or: [
        { email }, // 이 사용자가 수행한 작업
        { targetEmail: email }, // 이 사용자를 대상으로 한 작업
      ],
    })
    .sort({ timestamp: -1 })
    .limit(Math.min(limit, 1000))
    .toArray()

  return logs
}

export async function getAuditLogsByAction(action: string, limit: number = 100): Promise<AuditLog[]> {
  const { db } = await connectToDatabase()
  const collection = db.collection<AuditLog>('audit_logs')

  const logs = await collection
    .find({ action })
    .sort({ timestamp: -1 })
    .limit(Math.min(limit, 1000))
    .toArray()

  return logs
}

export async function getAuditLogsByDateRange(
  startDate: Date,
  endDate: Date,
  limit: number = 100
): Promise<AuditLog[]> {
  const { db } = await connectToDatabase()
  const collection = db.collection<AuditLog>('audit_logs')

  const logs = await collection
    .find({
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    })
    .sort({ timestamp: -1 })
    .limit(Math.min(limit, 1000))
    .toArray()

  return logs
}
