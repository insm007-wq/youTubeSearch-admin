const bcrypt = require("bcryptjs");

const passwords = [
  { email: "insm007@naver.com", password: "ism204241!" },
  { email: "aiyumisejong@gmail.com", password: "dodbal3rl" },
];

async function hashPasswords() {
  const credentials = [];

  for (const admin of passwords) {
    const hashed = await bcrypt.hash(admin.password, 10);
    credentials.push(`${admin.email}:${hashed}`);
    console.log(`${admin.email}: ${hashed}`);
  }

  console.log("\n환경변수 형식:");
  console.log(`ADMIN_CREDENTIALS=${credentials.join(",")}\n`);
}

hashPasswords();
