// Quick test to verify MongoDB connection
require('dotenv').config();
const mongoose = require('mongoose');

console.log('\n🔍 Testing MongoDB Atlas Connection...\n');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ SUCCESS! MongoDB Atlas connected');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Connection State: ${mongoose.connection.readyState} (1 = connected)`);
    
    // List collections
    mongoose.connection.db.listCollections().toArray((err, collections) => {
      if (err) {
        console.log('   Collections: Unable to list');
      } else {
        console.log(`   Collections: ${collections.length > 0 ? collections.map(c => c.name).join(', ') : 'None yet (will be created when you add data)'}`);
      }
      
      console.log('\n✅ MongoDB is ready to use!\n');
      process.exit(0);
    });
  })
  .catch((err) => {
    console.error('❌ FAILED! MongoDB connection error:');
    console.error(`   ${err.message}\n`);
    console.log('💡 Troubleshooting:');
    console.log('   1. Check if your IP is whitelisted in MongoDB Atlas');
    console.log('   2. Go to https://cloud.mongodb.com');
    console.log('   3. Navigate to Network Access');
    console.log('   4. Add IP Address: 0.0.0.0/0 (for development)\n');
    process.exit(1);
  });

