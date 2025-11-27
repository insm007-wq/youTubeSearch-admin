// MongoDB에 연결하여 사용자의 할당량 정보 초기화
const MongoClient = require('mongodb').MongoClient

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'

async function fixUserQuota() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    const db = client.db('youtube-search')
    const usersCollection = db.collection('users')
    
    const email = 'insm007@daum.net'
    
    // 사용자 조회
    const user = await usersCollection.findOne({ email })
    console.log('현재 사용자 정보:', user)
    
    // 할당량 초기화
    const result = await usersCollection.findOneAndUpdate(
      { email },
      {
        $set: {
          remainingLimit: user?.dailyLimit || 20,
          todayUsed: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )
    
    console.log('✅ 업데이트 완료:', result.value)
    
  } catch (error) {
    console.error('❌ 에러:', error)
  } finally {
    await client.close()
  }
}

fixUserQuota()
