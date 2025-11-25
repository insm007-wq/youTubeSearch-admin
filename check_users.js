const { MongoClient } = require('mongodb');
const fs = require('fs');

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf-8');
const uri = envContent.split('\n').find(line => line.startsWith('MONGODB_URI=')).split('=')[1];

async function checkUsers() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('youtube-search');
    const users = await db.collection('users').find({}).toArray();
    
    console.log('📊 총 사용자 수:', users.length);
    console.log('\n사용자 목록:');
    users.forEach(u => {
      console.log(`- email: ${u.email}, _id: ${u._id}, name: ${u.name}`);
    });
  } finally {
    await client.close();
  }
}

checkUsers().catch(console.error);
