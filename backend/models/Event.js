const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: true,
    unique: true
  },
  User_Email: {
    type: String,
    required: true,
    ref: 'User'
  },
  Event_Name: {
    type: String,
    required: true,
    trim: true
  },
  Event_Start_Date: {
    type: Date,
    required: true
  },
  Event_End_Date: {
    type: Date,
    required: true
  },
  Start_Time: {
    type: String,
    required: true
  },
  End_Time: {
    type: String,
    required: true
  },
  Event_Description: {
    type: String,
    default: ''
  },
  Event_Priority: {
    type: Number,
    min: 1,
    max: 3,
    default: 2
  },
  Event_Flexibility: {
    type: String,
    enum: ['Rigid', 'Passive', 'Busy', 'Flexible'],
    default: 'Busy'
  },
  Event_Type: {
    type: String,
    enum: ['work', 'personal', 'social', 'meeting', 'studying', 'free', 'other'],
    default: 'other'
  },
  Event_Guests: [{
    email: String,
    name: String,
    responseStatus: {
      type: String,
      enum: ['accepted', 'declined', 'tentative', 'needsAction'],
      default: 'needsAction'
    }
  }],
  GCal_Event_ID: {
    type: String,
    required: true
  },
  Created_Via: {
    type: String,
    enum: ['extension', 'direct_calendar'],
    default: 'extension'
  }
}, {
  timestamps: true
});

// Index for efficient querying
eventSchema.index({ User_Email: 1, Event_Start_Date: 1 });

module.exports = mongoose.model('Event', eventSchema);

