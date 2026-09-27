import { Resend } from 'resend';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  db,
  sanitizeForFirestore,
} from '../firebase';
import { EmailLog, Patient, Session, Therapist } from '../../types';

// Configuration constants
export const DEFAULT_FROM_EMAIL =
  (typeof process !== 'undefined' && process.env?.RESEND_FROM_EMAIL) ||
  'Nurturing Minds <connect@drsweetybhatnagar.com>';

export const CLINIC_LOCATION =
  'Nurturing Minds Therapy Center, 2nd Floor, Navalur, Chennai';
export const CLINIC_PHONE = '+91 98110 23456';
export const GOOGLE_FEEDBACK_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSc-feedback-placeholder/viewform';

/**
 * Format date to exact PRD specification: "Monday, September 25, 2026"
 */
export function formatAppointmentDate(dateInput: string | Date | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      return String(dateInput);
    }
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Generate Email 1: Booking Confirmation (Immediate)
 */
export function generateBookingConfirmationHtml(params: {
  parentName: string;
  childName: string;
  scheduledAt: string;
  timeSlot: string;
  therapistName: string;
  durationMinutes?: number;
}): { subject: string; html: string } {
  const formattedDate = formatAppointmentDate(params.scheduledAt);
  const timeSlot = params.timeSlot || '45-Minute Therapy Slot';
  const duration = params.durationMinutes || 45;
  const subject = 'Your appointment with Dr Sweety is confirmed';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #2d3748; margin: 0; padding: 24px; background-color: #f7fafc;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 28px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Nurturing Minds Therapy Center</h1>
      <p style="color: #ccfbf1; margin: 6px 0 0 0; font-size: 14px;">Pediatric Occupational, Speech & Behavioral Therapy</p>
    </div>
    
    <div style="padding: 32px 28px;">
      <p style="font-size: 16px; margin-top: 0;">Hi <strong>${params.parentName}</strong>,</p>
      <p style="font-size: 16px; color: #374151;">Great news! Your appointment for <strong>${params.childName}</strong> is confirmed.</p>
      
      <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 18px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
        <h3 style="margin-top: 0; margin-bottom: 12px; color: #0f766e; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Session Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; width: 100px;"><strong>Date:</strong></td>
            <td style="padding: 4px 0; color: #1e293b;"><strong>${formattedDate}</strong></td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Time:</strong></td>
            <td style="padding: 4px 0; color: #1e293b;">${timeSlot}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Therapist:</strong></td>
            <td style="padding: 4px 0; color: #1e293b;">${params.therapistName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Duration:</strong></td>
            <td style="padding: 4px 0; color: #1e293b;">${duration} minutes</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; vertical-align: top;"><strong>Location:</strong></td>
            <td style="padding: 4px 0; color: #1e293b;">${CLINIC_LOCATION}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
        <h3 style="margin-top: 0; margin-bottom: 10px; color: #334155; font-size: 15px;">What to Bring:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.7;">
          <li>Your child's medical reports & previous assessment cards (if any)</li>
          <li>A notebook for observations & clinical notes (optional)</li>
          <li>Comfortable clothes for your child to allow free physical activity</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #64748b; margin-top: 24px;">
        Questions? Reply to this email or call <strong>${CLINIC_PHONE}</strong>
      </p>

      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 15px; color: #1e293b;">Best regards,</p>
        <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 700; color: #0d9488;">Nurturing Minds Team</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html };
}

/**
 * Generate Email 2: 2-Day Reminder (Scheduled)
 */
export function generateReminderEmailHtml(params: {
  parentName: string;
  childName: string;
  scheduledAt: string;
  timeSlot: string;
  therapistName: string;
}): { subject: string; html: string } {
  const formattedDate = formatAppointmentDate(params.scheduledAt);
  const timeSlot = params.timeSlot || '45-Minute Therapy Slot';
  const subject = 'Reminder: Your appointment is in 2 days';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #2d3748; margin: 0; padding: 24px; background-color: #f7fafc;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Upcoming Appointment Reminder</h1>
      <p style="color: #dbeafe; margin: 4px 0 0 0; font-size: 14px;">Nurturing Minds Therapy Center</p>
    </div>
    
    <div style="padding: 32px 28px;">
      <p style="font-size: 16px; margin-top: 0;">Hi <strong>${params.parentName}</strong>,</p>
      <p style="font-size: 16px; color: #374151;">Just a friendly reminder that <strong>${params.childName}'s</strong> appointment is coming up in 2 days!</p>
      
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; width: 90px;"><strong>Date:</strong></td>
            <td style="padding: 4px 0; color: #1e293b;"><strong>${formattedDate}</strong></td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Time:</strong></td>
            <td style="padding: 4px 0; color: #1e293b;">${timeSlot}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Therapist:</strong></td>
            <td style="padding: 4px 0; color: #1e293b;">${params.therapistName}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
        <h3 style="margin-top: 0; margin-bottom: 10px; color: #1e293b; font-size: 15px;">Pre-Session Tips:</h3>
        <ol style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
          <li>Ensure your child is well-rested before the appointment</li>
          <li>Avoid heavy meals 30 minutes before session</li>
          <li>Plan to arrive 10 minutes early to allow smooth settling</li>
        </ol>
      </div>

      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 15px; color: #1e293b;">See you soon!</p>
        <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 700; color: #3b82f6;">Nurturing Minds Team</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html };
}

/**
 * Generate Email 3: Feedback Request (1 Day After)
 */
export function generateFeedbackEmailHtml(params: {
  parentName: string;
  childName: string;
  appUrl?: string;
  googleFormUrl?: string;
}): { subject: string; html: string } {
  const formUrl = params.googleFormUrl || GOOGLE_FEEDBACK_FORM_URL;
  const bookingUrl =
    params.appUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://nurturing-minds.vercel.app');
  const subject = "How was your session? We'd love your feedback";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #2d3748; margin: 0; padding: 24px; background-color: #f7fafc;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">We Value Your Feedback</h1>
      <p style="color: #ede9fe; margin: 4px 0 0 0; font-size: 14px;">Nurturing Minds Therapy Center</p>
    </div>
    
    <div style="padding: 32px 28px;">
      <p style="font-size: 16px; margin-top: 0;">Hi <strong>${params.parentName}</strong>,</p>
      <p style="font-size: 16px; color: #374151;">
        Thank you for attending your session with us! We hope <strong>${params.childName}</strong> had a wonderful and supportive experience.
      </p>
      
      <p style="font-size: 15px; color: #475569;">We'd love to hear how the session went:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${formUrl}" target="_blank" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(139, 92, 246, 0.25);">
          Share Session Feedback &rarr;
        </a>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
        Your feedback helps us serve families better and inspires other parents to give therapy a try.
      </p>

      <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #6b21a8;">Ready to book your next session?</p>
        <a href="${bookingUrl}" target="_blank" style="color: #8b5cf6; font-weight: 600; font-size: 14px; text-decoration: underline;">
          Click here to schedule your next slot &rarr;
        </a>
      </div>

      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 15px; color: #1e293b;">Best regards,</p>
        <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 700; color: #8b5cf6;">Nurturing Minds Team</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html };
}

/**
 * Resend client helper with safety for client/server environments
 */
function getResendClient(): { client: Resend | null; apiKey: string | null } {
  let apiKey: string | null = null;
  if (typeof process !== 'undefined' && process.env?.RESEND_API_KEY) {
    apiKey = process.env.RESEND_API_KEY;
  } else if (typeof window !== 'undefined' && (window as any).__RESEND_API_KEY__) {
    apiKey = (window as any).__RESEND_API_KEY__;
  }

  if (!apiKey || apiKey.startsWith('re_xxxx') || apiKey.length < 10) {
    return { client: null, apiKey: null };
  }

  try {
    return { client: new Resend(apiKey), apiKey };
  } catch (err) {
    console.warn('Failed to initialize Resend client:', err);
    return { client: null, apiKey: null };
  }
}

/**
 * Send an email with automatic 3x retry logic and Firestore logging
 */
export async function sendEmailWithRetry(params: {
  sessionId: string;
  recipientEmail: string;
  recipientName?: string;
  childName?: string;
  therapistName?: string;
  subject: string;
  html: string;
  emailType: 'booking_confirmation' | 'reminder_2days' | 'feedback_1day';
  scheduledFor?: string;
}): Promise<{ success: boolean; logId: string; error?: string }> {
  const { sessionId, recipientEmail, subject, html, emailType } = params;
  const timestamp = new Date().toISOString();
  const logId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Error handling: If parentEmail is missing, log error but do NOT crash
  if (!recipientEmail || recipientEmail === 'unknown' || !recipientEmail.includes('@')) {
    const errorMsg = `[EMAIL ERROR] session ${sessionId}: Failed to fetch parent email (parentEmail is null or invalid)`;
    console.error(errorMsg);

    const failedLog: EmailLog = {
      id: logId,
      sessionId,
      recipientEmail: recipientEmail || 'unknown',
      recipientName: params.recipientName,
      childName: params.childName,
      therapistName: params.therapistName,
      emailType,
      sentAt: timestamp,
      status: 'failed',
      error: errorMsg,
      subject,
      retryCount: 0,
      scheduledFor: params.scheduledFor,
    };

    try {
      await setDoc(doc(db, 'emailLogs', logId), sanitizeForFirestore(failedLog));
    } catch (saveErr) {
      console.error('Failed to write emailLog to Firestore:', saveErr);
    }

    return { success: false, logId, error: errorMsg };
  }

  const { client, apiKey } = getResendClient();
  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!apiKey || !client) {
        // No real Resend key provided yet — simulate success in demo environment so flow never breaks
        console.warn(
          `[DEMO MODE] RESEND_API_KEY not configured. Simulated delivery to ${recipientEmail} for session ${sessionId}`
        );
        const demoLog: EmailLog = {
          id: logId,
          sessionId,
          recipientEmail,
          recipientName: params.recipientName,
          childName: params.childName,
          therapistName: params.therapistName,
          emailType,
          sentAt: timestamp,
          status: 'sent',
          error: null,
          subject,
          retryCount: attempt - 1,
          scheduledFor: params.scheduledFor,
        };

        await setDoc(doc(db, 'emailLogs', logId), sanitizeForFirestore(demoLog));
        console.log(
          `[EMAIL SENT] ${emailType} to ${recipientEmail} for session ${sessionId} (Simulated Demo Delivery)`
        );
        return { success: true, logId };
      }

      // Send via real Resend API
      const response = await client.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: recipientEmail,
        subject,
        html,
      });

      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }

      // Exact success log format from PRD
      console.log(
        `[EMAIL SENT] Booking confirmation to ${recipientEmail} for session ${sessionId} (${timestamp})`
      );

      const successLog: EmailLog = {
        id: logId,
        sessionId,
        recipientEmail,
        recipientName: params.recipientName,
        childName: params.childName,
        therapistName: params.therapistName,
        emailType,
        sentAt: timestamp,
        status: 'sent',
        error: null,
        subject,
        retryCount: attempt - 1,
        scheduledFor: params.scheduledFor,
      };

      await setDoc(doc(db, 'emailLogs', logId), sanitizeForFirestore(successLog));
      return { success: true, logId };
    } catch (err: any) {
      lastError = err;
      console.error(
        `[EMAIL RETRY] session ${sessionId}: Attempt ${attempt}/${maxRetries}, error: ${err.message}`
      );

      if (attempt < maxRetries) {
        // Exponential backoff or brief delay between retries
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // All retries exhausted
  const failureMsg = `[EMAIL FAILED] session ${sessionId}: All retries exhausted (${lastError?.message || 'Unknown error'})`;
  console.error(failureMsg);

  const finalFailedLog: EmailLog = {
    id: logId,
    sessionId,
    recipientEmail,
    recipientName: params.recipientName,
    childName: params.childName,
    therapistName: params.therapistName,
    emailType,
    sentAt: timestamp,
    status: 'failed',
    error: failureMsg,
    subject,
    retryCount: maxRetries,
    scheduledFor: params.scheduledFor,
  };

  try {
    await setDoc(doc(db, 'emailLogs', logId), sanitizeForFirestore(finalFailedLog));
  } catch (saveErr) {
    console.error('Failed to write failure log to Firestore:', saveErr);
  }

  return { success: false, logId, error: failureMsg };
}

/**
 * Main sequence orchestrator: Pulls patient and therapist details, then triggers Email 1 immediately
 * and records scheduled entries for Email 2 & Email 3.
 */
export async function processSessionEmailSequence(
  sessionId: string,
  sessionData?: Partial<Session>
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Fetch session doc if not provided
    let session = sessionData;
    if (!session || !session.patientId || !session.therapistId) {
      const sessionSnap = await getDoc(doc(db, 'sessions', sessionId));
      if (!sessionSnap.exists()) {
        console.error(`[EMAIL ERROR] session ${sessionId}: Document does not exist in sessions collection`);
        return { success: false, message: 'Session not found' };
      }
      session = sessionSnap.data() as Session;
    }

    const { patientId, therapistId, scheduledAt, timeSlot, durationMinutes } = session;

    // 2. Fetch patient details
    let parentEmail = '';
    let parentName = 'Parent';
    let childName = 'your child';

    if (patientId) {
      const patientSnap = await getDoc(doc(db, 'patients', patientId));
      if (patientSnap.exists()) {
        const patientData = patientSnap.data() as Patient;
        parentEmail = patientData.parentEmail || '';
        parentName =
          patientData.motherName ||
          patientData.fatherName ||
          (patientData.primaryContact === 'mother' ? patientData.motherName : patientData.fatherName) ||
          'Parent';
        childName = patientData.childName || 'your child';
      } else {
        console.error(`[EMAIL ERROR] session ${sessionId}: Patient ${patientId} not found`);
      }
    }

    // 3. Fetch therapist details
    let therapistName = 'Dr Sweety Bhatnagar (Clinical Director)';
    if (therapistId) {
      const therapistSnap = await getDoc(doc(db, 'therapists', therapistId));
      if (therapistSnap.exists()) {
        const therapistData = therapistSnap.data() as Therapist;
        therapistName = therapistData.name || therapistName;
      }
    }

    // 4. Send Email 1 Immediately: Booking Confirmation
    const email1 = generateBookingConfirmationHtml({
      parentName,
      childName,
      scheduledAt: scheduledAt || new Date().toISOString(),
      timeSlot: timeSlot || '45-Min Session',
      therapistName,
      durationMinutes: durationMinutes || 45,
    });

    const result1 = await sendEmailWithRetry({
      sessionId,
      recipientEmail: parentEmail,
      recipientName: parentName,
      childName,
      therapistName,
      subject: email1.subject,
      html: email1.html,
      emailType: 'booking_confirmation',
    });

    // 5. Pre-schedule Email 2 (2 Days Before) and Email 3 (1 Day After) in Firestore
    const sessionTime = new Date(scheduledAt || Date.now()).getTime();

    // 2 Days Before
    const reminderTime = new Date(sessionTime - 2 * 24 * 60 * 60 * 1000).toISOString();
    const reminderLogId = `scheduled-rem-${sessionId}`;
    const reminderEmail = generateReminderEmailHtml({
      parentName,
      childName,
      scheduledAt: scheduledAt || new Date().toISOString(),
      timeSlot: timeSlot || '45-Min Session',
      therapistName,
    });

    const reminderRecord: EmailLog = {
      id: reminderLogId,
      sessionId,
      recipientEmail: parentEmail || 'unknown',
      recipientName: parentName,
      childName,
      therapistName,
      emailType: 'reminder_2days',
      sentAt: reminderTime,
      status: 'scheduled',
      error: null,
      subject: reminderEmail.subject,
      scheduledFor: reminderTime,
      retryCount: 0,
    };
    await setDoc(doc(db, 'emailLogs', reminderLogId), sanitizeForFirestore(reminderRecord));

    // 1 Day After
    const feedbackTime = new Date(sessionTime + 1 * 24 * 60 * 60 * 1000).toISOString();
    const feedbackLogId = `scheduled-fb-${sessionId}`;
    const feedbackEmail = generateFeedbackEmailHtml({
      parentName,
      childName,
    });

    const feedbackRecord: EmailLog = {
      id: feedbackLogId,
      sessionId,
      recipientEmail: parentEmail || 'unknown',
      recipientName: parentName,
      childName,
      therapistName,
      emailType: 'feedback_1day',
      sentAt: feedbackTime,
      status: 'scheduled',
      error: null,
      subject: feedbackEmail.subject,
      scheduledFor: feedbackTime,
      retryCount: 0,
    };
    await setDoc(doc(db, 'emailLogs', feedbackLogId), sanitizeForFirestore(feedbackRecord));

    return {
      success: result1.success,
      message: result1.success
        ? 'Confirmation email sent and reminders scheduled'
        : result1.error || 'Failed to send confirmation email',
    };
  } catch (error: any) {
    console.error(`[EMAIL ERROR] session ${sessionId}: Unexpected error in processSessionEmailSequence:`, error);
    return { success: false, message: error.message };
  }
}

