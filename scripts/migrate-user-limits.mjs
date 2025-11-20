import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'youtube-search';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다');
  process.exit(1);
}

async function migrateUserLimits() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ MongoDB 연결됨');

    const db = client.db(DATABASE_NAME);
    const usersCollection = db.collection('users');
    const userLimitsCollection = db.collection('user_limits');

    // 1. user_limits의 모든 데이터 조회
    const userLimits = await userLimitsCollection.find({}).toArray();
    console.log(`\n📊 user_limits에서 ${userLimits.length}개 레코드 조회`);

    // 2. users에 할당량 정보 추가
    let updated = 0;
    let skipped = 0;

    for (const limit of userLimits) {
      try {
        // email 또는 userId로 users 컬렉션에서 사용자 찾기
        const user = await usersCollection.findOne({
          $or: [
            { email: limit.email },
            { userId: limit.userId }
          ]
        });

        if (!user) {
          console.log(`⚠️  ${limit.email} - users 컬렉션에서 찾지 못함, 스킵`);
          skipped++;
          continue;
        }

        // users 컬렉션 업데이트
        const result = await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              dailyLimit: limit.dailyLimit || 15,
              remainingLimit: limit.remainingLimit || limit.dailyLimit || 15,
              isActive: !limit.isDeactivated, // 역변환
              updatedAt: new Date()
            }
          }
        );

        if (result.modifiedCount > 0) {
          console.log(`✅ ${limit.email} - 업데이트됨`);
          updated++;
        }
      } catch (error) {
        console.error(`❌ ${limit.email} - 오류:`, error.message);
      }
    }

    console.log(`\n📈 마이그레이션 결과:`);
    console.log(`   업데이트됨: ${updated}`);
    console.log(`   스킵됨: ${skipped}`);

    // 3. user_limits 컬렉션 삭제
    console.log(`\n🗑️  user_limits 컬렉션 삭제 중...`);
    const deleteResult = await db.dropCollection('user_limits').catch(() => {
      console.log('   (컬렉션이 없거나 이미 삭제됨)');
    });

    console.log('\n✓ 마이그레이션 완료!');
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// 실행
console.log('🔄 user_limits → users 마이그레이션 시작\n');
migrateUserLimits();
