import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다');
  process.exit(1);
}

async function checkUserLimits() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ MongoDB 연결됨\n');

    const db = client.db('youtube-search');
    const userLimitsCollection = db.collection('user_limits');

    // user_limits 컬렉션의 모든 데이터 조회
    const userLimits = await userLimitsCollection.find({}).toArray();

    console.log(`📊 user_limits 컬렉션 총 ${userLimits.length}개 레코드\n`);
    console.log('='.repeat(100));

    if (userLimits.length === 0) {
      console.log('\n⚠️  user_limits 컬렉션이 비어있습니다.\n');
    } else {
      userLimits.forEach((limit, index) => {
        console.log(`\n[${index + 1}] ${limit.email}`);
        console.log(`  _id: ${limit._id}`);
        console.log(`  userId: ${limit.userId || '(없음)'}`);
        console.log(`  dailyLimit: ${limit.dailyLimit || '(없음)'}`);
        console.log(`  remainingLimit: ${limit.remainingLimit || '(없음)'}`);
        console.log(`  isDeactivated: ${limit.isDeactivated || 'false'}`);
        console.log(`  createdAt: ${limit.createdAt || '(없음)'}`);
      });
    }

    console.log('\n' + '='.repeat(100));

    // 비교: users vs user_limits
    console.log('\n\n📈 비교 분석\n');
    const usersCollection = db.collection('users');
    const users = await usersCollection.find({}).toArray();

    console.log(`users 컬렉션: ${users.length}명`);
    console.log(`user_limits 컬렉션: ${userLimits.length}명`);
    console.log(`차이: ${Math.abs(users.length - userLimits.length)}명\n`);

    // users에만 있는 사용자
    const userEmails = new Set(users.map(u => u.email));
    const limitEmails = new Set(userLimits.map(l => l.email));

    const onlyInUsers = Array.from(userEmails).filter(e => !limitEmails.has(e));
    const onlyInLimits = Array.from(limitEmails).filter(e => !userEmails.has(e));

    if (onlyInUsers.length > 0) {
      console.log(`⚠️  users에만 있는 사용자 (${onlyInUsers.length}명):`);
      onlyInUsers.forEach(email => console.log(`   - ${email}`));
    }

    if (onlyInLimits.length > 0) {
      console.log(`⚠️  user_limits에만 있는 사용자 (${onlyInLimits.length}명):`);
      onlyInLimits.forEach(email => console.log(`   - ${email}`));
    }

    if (onlyInUsers.length === 0 && onlyInLimits.length === 0) {
      console.log('✓ 두 컬렉션의 이메일이 완벽하게 일치합니다.');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

checkUserLimits();
