const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

async function runTest() {
  try {
    const { emailTemplates } = require('./dist/utils/emailService.js');
    
    const frontendUrl = 'http://localhost:3000';
    console.log("Generating Brand Template");
    const template = emailTemplates.welcomeBrand(`${frontendUrl}/marketplace`, 'en');
    
    console.log("Template Subject:", template.subject);
    console.log("Template HTML Length:", template.html.length);

    console.log("SUCCESS");
  } catch (error) {
    console.error("ERROR GENERATING:", error);
  }
}

runTest();
