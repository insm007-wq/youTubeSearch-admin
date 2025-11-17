import { Collection, Db } from 'mongodb'
import { connectToDatabase } from './mongodb'

interface AuditLog {
  _id?: string
  action: string
  targetUserId: string
  targetUserEmail: string
  changeDetails: Record<string, any>
  previousValue?: any
  newValue?: any
  timestamp: Date
  adminNote?: string
}

async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase()
  return db
}

function getAuditLogsCollection(db: Db): Collection<AuditLog> {
  return db.collection<AuditLog>('audit_logs')
}

export async function createAuditLog(log: Omit<AuditLog, 'timestamp'>): Promise<AuditLog> {
  const db = await getDb()
  const collection = getAuditLogsCollection(db)

  // Ensure index exists
  await collection.createIndex({ timestamp: -1 })
  await collection.createIndex({ targetUserId: 1 })

  const result = await collection.insertOne({
    ...log,
    timestamp: new Date(),
  })

  return {
    ...log,
    _id: result.insertedId.toString(),
    timestamp: new Date(),
  }
}

export async function getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  const db = await getDb()
  const collection = getAuditLogsCollection(db)

  return collection.find({}).sort({ timestamp: -1 }).limit(limit).toArray()
}

export async function getAuditLogsByUser(userId: string, limit: number = 50): Promise<AuditLog[]> {
  const db = await getDb()
  const collection = getAuditLogsCollection(db)

  return collection
    .find({ targetUserId: userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray()
}

export async function logUserLimitChange(
  userId: string,
  email: string,
  previousLimit: number,
  newLimit: number
): Promise<AuditLog> {
  return createAuditLog({
    action: 'UPDATE_DAILY_LIMIT',
    targetUserId: userId,
    targetUserEmail: email,
    changeDetails: { previousLimit, newLimit },
    previousValue: previousLimit,
    newValue: newLimit,
  })
}

export async function logUserDeactivation(
  userId: string,
  email: string
): Promise<AuditLog> {
  return createAuditLog({
    action: 'DEACTIVATE_USER',
    targetUserId: userId,
    targetUserEmail: email,
    changeDetails: { status: 'deactivated' },
  })
}

export async function logUserActivation(
  userId: string,
  email: string,
  dailyLimit: number
): Promise<AuditLog> {
  return createAuditLog({
    action: 'ACTIVATE_USER',
    targetUserId: userId,
    targetUserEmail: email,
    changeDetails: { status: 'activated', dailyLimit },
  })
}
