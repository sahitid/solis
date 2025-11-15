const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  Full_Name: {
    type: String,
    required: true,
    trim: true
  },
  Email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  Bedtime: {
    weekday: {
      type: String,
      default: '22:00' // Default 10:00 PM
    },
    weekend: {
      type: String,
      default: '23:00' // Default 11:00 PM
    }
  },
  OAuth_Token: {
    access_token: String,
    refresh_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number
  },
  GCal_ID: {
    type: String,
    required: true
  },
  // Additional onboarding preferences
  Work_Hours: {
    monday: { start: String, end: String },
    tuesday: { start: String, end: String },
    wednesday: { start: String, end: String },
    thursday: { start: String, end: String },
    friday: { start: String, end: String },
    saturday: { start: String, end: String },
    sunday: { start: String, end: String }
  },
  Preferred_Meeting_Windows: [{
    day: String,
    start: String,
    end: String
  }],
  No_Meeting_Zones: [{
    day: String,
    start: String,
    end: String,
    description: String
  }],
  Flexibility_Defaults: {
    personal_tasks: {
      type: String,
      enum: ['Rigid', 'Passive', 'Busy', 'Flexible'],
      default: 'Flexible'
    },
    work_meetings: {
      type: String,
      enum: ['Rigid', 'Passive', 'Busy', 'Flexible'],
      default: 'Rigid'
    },
    social_events: {
      type: String,
      enum: ['Rigid', 'Passive', 'Busy', 'Flexible'],
      default: 'Busy'
    }
  },
  Onboarding_Completed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);

