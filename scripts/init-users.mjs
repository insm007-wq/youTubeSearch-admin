import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다');
  process.exit(1);
}

async function initUsers() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ MongoDB 연결됨\n');

    const db = client.db('youtube-search');
    const usersCollection = db.collection('users');

    // Step 1: users 컬렉션 초기화
    console.log('📝 Step 1: users 컬렉션 업데이트 중...\n');

    const users = await usersCollection.find({}).toArray();
    console.log(`총 ${users.length}명의 사용자 처리 중...\n`);

    let updated = 0;
    for (const user of users) {
      const result = await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            remainingLimit: user.dailyLimit || 15,
            isActive: true,
            updatedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✓ ${user.email}`);
        console.log(`  remainingLimit: ${user.dailyLimit || 15}`);
        console.log(`  isActive: true\n`);
        updated++;
      }
    }

    console.log(`\n✅ ${updated}명 업데이트 완료\n`);

    // Step 2: user_limits 컬렉션 삭제
    console.log('=' .repeat(80));
    console.log('\n🗑️  Step 2: user_limits 컬렉션 삭제 중...\n');

    const userLimitsCollection = db.collection('user_limits');
    const dropResult = await db.dropCollection('user_limits').catch((err) => {
      if (err.code === 26) {
        // Collection doesn't exist
        console.log('ℹ️  user_limits 컬렉션이 없습니다.');
        return null;
      }
      throw err;
    });

    if (dropResult) {
      console.log('✅ user_limits 컬렉션 삭제 완료\n');
    }

    // Step 3: 결과 확인
    console.log('=' .repeat(80));
    console.log('\n📊 최종 확인\n');

    const finalUsers = await usersCollection.find({}).toArray();
    console.log(`✓ users 컬렉션: ${finalUsers.length}명`);

    // 샘플 데이터 표시
    console.log('\n📋 샘플 데이터 (처음 3명):\n');
    finalUsers.slice(0, 3).forEach((user, i) => {
      console.log(`[${i + 1}] ${user.email}`);
      console.log(`  dailyLimit: ${user.dailyLimit}`);
      console.log(`  remainingLimit: ${user.remainingLimit}`);
      console.log(`  isActive: ${user.isActive}`);
      console.log('');
    });

    console.log('=' .repeat(80));
    console.log('\n✅ 초기화 완료! users 테이블이 준비되었습니다.\n');
  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

initUsers();
