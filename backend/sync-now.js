// Quick script to sync calendar and clean up deleted events
require('dotenv').config({ path: __dirname + '/.env' });
const fetch = require('node-fetch');

async function syncNow() {
  try {
    console.log('🔄 Syncing calendar with MongoDB...\n');
    
    const response = await fetch('http://localhost:5000/api/events/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sahitid@wharton.upenn.edu'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Sync complete!\n');
      console.log('📊 Stats:');
      console.log(`   Total in Google Calendar: ${data.stats.totalCalendarEvents}`);
      console.log(`   Already in MongoDB: ${data.stats.existingEvents}`);
      console.log(`   New events added: ${data.stats.newEvents}`);
      console.log(`   🗑️  Deleted events removed: ${data.stats.deletedEvents}\n`);

      if (data.deletedEvents && data.deletedEvents.length > 0) {
        console.log('🗑️  Removed these events from MongoDB:');
        data.deletedEvents.forEach(e => {
          console.log(`   - ${e.name}`);
        });
        console.log('');
      }

      console.log('✅ MongoDB is now synced with Google Calendar!');
      console.log('✅ Conflict detection should work correctly now!\n');
    } else {
      console.error('❌ Sync failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

syncNow();

