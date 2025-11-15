/**
 * TypeScript Type Definitions
 * Based on models.json
 */

export type FlexibilityType = 'Rigid' | 'Passive' | 'Busy' | 'Flexible';
export type EventType = 'work' | 'personal' | 'social' | 'meeting' | 'studying' | 'free' | 'other';
export type PriorityLevel = 1 | 2 | 3;
export type ResponseStatus = 'accepted' | 'declined' | 'tentative' | 'needsAction';
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'mixed' | 'expired' | 'cancelled';
export type AttendeeResponse = 'yes' | 'no' | 'tentative' | 'unclear';

export interface WorkHours {
  start: string;
  end: string;
}

export interface Bedtime {
  weekday: string;
  weekend: string;
}

export interface MeetingWindow {
  day: string;
  start: string;
  end: string;
}

export interface NoMeetingZone {
  day: string;
  start: string;
  end: string;
  description: string;
}

export interface FlexibilityDefaults {
  personal_tasks: FlexibilityType;
  work_meetings: FlexibilityType;
  social_events: FlexibilityType;
}

export interface User {
  Full_Name: string;
  Email: string;
  Bedtime: Bedtime;
  OAuth_Token: {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    expiry_date: number;
  };
  GCal_ID: string;
  Work_Hours: {
    monday: WorkHours;
    tuesday: WorkHours;
    wednesday: WorkHours;
    thursday: WorkHours;
    friday: WorkHours;
    saturday: WorkHours;
    sunday: WorkHours;
  };
  Preferred_Meeting_Windows: MeetingWindow[];
  No_Meeting_Zones: NoMeetingZone[];
  Flexibility_Defaults: FlexibilityDefaults;
  Onboarding_Completed: boolean;
}

export interface EventGuest {
  email: string;
  name: string;
  responseStatus: ResponseStatus;
}

export interface Event {
  ID: string;
  User_Email: string;
  Event_Name: string;
  Event_Start_Date: Date;
  Event_End_Date: Date;
  Start_Time: string;
  End_Time: string;
  Event_Description: string;
  Event_Priority: PriorityLevel;
  Event_Flexibility: FlexibilityType;
  Event_Type: EventType;
  Event_Guests: EventGuest[];
  GCal_Event_ID: string;
  Created_Via: 'extension' | 'direct_calendar';
}

export interface TimeSlot {
  startDateTime: Date | string;
  endDateTime: Date | string;
}

export interface AttendeeResponseData {
  email: string;
  name: string;
  response: AttendeeResponse | null;
  status: 'pending' | 'responded';
  responseDate?: Date;
  responseText?: string;
}

export interface MajorityVoteResult {
  yesCount: number;
  noCount: number;
  tentativeCount: number;
  unclearCount: number;
  noResponseCount: number;
  hasMajority: boolean;
  decision: string;
}

export interface RescheduleProposal {
  Proposal_ID: string;
  User_Email: string;
  Event_ID: string;
  Event_Name: string;
  Original_Time_Slot: TimeSlot;
  Proposed_Time_Slot: TimeSlot;
  Reason: string;
  Attendee_Responses: AttendeeResponseData[];
  Email_Sent: boolean;
  Email_Message_ID?: string;
  Email_Subject?: string;
  Email_Body?: string;
  Proposal_Status: ProposalStatus;
  Majority_Vote_Result: MajorityVoteResult;
  Expires_At: Date;
  Finalized: boolean;
  Finalized_At?: Date;
}

export interface Conflict {
  conflictingEvent: Event;
  newEventMoreImportant: boolean;
  existingEventMoreImportant: boolean;
  equalImportance: boolean;
  newEventMoreFlexible: boolean;
  existingEventMoreFlexible: boolean;
  equalFlexibility: boolean;
  newEventCanMove: boolean;
  existingEventCanMove: boolean;
  newEventHasAttendees: boolean;
  existingEventHasAttendees: boolean;
  severity: number;
  overlapDuration: number;
  recommendation?: {
    action: 'move_existing' | 'move_new' | 'user_decision';
    reason: string;
    priority: number;
    requiresUserApproval: boolean;
    requiresEmailProposal: boolean;
  };
}

export interface ParsedEvent {
  title: string;
  startDateTime: string;
  endDateTime: string;
  duration: number;
  attendees: Array<{ email: string; name?: string }>;
  flexibility: FlexibilityType;
  category: EventType;
  priority: PriorityLevel;
  description: string;
}

export interface AvailableSlot {
  startDateTime: Date;
  endDateTime: Date;
  date: string;
  startTime: string;
  endTime: string;
  score: number;
  reason: string;
}

export interface BestDay {
  date: string;
  dayOfWeek: string;
  availableSlots: AvailableSlot[];
  reason: string;
}

