const mongoose = require('mongoose');

const rescheduleProposalSchema = new mongoose.Schema({
  Proposal_ID: {
    type: String,
    required: true,
    unique: true
  },
  User_Email: {
    type: String,
    required: true,
    ref: 'User'
  },
  Event_ID: {
    type: String,
    required: true,
    ref: 'Event'
  },
  Event_Name: {
    type: String,
    required: true
  },
  Original_Time_Slot: {
    startDateTime: Date,
    endDateTime: Date
  },
  Proposed_Time_Slot: {
    startDateTime: Date,
    endDateTime: Date
  },
  Reason: {
    type: String,
    default: ''
  },
  Attendee_Responses: [{
    email: String,
    name: String,
    response: {
      type: String,
      enum: ['yes', 'no', 'tentative', 'unclear'],
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'responded'],
      default: 'pending'
    },
    responseDate: Date,
    responseText: String
  }],
  Email_Sent: {
    type: Boolean,
    default: false
  },
  Email_Message_ID: {
    type: String
  },
  Email_Subject: {
    type: String
  },
  Email_Body: {
    type: String
  },
  Proposal_Status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'mixed', 'expired', 'cancelled'],
    default: 'pending'
  },
  Majority_Vote_Result: {
    yesCount: { type: Number, default: 0 },
    noCount: { type: Number, default: 0 },
    tentativeCount: { type: Number, default: 0 },
    unclearCount: { type: Number, default: 0 },
    noResponseCount: { type: Number, default: 0 },
    hasMajority: { type: Boolean, default: false },
    decision: String
  },
  Expires_At: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  Finalized: {
    type: Boolean,
    default: false
  },
  Finalized_At: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient querying
rescheduleProposalSchema.index({ User_Email: 1, Proposal_Status: 1 });
rescheduleProposalSchema.index({ Event_ID: 1 });
rescheduleProposalSchema.index({ Expires_At: 1 });

module.exports = mongoose.model('RescheduleProposal', rescheduleProposalSchema);

