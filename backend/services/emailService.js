const { google } = require('googleapis');
const { getAuthenticatedClient } = require('../config/google');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate email content for reschedule proposal using LLM
 */
async function generateRescheduleEmail(event, oldTimeSlot, newTimeSlot, reason = '') {
  try {
    const systemPrompt = `You are drafting a professional email to propose rescheduling a calendar event. 
    
The email should be:
- Polite and professional
- Clear about the old and new times
- Brief but informative
- Include a reason if provided
- Ask for confirmation

Return only the email body text (no subject line, no JSON).`;

    const userPrompt = `Draft an email proposing to reschedule the following event:

Event: ${event.Event_Name}
Current Time: ${new Date(oldTimeSlot.startDateTime).toLocaleString()} to ${new Date(oldTimeSlot.endDateTime).toLocaleString()}
Proposed New Time: ${new Date(newTimeSlot.startDateTime).toLocaleString()} to ${new Date(newTimeSlot.endDateTime).toLocaleString()}
${reason ? `Reason: ${reason}` : ''}

The email should ask attendees to confirm if the new time works for them.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
    
    const prompt = `${systemPrompt}\n\n${userPrompt}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const emailBody = response.text();

    return {
      success: true,
      subject: `Reschedule Proposal: ${event.Event_Name}`,
      body: emailBody
    };

  } catch (error) {
    console.error('Email generation error:', error);
    // Fallback to template
    return {
      success: true,
      subject: `Reschedule Proposal: ${event.Event_Name}`,
      body: `Hi,

I would like to propose rescheduling our meeting "${event.Event_Name}".

Current Time: ${new Date(oldTimeSlot.startDateTime).toLocaleString()} to ${new Date(oldTimeSlot.endDateTime).toLocaleString()}
Proposed New Time: ${new Date(newTimeSlot.startDateTime).toLocaleString()} to ${new Date(newTimeSlot.endDateTime).toLocaleString()}

${reason ? `Reason: ${reason}\n\n` : ''}Please let me know if this new time works for you.

Best regards`
    };
  }
}

/**
 * Send email via Gmail API
 */
async function sendEmail(userTokens, to, subject, body, cc = []) {
  try {
    const auth = getAuthenticatedClient(userTokens);
    const gmail = google.gmail({ version: 'v1', auth });

    // Create email message
    const email = [
      `To: ${Array.isArray(to) ? to.join(', ') : to}`,
      ...(cc.length > 0 ? [`Cc: ${cc.join(', ')}`] : []),
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      body
    ].join('\n');

    // Encode email to base64
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    return {
      success: true,
      messageId: response.data.id,
      message: 'Email sent successfully'
    };

  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send reschedule proposal to all attendees
 */
async function sendRescheduleProposal(userTokens, event, oldTimeSlot, newTimeSlot, reason = '') {
  try {
    // Generate email content
    const emailContent = await generateRescheduleEmail(event, oldTimeSlot, newTimeSlot, reason);

    // Get attendee emails
    const attendeeEmails = event.Event_Guests
      .map(guest => guest.email)
      .filter(email => email && email.length > 0);

    if (attendeeEmails.length === 0) {
      return {
        success: false,
        error: 'No attendees with valid email addresses'
      };
    }

    // Send email
    const result = await sendEmail(
      userTokens,
      attendeeEmails,
      emailContent.subject,
      emailContent.body
    );

    return {
      success: result.success,
      messageId: result.messageId,
      emailContent: emailContent,
      attendees: attendeeEmails,
      error: result.error
    };

  } catch (error) {
    console.error('Reschedule proposal error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Parse email responses to extract yes/no/maybe
 */
async function parseEmailResponse(emailBody) {
  try {
    const systemPrompt = `You are analyzing an email response to a meeting reschedule proposal. 
    
Determine if the response is:
- "yes" - They agree to the new time
- "no" - They cannot make the new time  
- "tentative" - They're unsure or have concerns
- "unclear" - Cannot determine their response

Return ONLY one word: yes, no, tentative, or unclear`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: emailBody
      }]
    });

    const result = response.content[0].text.toLowerCase().trim();
    
    if (['yes', 'no', 'tentative', 'unclear'].includes(result)) {
      return result;
    }
    
    return 'unclear';

  } catch (error) {
    console.error('Email parsing error:', error);
    return 'unclear';
  }
}

/**
 * Track response for a reschedule proposal
 */
function calculateMajorityVote(responses) {
  const counts = {
    yes: 0,
    no: 0,
    tentative: 0,
    unclear: 0,
    noResponse: 0
  };

  for (const response of responses) {
    if (response.status === 'pending') {
      counts.noResponse++;
    } else {
      counts[response.response] = (counts[response.response] || 0) + 1;
    }
  }

  const totalResponses = responses.length;
  const receivedResponses = totalResponses - counts.noResponse;
  const yesPercentage = (counts.yes / totalResponses) * 100;

  // Majority = more than 50% of total attendees said yes
  const hasMajority = counts.yes > (totalResponses / 2);

  return {
    counts,
    totalResponses,
    receivedResponses,
    yesPercentage,
    hasMajority,
    decision: hasMajority ? 'approved' : 
              counts.no > (totalResponses / 2) ? 'rejected' :
              receivedResponses === totalResponses ? 'mixed' : 'pending'
  };
}

/**
 * Send confirmation email after successful reschedule
 */
async function sendRescheduleConfirmation(userTokens, event, newTimeSlot) {
  try {
    const subject = `Confirmed: ${event.Event_Name} - New Time`;
    const body = `This is to confirm that "${event.Event_Name}" has been rescheduled.

New Date & Time: ${new Date(newTimeSlot.startDateTime).toLocaleString()} to ${new Date(newTimeSlot.endDateTime).toLocaleString()}

The meeting details remain the same. This event has been updated in your Google Calendar.

Best regards`;

    const attendeeEmails = event.Event_Guests
      .map(guest => guest.email)
      .filter(email => email && email.length > 0);

    if (attendeeEmails.length === 0) {
      return { success: true, message: 'No attendees to notify' };
    }

    const result = await sendEmail(
      userTokens,
      attendeeEmails,
      subject,
      body
    );

    return result;

  } catch (error) {
    console.error('Confirmation email error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateRescheduleEmail,
  sendEmail,
  sendRescheduleProposal,
  parseEmailResponse,
  calculateMajorityVote,
  sendRescheduleConfirmation
};

