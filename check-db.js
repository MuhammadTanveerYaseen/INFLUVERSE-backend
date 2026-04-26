const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

async function checkDB() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/influverse";
    console.log("Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    
    // We expect the schema in ./src/models/User but we can just use mongoose.connection
    const db = mongoose.connection.db;
    
    const users = await db.collection("users").find({}).sort({ createdAt: -1 }).limit(5).toArray();
    console.log("LAST 5 USERS REGISTERED:");
    for (let u of users) {
      console.log(`- Email: ${u.email} | Role: ${u.role} | Verified: ${u.isVerified} | Status: ${u.status}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("ERROR DB:", error);
    process.exit(1);
  }
}

checkDB();
