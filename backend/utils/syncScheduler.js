const User = require('../models/User');
const Event = require('../models/Event');
const { getCalendarEvents } = require('../services/calendarService');
const { assignEventMetadata } = require('../services/llmParser');

/**
 * Sync calendar events for a specific user
 * This can be called periodically or triggered by webhooks
 */
async function syncUserCalendar(email) {
  try {
    const user = await User.findOne({ Email: email });
    
    if (!user || !user.OAuth_Token || !user.OAuth_Token.access_token) {
      console.log(`Cannot sync calendar for ${email}: User not authenticated`);
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Get events from the last 7 days and next 60 days
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const calendarResult = await getCalendarEvents(user.OAuth_Token, startDate, endDate);

    if (!calendarResult.success) {
      console.error(`Failed to fetch calendar events for ${email}:`, calendarResult.error);
      return {
        success: false,
        error: calendarResult.error
      };
    }

    const gcalEvents = calendarResult.events;
    let newEventsCount = 0;
    let updatedEventsCount = 0;

    for (const gcalEvent of gcalEvents) {
      if (!gcalEvent.id) continue;

      const existingEvent = await Event.findOne({ GCal_Event_ID: gcalEvent.id });

      if (existingEvent) {
        // Update existing event if changed
        const gcalStart = new Date(gcalEvent.start.dateTime || gcalEvent.start.date);
        const gcalEnd = new Date(gcalEvent.end.dateTime || gcalEvent.end.date);
        
        let hasChanges = false;

        if (existingEvent.Event_Name !== gcalEvent.summary) {
          existingEvent.Event_Name = gcalEvent.summary || 'Untitled Event';
          hasChanges = true;
        }

        if (existingEvent.Event_Start_Date.getTime() !== gcalStart.getTime()) {
          existingEvent.Event_Start_Date = gcalStart;
          existingEvent.Start_Time = gcalEvent.start.dateTime 
            ? gcalStart.toTimeString().substr(0, 5)
            : existingEvent.Start_Time;
          hasChanges = true;
        }

        if (existingEvent.Event_End_Date.getTime() !== gcalEnd.getTime()) {
          existingEvent.Event_End_Date = gcalEnd;
          existingEvent.End_Time = gcalEvent.end.dateTime
            ? gcalEnd.toTimeString().substr(0, 5)
            : existingEvent.End_Time;
          hasChanges = true;
        }

        if (hasChanges) {
          await existingEvent.save();
          updatedEventsCount++;
        }
      } else {
        // New event - assign metadata and create
        const metadataResult = await assignEventMetadata(
          gcalEvent.summary || 'Untitled Event',
          gcalEvent.description || ''
        );

        const metadata = metadataResult.metadata;

        const attendees = (gcalEvent.attendees || []).map(a => ({
          email: a.email,
          name: a.displayName || '',
          responseStatus: a.responseStatus || 'needsAction'
        }));

        const dbEvent = new Event({
          ID: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          User_Email: email,
          Event_Name: gcalEvent.summary || 'Untitled Event',
          Event_Start_Date: new Date(gcalEvent.start.dateTime || gcalEvent.start.date),
          Event_End_Date: new Date(gcalEvent.end.dateTime || gcalEvent.end.date),
          Start_Time: gcalEvent.start.dateTime 
            ? new Date(gcalEvent.start.dateTime).toTimeString().substr(0, 5)
            : '00:00',
          End_Time: gcalEvent.end.dateTime
            ? new Date(gcalEvent.end.dateTime).toTimeString().substr(0, 5)
            : '23:59',
          Event_Description: gcalEvent.description || '',
          Event_Priority: metadata.priority,
          Event_Flexibility: metadata.flexibility,
          Event_Type: metadata.category,
          Event_Guests: attendees,
          GCal_Event_ID: gcalEvent.id,
          Created_Via: 'direct_calendar'
        });

        await dbEvent.save();
        newEventsCount++;
      }
    }

    console.log(`Synced calendar for ${email}: ${newEventsCount} new, ${updatedEventsCount} updated`);

    return {
      success: true,
      newEvents: newEventsCount,
      updatedEvents: updatedEventsCount,
      totalProcessed: gcalEvents.length
    };

  } catch (error) {
    console.error(`Error syncing calendar for ${email}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sync calendars for all authenticated users
 * Can be run on a schedule (e.g., every 15 minutes)
 */
async function syncAllUsers() {
  try {
    const users = await User.find({ 
      'OAuth_Token.access_token': { $exists: true, $ne: '' }
    });

    console.log(`Starting sync for ${users.length} users...`);

    const results = [];
    
    for (const user of users) {
      const result = await syncUserCalendar(user.Email);
      results.push({
        email: user.Email,
        ...result
      });

      // Add delay between users to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('All users synced');

    return {
      success: true,
      userCount: users.length,
      results
    };

  } catch (error) {
    console.error('Error in syncAllUsers:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Start periodic sync (every 15 minutes)
 */
function startPeriodicSync(intervalMinutes = 15) {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  console.log(`Starting periodic calendar sync every ${intervalMinutes} minutes`);
  
  // Run once immediately
  syncAllUsers();
  
  // Then run on interval
  const syncInterval = setInterval(() => {
    console.log('Running scheduled calendar sync...');
    syncAllUsers();
  }, intervalMs);

  return syncInterval;
}

module.exports = {
  syncUserCalendar,
  syncAllUsers,
  startPeriodicSync
};