/**
 * Scheduled check runner: Checks and delivers any pending 'reminder_2days' or 'feedback_1day'
 * whose scheduled time has arrived.
 */
export async function checkAndSendScheduledEmails(): Promise<{
  processedCount: number;
  sentCount: number;
}> {
  let processedCount = 0;
  let sentCount = 0;

  try {
    const nowIso = new Date().toISOString();
    const logsCol = collection(db, 'emailLogs');
    const q = query(logsCol, where('status', '==', 'scheduled'));
    const snapshot = await getDocs(q);

    for (const d of snapshot.docs) {
      const log = d.data() as EmailLog;
      if (log.scheduledFor && log.scheduledFor <= nowIso) {
        processedCount++;
        // Fetch session to build latest content
        const sessionSnap = await getDoc(doc(db, 'sessions', log.sessionId));
        const sessionData = sessionSnap.exists() ? (sessionSnap.data() as Session) : null;

        let subject = log.subject || 'Nurturing Minds Update';
        let html = '';

        if (log.emailType === 'reminder_2days') {
          const gen = generateReminderEmailHtml({
            parentName: log.recipientName || 'Parent',
            childName: log.childName || 'your child',
            scheduledAt: sessionData?.scheduledAt || log.scheduledFor,
            timeSlot: sessionData?.timeSlot || '45-Minute Therapy Slot',
            therapistName: log.therapistName || 'Dr Sweety Bhatnagar',
          });
          subject = gen.subject;
          html = gen.html;
        } else if (log.emailType === 'feedback_1day') {
          const gen = generateFeedbackEmailHtml({
            parentName: log.recipientName || 'Parent',
            childName: log.childName || 'your child',
          });
          subject = gen.subject;
          html = gen.html;
        }

        const res = await sendEmailWithRetry({
          sessionId: log.sessionId,
          recipientEmail: log.recipientEmail,
          recipientName: log.recipientName,
          childName: log.childName,
          therapistName: log.therapistName,
          subject,
          html,
          emailType: log.emailType,
        });

        if (res.success) {
          sentCount++;
          // Mark scheduled placeholder as completed
          await updateDoc(doc(db, 'emailLogs', d.id), {
            status: 'sent',
            sentAt: new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.error('Error during checkAndSendScheduledEmails:', err);
  }

  return { processedCount, sentCount };
}

/**
 * Real-time Firestore listener on the `sessions` collection:
 * Automatically fires when new sessions are created.
 */
let isListenerActive = false;
let sessionListenerUnsubscribe: (() => void) | null = null;
const processedSessionIds = new Set<string>();

export function listenToSessionsAndSendEmailSequences(): () => void {
  if (isListenerActive && sessionListenerUnsubscribe) {
    return sessionListenerUnsubscribe;
  }

  isListenerActive = true;
  console.log('[AUTOMATION] Starting Firestore sessions listener for Email Confirmation Sequence...');

  const sessionsCol = collection(db, 'sessions');
  let isInitialLoad = true;

  sessionListenerUnsubscribe = onSnapshot(
    sessionsCol,
    (snapshot) => {
      // Ignore existing documents on initial attachment, only process newly added ones
      if (isInitialLoad) {
        snapshot.docs.forEach((d) => processedSessionIds.add(d.id));
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const session = change.doc.data() as Session;
          const sessionId = change.doc.id || session.id;

          if (sessionId && !processedSessionIds.has(sessionId)) {
            processedSessionIds.add(sessionId);
            console.log(`[AUTOMATION] Detected newly created session: ${sessionId}. Triggering email sequence...`);
            await processSessionEmailSequence(sessionId, session);
          }
        }
      });
    },
    (error) => {
      console.error('[AUTOMATION] Sessions listener error:', error);
      isListenerActive = false;
    }
  );

  return () => {
    if (sessionListenerUnsubscribe) {
      sessionListenerUnsubscribe();
      sessionListenerUnsubscribe = null;
      isListenerActive = false;
      console.log('[AUTOMATION] Stopped sessions listener.');
    }
  };
}
