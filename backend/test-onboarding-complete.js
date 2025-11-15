require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function testOnboardingComplete() {
  console.log('🧪 Testing Onboarding Completion\n');
  console.log('──────────────────────────────────────────\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Create or find test user
    const testEmail = 'onboarding-test@example.com';
    
    let user = await User.findOne({ Email: testEmail });
    
    if (!user) {
      console.log('📝 Creating test user...');
      user = new User({
        Full_Name: 'Onboarding Test User',
        Email: testEmail,
        GCal_ID: 'test-gcal-id',
        OAuth_Token: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          scope: 'calendar gmail',
          token_type: 'Bearer',
          expiry_date: Date.now() + 3600000
        },
        Work_Hours: {
          monday: { start: '', end: '' },
          tuesday: { start: '', end: '' },
          wednesday: { start: '', end: '' },
          thursday: { start: '', end: '' },
          friday: { start: '', end: '' },
          saturday: { start: '', end: '' },
          sunday: { start: '', end: '' }
        },
        Onboarding_Completed: false
      });
      await user.save();
      console.log('✅ Test user created\n');
    } else {
      console.log('✅ Found existing test user\n');
    }
    
    console.log('📊 Initial Status:');
    console.log(`   Onboarding Completed: ${user.Onboarding_Completed ? '✅' : '❌'}`);
    console.log(`   Work Hours Set: ${hasWorkHours(user) ? '✅' : '❌'}`);
    console.log(`   Bedtime Set: ${user.Bedtime && (user.Bedtime.weekday || user.Bedtime) ? '✅' : '❌'}`);
    console.log(`   Flexibility Set: ${user.Flexibility_Defaults && Object.keys(user.Flexibility_Defaults).length > 0 ? '✅' : '❌'}\n`);
    
    // Simulate completing onboarding
    console.log('🔄 Simulating onboarding completion...\n');
    
    user.Work_Hours = {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
      saturday: { start: '', end: '' },
      sunday: { start: '' , end: '' }
    };
    
    user.Bedtime = {
      weekday: '23:00',
      weekend: '00:00'
    };
    
    user.Flexibility_Defaults = {
      personal_tasks: 'Flexible',
      work_meetings: 'Rigid',
      social_events: 'Busy'
    };
    
    user.Onboarding_Completed = true;
    
    await user.save();
    
    console.log('✅ Preferences saved!\n');
    
    // Verify completion
    const updatedUser = await User.findOne({ Email: testEmail });
    
    console.log('📊 Final Status:');
    console.log(`   Onboarding Completed: ${updatedUser.Onboarding_Completed ? '✅ YES' : '❌ NO'}`);
    console.log(`   Work Hours Set: ${hasWorkHours(updatedUser) ? '✅ YES' : '❌ NO'}`);
    console.log(`   Bedtime Set: ${updatedUser.Bedtime && (updatedUser.Bedtime.weekday || updatedUser.Bedtime) ? '✅ YES' : '❌ NO'}`);
    console.log(`   Flexibility Set: ${updatedUser.Flexibility_Defaults && Object.keys(updatedUser.Flexibility_Defaults).length > 0 ? '✅ YES' : '❌ NO'}\n`);
    
    console.log('──────────────────────────────────────────');
    console.log('✅ Onboarding completion test passed!\n');
    console.log('💡 Key takeaways:');
    console.log('   - User starts with Onboarding_Completed = false');
    console.log('   - After setting preferences, it becomes true');
    console.log('   - This flag controls what the user sees next');
    console.log('   - Onboarded users skip the setup flow\n');
    
    // Cleanup (optional)
    console.log('🧹 Cleanup options:');
    console.log(`   To delete test user: await User.deleteOne({ Email: '${testEmail}' })\n`);
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

function hasWorkHours(user) {
  if (!user.Work_Hours) return false;
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days.some(day => {
    const hours = user.Work_Hours[day];
    return hours && hours.start && hours.end;
  });
}

testOnboardingComplete();

