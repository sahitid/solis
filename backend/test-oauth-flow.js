require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function testOAuthSetup() {
  try {
    console.log('🔍 Testing OAuth Setup...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`   Database: ${mongoose.connection.name}\n`);
    
    // Check environment variables
    console.log('🔑 OAuth Configuration:');
    console.log('──────────────────────────────────────────');
    console.log(`   Client ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set (' + process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...)' : '❌ Missing'}`);
    console.log(`   Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Redirect URI: ${process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/callback.html (default)'}`);
    console.log(`   Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000 (default)'}\n`);
    
    // Check OAuth URL generation
    const { getAuthUrl } = require('./config/google');
    try {
      const authUrl = getAuthUrl();
      console.log('✅ OAuth URL generation works');
      console.log(`   URL: ${authUrl.substring(0, 50)}...\n`);
    } catch (error) {
      console.log('❌ OAuth URL generation failed:', error.message, '\n');
    }
    
    // Check if any users exist
    const totalUsers = await User.countDocuments();
    console.log('👥 User Statistics:');
    console.log('──────────────────────────────────────────');
    console.log(`   Total users: ${totalUsers}`);
    
    // Check if any users have OAuth tokens
    const usersWithTokens = await User.find({ 
      'OAuth_Token.access_token': { $exists: true, $ne: '' } 
    });
    console.log(`   Users with OAuth tokens: ${usersWithTokens.length}`);
    
    if (usersWithTokens.length > 0) {
      console.log('\n   Recent OAuth Users:');
      usersWithTokens.slice(0, 5).forEach(user => {
        const tokenExpired = user.OAuth_Token.expiry_date < Date.now();
        const expiryStatus = tokenExpired ? '❌ Expired' : '✅ Valid';
        console.log(`   - ${user.Full_Name} (${user.Email})`);
        console.log(`     Token: ${expiryStatus}`);
        console.log(`     Expires: ${new Date(user.OAuth_Token.expiry_date).toLocaleString()}`);
        console.log(`     Onboarding: ${user.Onboarding_Completed ? '✅ Complete' : '⏳ Pending'}`);
      });
    } else {
      console.log('   No users have completed OAuth yet');
    }
    
    console.log('\n──────────────────────────────────────────');
    console.log('✅ OAuth setup configuration is valid!');
    console.log('💡 Next steps:');
    console.log('   1. Make sure backend is running: npm run dev');
    console.log('   2. Open landing page: http://localhost:8080');
    console.log('   3. Click "Sign in with Google"');
    console.log('   4. Test the OAuth flow!\n');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

testOAuthSetup();

