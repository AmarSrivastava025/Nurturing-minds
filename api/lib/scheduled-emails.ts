import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Resend } from 'resend';
import {
  generateFeedbackEmailHtml,
  generateReminderEmailHtml,
  type EmailBranding,
} from './email-templates';
import { sendEmailWithRetry } from './email-sender';

const MAX_SEND_ATTEMPTS = 3;

export interface ScheduledRunResult {
  processedCount: number;
  sentCount: number;
  failedCount: number;
  deferredCount: number;
}

export async function processScheduledEmails(params: {
  db: Firestore;
  resend: Resend;
  fromEmail: string;
  appUrl: string;
  feedbackFormUrl?: string;
}): Promise<ScheduledRunResult> {
  const { db, resend, fromEmail, appUrl, feedbackFormUrl } = params;
  const nowIso = new Date().toISOString();
  const branding: EmailBranding = { appUrl };

  const result: ScheduledRunResult = {
    processedCount: 0,
    sentCount: 0,
    failedCount: 0,
    deferredCount: 0,
  };

  const snapshot = await getDocs(
    query(collection(db, 'emailLogs'), where('status', '==', 'scheduled'))
  );

  for (const logDoc of snapshot.docs) {
    const log: any = logDoc.data();
    if (!log?.scheduledFor || log.scheduledFor > nowIso) continue;

    result.processedCount++;
    const logRef = doc(db, 'emailLogs', logDoc.id);

    const recipientEmail = String(log.recipientEmail || '').trim();
    if (!recipientEmail.includes('@')) {
      result.failedCount++;
      await updateDoc(logRef, {
        status: 'failed',
        error: 'Recipient email is missing or invalid.',
        sentAt: nowIso,
      });
      continue;
    }

    let session: any = null;
    if (log.sessionId) {
      const sessionSnap = await getDoc(doc(db, 'sessions', log.sessionId));
      if (sessionSnap.exists()) session = sessionSnap.data();
    }

    const parentName = log.recipientName || 'Parent';
    const childName = log.childName || 'your child';
    const therapistName = log.therapistName || 'Dr Sweety Bhatnagar (Clinical Director)';

    let subject = log.subject || 'Nurturing Minds appointment update';
    let html = '';

    if (log.emailType === 'reminder_2days') {
      const generated = generateReminderEmailHtml({
        parentName,
        childName,
        scheduledAt: session?.scheduledAt || log.scheduledFor,
        timeSlot: session?.timeSlot || '45-Minute Therapy Slot',
        therapistName,
        branding,
      });
      subject = generated.subject;
      html = generated.html;
    } else if (log.emailType === 'feedback_1day') {
      const generated = generateFeedbackEmailHtml({
        parentName,
        childName,
        appUrl,
        googleFormUrl: feedbackFormUrl,
        branding,
      });
      subject = generated.subject;
      html = generated.html;
    } else {
      result.failedCount++;
      await updateDoc(logRef, {
        status: 'failed',
        error: `Unsupported scheduled email type: ${log.emailType || 'unknown'}`,
        sentAt: nowIso,
      });
      continue;
    }

    const sendResult = await sendEmailWithRetry(
      resend,
      { from: fromEmail, to: recipientEmail, subject, html },
      MAX_SEND_ATTEMPTS
    );

    const priorAttempts = Number(log.retryCount || 0);
    const totalAttempts = priorAttempts + sendResult.attempts;

    if (sendResult.ok) {
      result.sentCount++;
      await updateDoc(logRef, {
        status: 'sent',
        sentAt: nowIso,
        subject,
        error: null,
        retryCount: Math.max(0, totalAttempts - 1),
      });
      continue;
    }

    if (totalAttempts >= MAX_SEND_ATTEMPTS) {
      result.failedCount++;
      await updateDoc(logRef, {
        status: 'failed',
        sentAt: nowIso,
        subject,
        error: sendResult.error || 'Send failed after retries.',
        retryCount: totalAttempts,
      });
    } else {
      result.deferredCount++;
      await updateDoc(logRef, {
        subject,
        error: sendResult.error || 'Send failed; will retry on the next run.',
        retryCount: totalAttempts,
      });
    }
  }

  return result;
}
