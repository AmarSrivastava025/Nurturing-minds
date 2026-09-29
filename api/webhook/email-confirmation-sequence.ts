import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import {
  generateBookingConfirmationHtml,
  type EmailBranding,
} from '../../src/services/automation/email-templates';
import { DEFAULT_FROM_EMAIL, getResendClient, sendEmailWithRetry } from '../../src/services/automation/email-sender';
import { processScheduledEmails } from '../../src/services/automation/scheduled-emails';

const FIREBASE_CONFIG = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'balmy-wharf-97dgj',
  appId: '1:1038683265587:web:016f51594477b4b1ada146',
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyAnbryZy8wAuJSN5dC0_OPjeQn5Tpd6B9w',
  authDomain: 'balmy-wharf-97dgj.firebaseapp.com',
  firestoreDatabaseId:
    process.env.FIRESTORE_DATABASE_ID ||
    'ai-studio-nurturingmindsth-306ae0f0-9613-4944-96ec-a37fdb5bd347',
  storageBucket: 'balmy-wharf-97dgj.firebasestorage.app',
  messagingSenderId: '1038683265587',
};

function getDbInstance() {
  const app = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();
  return FIREBASE_CONFIG.firestoreDatabaseId
    ? getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId)
    : getFirestore(app);
}

const MAX_ATTEMPTS = 3;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'Nurturing Minds email automation',
      resendConfigured: Boolean(getResendClient()),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resend = getResendClient();
  if (!resend) {
    console.error('[EMAIL ERROR] RESEND_API_KEY is not configured on the server.');
    return res.status(503).json({
      success: false,
      error: 'Email sending is not configured. Set RESEND_API_KEY in the server environment.',
    });
  }

  const fromEmail = DEFAULT_FROM_EMAIL;
  const appUrl = process.env.APP_URL || '';
  const feedbackFormUrl = process.env.RESEND_FEEDBACK_FORM_URL || '';
  const branding: EmailBranding = { appUrl };

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const db = getDbInstance();

    if (body.action === 'process_scheduled') {
      const runResult = await processScheduledEmails({
        db,
        resend,
        fromEmail,
        appUrl,
        feedbackFormUrl,
      });
      return res.status(200).json({ success: true, ...runResult });
    }

    const sessionId = String(body.sessionId || '').trim();
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required in the request body.' });
    }

    const bookingLogId = `booking-${sessionId}`;
    const bookingLogRef = doc(db, 'emailLogs', bookingLogId);
    const existingLog = await getDoc(bookingLogRef);
    if (existingLog.exists() && existingLog.data()?.status === 'sent') {
      return res.status(200).json({
        success: true,
        alreadySent: true,
        sessionId,
        logId: bookingLogId,
        recipientEmail: existingLog.data()?.recipientEmail,
      });
    }

    const sessionSnap = await getDoc(doc(db, 'sessions', sessionId));
    if (!sessionSnap.exists()) {
      return res.status(404).json({ error: `Session ${sessionId} was not found.` });
    }
    const session: any = sessionSnap.data();

    let patient: any = null;
    if (session.patientId) {
      const patientSnap = await getDoc(doc(db, 'patients', session.patientId));
      if (patientSnap.exists()) patient = patientSnap.data();
    }

    const parentEmail = String(patient?.parentEmail || '').trim().toLowerCase();
    const parentName = patient?.motherName || patient?.fatherName || 'Parent';
    const childName = patient?.childName || 'your child';

    if (!parentEmail || !parentEmail.includes('@')) {
      const errorMsg = `Parent email is missing or invalid for ${childName}. Add an email to the patient record to enable automation.`;
      console.error(`[EMAIL ERROR] session ${sessionId}: ${errorMsg}`);
      await setDoc(bookingLogRef, {
        id: bookingLogId,
        sessionId,
        recipientEmail: parentEmail || 'unknown',
        recipientName: parentName,
        childName,
        emailType: 'booking_confirmation',
        subject: 'Your appointment with Dr Sweety is confirmed',
        status: 'failed',
        error: errorMsg,
        sentAt: new Date().toISOString(),
        retryCount: 0,
      });
      return res.status(200).json({ success: false, error: errorMsg, logId: bookingLogId });
    }

    let therapistName = 'Dr Sweety Bhatnagar (Clinical Director)';
    if (session.therapistId) {
      const therapistSnap = await getDoc(doc(db, 'therapists', session.therapistId));
      if (therapistSnap.exists()) {
        therapistName = therapistSnap.data()?.name || therapistName;
      }
    }

    const { subject, html } = generateBookingConfirmationHtml({
      parentName,
      childName,
      scheduledAt: session.scheduledAt || new Date().toISOString(),
      timeSlot: session.timeSlot || '45-Minute Therapy Slot',
      therapistName,
      durationMinutes: session.durationMinutes || 45,
      branding,
    });

    const sendResult = await sendEmailWithRetry(
      resend,
      { from: fromEmail, to: parentEmail, subject, html },
      MAX_ATTEMPTS
    );

    const sentAt = new Date().toISOString();

    await setDoc(bookingLogRef, {
      id: bookingLogId,
      sessionId,
      recipientEmail: parentEmail,
      recipientName: parentName,
      childName,
      therapistName,
      emailType: 'booking_confirmation',
      subject,
      status: sendResult.ok ? 'sent' : 'failed',
      error: sendResult.ok ? null : sendResult.error || 'Send failed.',
      sentAt,
      retryCount: Math.max(0, sendResult.attempts - 1),
    });

    if (!sendResult.ok) {
      console.error(`[EMAIL FAILED] booking confirmation for session ${sessionId}: ${sendResult.error}`);
      return res.status(200).json({
        success: false,
        logId: bookingLogId,
        sessionId,
        recipientEmail: parentEmail,
        status: 'failed',
        error: sendResult.error,
      });
    }

    const sessionTime = new Date(session.scheduledAt || Date.now()).getTime();
    const reminderTime = new Date(sessionTime - 2 * 24 * 60 * 60 * 1000).toISOString();
    const feedbackTime = new Date(sessionTime + 1 * 24 * 60 * 60 * 1000).toISOString();

    const scheduledRows: Array<{ id: string; emailType: string; scheduledFor: string; subject: string }> = [
      {
        id: `scheduled-rem-${sessionId}`,
        emailType: 'reminder_2days',
        scheduledFor: reminderTime,
        subject: 'Reminder: your appointment is in 2 days',
      },
      {
        id: `scheduled-fb-${sessionId}`,
        emailType: 'feedback_1day',
        scheduledFor: feedbackTime,
        subject: "How was your session? We'd love your feedback",
      },
    ];

    for (const row of scheduledRows) {
      if (row.scheduledFor <= sentAt) continue;

      const scheduledRef = doc(db, 'emailLogs', row.id);
      const scheduledExisting = await getDoc(scheduledRef);
      if (scheduledExisting.exists() && scheduledExisting.data()?.status === 'sent') continue;

      await setDoc(scheduledRef, {
        id: row.id,
        sessionId,
        recipientEmail: parentEmail,
        recipientName: parentName,
        childName,
        therapistName,
        emailType: row.emailType,
        subject: row.subject,
        status: 'scheduled',
        error: null,
        sentAt: row.scheduledFor,
        scheduledFor: row.scheduledFor,
        retryCount: 0,
      });
    }

    console.log(`[EMAIL SENT] booking confirmation to ${parentEmail} for session ${sessionId}`);

    return res.status(200).json({
      success: true,
      logId: bookingLogId,
      sessionId,
      recipientEmail: parentEmail,
      status: 'sent',
      attempts: sendResult.attempts,
    });
  } catch (error: any) {
    console.error('[EMAIL ERROR] Unhandled automation failure:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Email automation failed unexpectedly.' });
  }
}
