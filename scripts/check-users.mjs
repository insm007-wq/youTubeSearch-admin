import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다');
  process.exit(1);
}

async function checkUsers() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ MongoDB 연결됨\n');

    const db = client.db('youtube-search');
    const usersCollection = db.collection('users');

    // users 컬렉션의 모든 데이터 조회
    const users = await usersCollection.find({}).toArray();

    console.log(`📊 users 컬렉션 총 ${users.length}개 레코드\n`);
    console.log('='.repeat(100));

    users.forEach((user, index) => {
      console.log(`\n[${index + 1}] ${user.email}`);
      console.log(`  _id: ${user._id}`);
      console.log(`  name: ${user.name || '(없음)'}`);
      console.log(`  dailyLimit: ${user.dailyLimit || '(없음)'}`);
      console.log(`  remainingLimit: ${user.remainingLimit || '(없음)'}`);
      console.log(`  isActive: ${user.isActive !== false ? 'true' : 'false'}`);
      console.log(`  provider: ${user.provider || '(없음)'}`);
      console.log(`  createdAt: ${user.createdAt || '(없음)'}`);
    });

    console.log('\n' + '='.repeat(100));
  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

checkUsers();
