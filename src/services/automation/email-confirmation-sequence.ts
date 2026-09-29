import { collection, onSnapshot, db } from '../firebase';
import { Patient, Session, Therapist } from '../../types';
import {
  CLINIC_LOCATION,
  CLINIC_PHONE,
  GOOGLE_FEEDBACK_FORM_URL,
  formatAppointmentDate,
  generateBookingConfirmationHtml,
  generateReminderEmailHtml,
  generateFeedbackEmailHtml,
} from './email-templates';

export {
  CLINIC_LOCATION,
  CLINIC_PHONE,
  GOOGLE_FEEDBACK_FORM_URL,
  formatAppointmentDate,
  generateBookingConfirmationHtml,
  generateReminderEmailHtml,
  generateFeedbackEmailHtml,
};

const EMAIL_AUTOMATION_ENDPOINT = '/api/webhook/email-confirmation-sequence';

export interface EmailSequenceResult {
  success: boolean;
  message: string;
}

export interface ScheduledEmailRunResult {
  processedCount: number;
  sentCount: number;
  failedCount: number;
}

async function callEmailAutomation(payload: Record<string, unknown>): Promise<any> {
  const response = await fetch(EMAIL_AUTOMATION_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const reason = data?.error || data?.message || `Email service responded with ${response.status}`;
    throw new Error(reason);
  }

  return data || {};
}

export async function fetchEmailServiceStatus(): Promise<{
  online: boolean;
  resendConfigured: boolean;
}> {
  try {
    const response = await fetch(EMAIL_AUTOMATION_ENDPOINT, { method: 'GET' });
    if (!response.ok) return { online: false, resendConfigured: false };
    const data = await response.json().catch(() => null);
    return { online: true, resendConfigured: Boolean(data?.resendConfigured) };
  } catch {
    return { online: false, resendConfigured: false };
  }
}

export async function processSessionEmailSequence(
  sessionId: string,
  _sessionData?: Partial<Session>,
  _patientDataOverride?: Partial<Patient>,
  _therapistDataOverride?: Partial<Therapist>
): Promise<EmailSequenceResult> {
  if (!sessionId) {
    return { success: false, message: 'A session id is required to send the confirmation email.' };
  }

  try {
    const data = await callEmailAutomation({ sessionId });

    if (data.alreadySent) {
      return {
        success: true,
        message: `Booking confirmation was already delivered to ${data.recipientEmail}.`,
      };
    }

    if (data.success === false) {
      return { success: false, message: data.error || 'The email service could not send the confirmation.' };
    }

    return {
      success: true,
      message: `Booking confirmation sent to ${data.recipientEmail}, with the 2-day reminder and 1-day feedback queued.`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Could not reach the email service.' };
  }
}

export async function checkAndSendScheduledEmails(): Promise<ScheduledEmailRunResult> {
  try {
    const data = await callEmailAutomation({ action: 'process_scheduled' });
    return {
      processedCount: Number(data.processedCount || 0),
      sentCount: Number(data.sentCount || 0),
      failedCount: Number(data.failedCount || 0),
    };
  } catch (err: any) {
    console.error('Scheduled email run failed:', err?.message || err);
    return { processedCount: 0, sentCount: 0, failedCount: 0 };
  }
}

let isListenerActive = false;
let sessionListenerUnsubscribe: (() => void) | null = null;
const processedSessionIds = new Set<string>();

export function listenToSessionsAndSendEmailSequences(): () => void {
  if (isListenerActive && sessionListenerUnsubscribe) {
    return sessionListenerUnsubscribe;
  }

  isListenerActive = true;

  const sessionsCol = collection(db, 'sessions');
  let isInitialLoad = true;

  sessionListenerUnsubscribe = onSnapshot(
    sessionsCol,
    (snapshot) => {
      if (isInitialLoad) {
        snapshot.docs.forEach((d) => processedSessionIds.add(d.id));
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added') return;

        const session = change.doc.data() as Session;
        const sessionId = change.doc.id || session.id;
        if (!sessionId || processedSessionIds.has(sessionId)) return;

        processedSessionIds.add(sessionId);
        processSessionEmailSequence(sessionId, session).catch((err) =>
          console.error('Email sequence trigger failed:', err?.message || err)
        );
      });
    },
    (error) => {
      console.error('Sessions listener error:', error);
      isListenerActive = false;
    }
  );

  return () => {
    if (sessionListenerUnsubscribe) {
      sessionListenerUnsubscribe();
      sessionListenerUnsubscribe = null;
      isListenerActive = false;
    }
  };
}
