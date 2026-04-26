const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function e2eTest() {
  let db;
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/influverse";
    await mongoose.connect(mongoUri);
    db = mongoose.connection.db;
    
    const email = "testbrand2029@example.com";
    console.log("[E2E] Registering brand:", email);
    
    // 1. Register Brand
    const regRes = await axios.post('http://localhost:5000/api/brands/register', {
        name: "Test Brand",
        companyName: "Test Co",
        email: email,
        password: "password123",
        language: "en"
    });
    console.log("[E2E] Reg Response:", regRes.status, regRes.data);

    // 2. Fetch OTP from DB (to bypass email)
    const user = await db.collection('users').findOne({ email: email });
    if (!user) throw new Error("User not found in DB");
    console.log("[E2E] Found User OTP:", user.otp);

    // 3. Verify OTP
    const verifyRes = await axios.post('http://localhost:5000/api/auth/verify-otp', {
        email: email,
        otp: user.otp
    });
    console.log("[E2E] Verify Response:", verifyRes.status, verifyRes.data);

    const fs = require('fs');
    if (fs.existsSync('email_trace.log')) {
        console.log("[E2E] EMAIL TRACE CONTENTS:\n", fs.readFileSync('email_trace.log', 'utf8'));
    } else {
        console.log("[E2E] NO EMAIL TRACE LOG FOUND (Verification completely bypassed sendEmail or crashed)");
    }

    process.exit(0);
  } catch (err) {
    console.error("[E2E] ERROR:", err?.response?.data || err.message);
    process.exit(1);
  }
}

e2eTest();
