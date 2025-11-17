// Investigation script to check API usage discrepancy
import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://insm007_db_user:8FSMNz7XdNLMqD8Y@youtube-search-cluster.wo6t609.mongodb.net/youtube-search?retryWrites=true&w=majority';

async function investigate() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('youtube-search');
    const apiUsageCollection = db.collection('api_usage');
    const usersCollection = db.collection('users');

    // Get today's date in YYYY-MM-DD format (KST)
    const today = new Date();
    const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000);
    const todayStr = kstDate.toISOString().split('T')[0];

    console.log(`\n📅 Today's date (KST): ${todayStr}\n`);

    // 1. Check all api_usage records for today
    console.log('='.repeat(80));
    console.log('1️⃣  All API usage records for today:');
    console.log('='.repeat(80));

    const todayRecords = await apiUsageCollection.find({ date: todayStr }).toArray();
    console.log(`Found ${todayRecords.length} records for today:\n`);

    todayRecords.forEach((record, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  userId: ${record.userId}`);
      console.log(`  email: ${record.email}`);
      console.log(`  date: ${record.date}`);
      console.log(`  count: ${record.count}`);
      console.log(`  createdAt: ${record.createdAt}`);
      console.log(`  updatedAt: ${record.updatedAt}`);
      console.log();
    });

    // 2. Check for duplicate userId records (different formats)
    console.log('='.repeat(80));
    console.log('2️⃣  Checking for duplicate userId formats:');
    console.log('='.repeat(80));

    const allUsage = await apiUsageCollection.find({}).toArray();
    const userIdGroups = {};

    allUsage.forEach(record => {
      const email = record.email;
      if (!userIdGroups[email]) {
        userIdGroups[email] = [];
      }
      userIdGroups[email].push({
        userId: record.userId,
        date: record.date,
        count: record.count
      });
    });

    console.log('\nGrouped by email:');
    Object.entries(userIdGroups).forEach(([email, records]) => {
      const uniqueUserIds = [...new Set(records.map(r => r.userId))];
      if (uniqueUserIds.length > 1) {
        console.log(`\n⚠️  ${email} has multiple userId formats:`);
        uniqueUserIds.forEach(uid => {
          const userRecords = records.filter(r => r.userId === uid);
          console.log(`   - userId: ${uid}`);
          console.log(`     Records: ${userRecords.length}`);
          userRecords.slice(0, 3).forEach(r => {
            console.log(`       ${r.date}: ${r.count} searches`);
          });
        });
      }
    });

    // 3. Check users collection for dailyLimit settings
    console.log('\n' + '='.repeat(80));
    console.log('3️⃣  Checking users collection for dailyLimit:');
    console.log('='.repeat(80));

    const users = await usersCollection.find({}).toArray();
    console.log(`\nFound ${users.length} users:\n`);

    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  _id: ${user._id}`);
      console.log(`  userId: ${user.userId || 'N/A'}`);
      console.log(`  email: ${user.email}`);
      console.log(`  dailyLimit: ${user.dailyLimit || 'N/A'}`);
      console.log(`  isDeactivated: ${user.isDeactivated || false}`);
      console.log();
    });

    // 4. Check for records with count >= 20
    console.log('='.repeat(80));
    console.log('4️⃣  Records with count >= 20:');
    console.log('='.repeat(80));

    const highUsageRecords = await apiUsageCollection.find({ count: { $gte: 20 } }).toArray();
    console.log(`\nFound ${highUsageRecords.length} records with count >= 20:\n`);

    highUsageRecords.forEach((record, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  userId: ${record.userId}`);
      console.log(`  email: ${record.email}`);
      console.log(`  date: ${record.date}`);
      console.log(`  count: ${record.count}`);
      console.log();
    });

    // 5. Summary
    console.log('='.repeat(80));
    console.log('5️⃣  Summary:');
    console.log('='.repeat(80));
    console.log(`Total api_usage records: ${allUsage.length}`);
    console.log(`Records for today (${todayStr}): ${todayRecords.length}`);
    console.log(`Total users: ${users.length}`);
    console.log(`Records with count >= 20: ${highUsageRecords.length}`);

    // Check if any today's records exceed 15 or 20
    const exceeds15 = todayRecords.filter(r => r.count >= 15);
    const exceeds20 = todayRecords.filter(r => r.count >= 20);
    console.log(`Today's records exceeding 15: ${exceeds15.length}`);
    console.log(`Today's records exceeding 20: ${exceeds20.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

investigate();
