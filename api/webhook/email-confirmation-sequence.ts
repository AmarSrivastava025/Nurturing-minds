import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Resend } from 'resend';

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

const BRAND_PRIMARY = '#6D0281';
const BRAND_PRIMARY_DARK = '#570167';
const BRAND_ACCENT = '#E8590C';
const BRAND_BG = '#FAF7FB';
const CLINIC_NAME = 'Nurturing Minds Therapy Center';
const CLINIC_TAGLINE = 'Pediatric Occupational Therapy Practice';
const CLINIC_PHONE = '+91 97893 05029';
const CLINIC_EMAIL = 'connect@drsweetybhatnagar.com';
const CLINIC_LOCATION = 'Club Opal, Olympia Opaline, Club House, OMR Road, Navalur, Chennai - 600130';
const DEFAULT_APP_URL = 'https://clinic.drsweetybhatnagar.com';
const MAX_ATTEMPTS = 3;

function getDbInstance() {
  const app = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();
  return FIREBASE_CONFIG.firestoreDatabaseId
    ? getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId)
    : getFirestore(app);
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || `Nurturing Minds <${CLINIC_EMAIL}>`;
}

function getResendClient(): Resend | null {
  const rawKey = process.env.RESEND_API_KEY;
  if (!rawKey) return null;
  const apiKey = rawKey.trim();
  if (!apiKey || apiKey.startsWith('re_xxxx') || apiKey.length < 10) return null;
  return new Resend(apiKey);
}

async function sendWithRetry(
  client: Resend,
  message: { from: string; to: string; subject: string; html: string },
  maxAttempts = MAX_ATTEMPTS
): Promise<{ ok: boolean; attempts: number; error?: string }> {
  let lastError: string | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response: any = await client.emails.send(message);
      if (response?.error) throw new Error(response.error.message || 'Resend rejected the message');
      return { ok: true, attempts: attempt };
    } catch (err: any) {
      lastError = err?.message || String(err);
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return { ok: false, attempts: maxAttempts, error: lastError || 'Unknown Resend error' };
}

function formatAppointmentDate(dateInput: string | Date | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
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

function isUsableUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return !/placeholder|example\.com|xxxx/i.test(trimmed);
}

interface ShellParams {
  preheader: string;
  heading: string;
  intro: string;
  body: string;
  appUrl?: string;
}

function renderShell({ preheader, heading, intro, body, appUrl }: ShellParams): string {
  const baseUrl = appUrl || DEFAULT_APP_URL;
  const logoUrl = `${baseUrl}/logo.svg`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${heading}</title>
</head>
<body style="margin:0;padding:24px;background-color:${BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#2d3748;">
  <div style="display:none;font-size:1px;color:${BRAND_BG};max-height:0;overflow:hidden;">${preheader}</div>
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #ece3f0;box-shadow:0 6px 18px -8px rgba(109,2,129,0.25);">

    <div style="background:linear-gradient(135deg,${BRAND_PRIMARY} 0%,${BRAND_PRIMARY_DARK} 100%);padding:26px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:52px;vertical-align:middle;">
            <img src="${logoUrl}" width="44" height="44" alt="${CLINIC_NAME}" style="display:block;width:44px;height:44px;border-radius:50%;background:#ffffff;padding:4px;">
          </td>
          <td style="padding-left:14px;vertical-align:middle;">
            <div style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:-0.3px;">${CLINIC_NAME}</div>
            <div style="color:#f3d9fa;font-size:13px;margin-top:2px;">${CLINIC_TAGLINE}</div>
          </td>
        </tr>
      </table>
    </div>

    <div style="height:4px;background:${BRAND_ACCENT};"></div>

    <div style="padding:30px 28px;">
      <h1 style="margin:0 0 14px 0;color:#1a202c;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${heading}</h1>
      <p style="margin:0;font-size:15px;color:#4a5568;">${intro}</p>
      ${body}
    </div>

    <div style="background:#faf7fb;border-top:1px solid #ece3f0;padding:22px 28px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:${BRAND_PRIMARY};">${CLINIC_NAME}</p>
      <p style="margin:6px 0 0 0;font-size:12px;color:#718096;">${CLINIC_LOCATION}</p>
      <p style="margin:4px 0 0 0;font-size:12px;color:#718096;">
        Phone: <a href="tel:${CLINIC_PHONE.replace(/\s/g, '')}" style="color:${BRAND_PRIMARY};text-decoration:none;">${CLINIC_PHONE}</a>
        &nbsp;&bull;&nbsp;
        Email: <a href="mailto:${CLINIC_EMAIL}" style="color:${BRAND_PRIMARY};text-decoration:none;">${CLINIC_EMAIL}</a>
      </p>
      <p style="margin:12px 0 0 0;font-size:11px;color:#a0aec0;">
        You are receiving this email because your child is enrolled at ${CLINIC_NAME}.
      </p>
    </div>

  </div>
</body>
</html>`.trim();
}

function detailRow(label: string, value: string, isLast = false): string {
  const border = isLast ? '' : 'border-bottom:1px solid #f0e6f4;';
  return `<tr>
    <td style="padding:9px 0;${border}color:#718096;font-size:14px;width:110px;vertical-align:top;">${label}</td>
    <td style="padding:9px 0;${border}color:#1a202c;font-size:14px;font-weight:600;">${value}</td>
  </tr>`;
}

function detailCard(title: string, rows: string): string {
  return `<div style="background:#fbf5fd;border:1px solid #f0e6f4;border-left:4px solid ${BRAND_PRIMARY};border-radius:0 10px 10px 0;padding:18px 20px;margin:22px 0;">
    <div style="color:${BRAND_PRIMARY};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">${title}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${rows}</table>
  </div>`;
}

function bulletList(title: string, items: string[]): string {
  const lis = items.map((item) => `<li style="margin-bottom:6px;">${item}</li>`).join('');
  return `<div style="background:#ffffff;border:1px solid #ece3f0;border-radius:10px;padding:18px 20px;margin:22px 0;">
    <div style="color:#1a202c;font-size:14px;font-weight:700;margin-bottom:8px;">${title}</div>
    <ul style="margin:0;padding-left:20px;color:#4a5568;font-size:14px;">${lis}</ul>
  </div>`;
}

function bookingEmail(params: {
  parentName: string;
  childName: string;
  scheduledAt: string;
  timeSlot: string;
  therapistName: string;
  durationMinutes?: number;
  appUrl?: string;
}): { subject: string; html: string } {
  const rows = [
    detailRow('Date', formatAppointmentDate(params.scheduledAt)),
    detailRow('Time', params.timeSlot || '45-Minute Therapy Slot'),
    detailRow('Therapist', params.therapistName),
    detailRow('Duration', `${params.durationMinutes || 45} minutes`),
    detailRow('Location', CLINIC_LOCATION, true),
  ].join('');

  return {
    subject: 'Your appointment with Dr Sweety is confirmed',
    html: renderShell({
      preheader: `Appointment confirmed for ${params.childName}.`,
      heading: 'Your appointment is confirmed',
      intro: `Hi <strong>${params.parentName}</strong>, great news — the appointment for <strong>${params.childName}</strong> has been confirmed.`,
      body: `${detailCard('Session Details', rows)}
${bulletList('What to bring', [
        "Your child's medical reports and previous assessment cards (if any)",
        'A notebook for observations and clinical notes (optional)',
        'Comfortable clothing that allows free movement during therapy',
      ])}
<p style="margin:22px 0 0 0;font-size:14px;color:#4a5568;">Questions? Simply reply to this email or call us at <strong style="color:${BRAND_PRIMARY};">${CLINIC_PHONE}</strong>.</p>
<p style="margin:22px 0 0 0;font-size:14px;color:#4a5568;">Warm regards,<br><strong style="color:${BRAND_PRIMARY};">Nurturing Minds Team</strong></p>`,
      appUrl: params.appUrl,
    }),
  };
}

function reminderEmail(params: {
  parentName: string;
  childName: string;
  scheduledAt: string;
  timeSlot: string;
  therapistName: string;
  appUrl?: string;
}): { subject: string; html: string } {
  const rows = [
    detailRow('Date', formatAppointmentDate(params.scheduledAt)),
    detailRow('Time', params.timeSlot || '45-Minute Therapy Slot'),
    detailRow('Therapist', params.therapistName, true),
  ].join('');

  return {
    subject: 'Reminder: your appointment is in 2 days',
    html: renderShell({
      preheader: `${params.childName}'s appointment is in 2 days.`,
      heading: 'Your appointment is in 2 days',
      intro: `Hi <strong>${params.parentName}</strong>, a friendly reminder that <strong>${params.childName}</strong> has a therapy session coming up in two days.`,
      body: `${detailCard('Upcoming Session', rows)}
${bulletList('Pre-session tips', [
        'Ensure your child is well rested before the appointment',
        'Avoid heavy meals 30 minutes before the session',
        'Plan to arrive 10 minutes early so your child can settle in',
      ])}
<p style="margin:22px 0 0 0;font-size:14px;color:#4a5568;">Need to reschedule? Call us at <strong style="color:${BRAND_PRIMARY};">${CLINIC_PHONE}</strong> at the earliest so we can offer the slot to another family.</p>
<p style="margin:22px 0 0 0;font-size:14px;color:#4a5568;">See you soon,<br><strong style="color:${BRAND_PRIMARY};">Nurturing Minds Team</strong></p>`,
      appUrl: params.appUrl,
    }),
  };
}

function feedbackEmail(params: {
  parentName: string;
  childName: string;
  appUrl?: string;
  googleFormUrl?: string;
}): { subject: string; html: string } {
  const formUrl = params.googleFormUrl;
  const appUrl = params.appUrl || DEFAULT_APP_URL;

  const feedbackBlock = isUsableUrl(formUrl)
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${formUrl}" target="_blank" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:8px;font-weight:600;font-size:15px;">Share session feedback &rarr;</a>
      </div>`
    : `<div style="background:#fbf5fd;border:1px solid #f0e6f4;border-radius:10px;padding:18px 20px;margin:22px 0;">
        <p style="margin:0;font-size:14px;color:#4a5568;">Please reply to this email and tell us how the session went for <strong>${params.childName}</strong> — your feedback helps us serve your family better.</p>
      </div>`;

  return {
    subject: "How was your session? We'd love your feedback",
    html: renderShell({
      preheader: `Thank you for attending ${params.childName}'s session.`,
      heading: 'We value your feedback',
      intro: `Hi <strong>${params.parentName}</strong>, thank you for attending a session with us. We hope <strong>${params.childName}</strong> had a wonderful and supportive experience.`,
      body: `${feedbackBlock}
${
        isUsableUrl(appUrl)
          ? `<p style="margin:0;font-size:14px;color:#4a5568;">Ready to book the next session? Visit <a href="${appUrl}" target="_blank" style="color:${BRAND_PRIMARY};font-weight:600;text-decoration:underline;">your family portal</a>.</p>`
          : ''
      }
<p style="margin:22px 0 0 0;font-size:14px;color:#4a5568;">Best regards,<br><strong style="color:${BRAND_PRIMARY};">Nurturing Minds Team</strong></p>`,
      appUrl,
    }),
  };
}

async function processScheduledEmails(
  db: any,
  resend: Resend,
  fromEmail: string,
  appUrl: string,
  feedbackFormUrl: string
) {
  const nowIso = new Date().toISOString();
  const result = { processedCount: 0, sentCount: 0, failedCount: 0, deferredCount: 0 };

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
    const scheduledAt = session?.scheduledAt || log.scheduledFor;

    let generated: { subject: string; html: string };

    if (log.emailType === 'reminder_2days') {
      generated = reminderEmail({
        parentName,
        childName,
        scheduledAt,
        timeSlot: session?.timeSlot || '45-Minute Therapy Slot',
        therapistName,
        appUrl,
      });
    } else if (log.emailType === 'feedback_1day') {
      generated = feedbackEmail({ parentName, childName, appUrl, googleFormUrl: feedbackFormUrl });
    } else {
      result.failedCount++;
      await updateDoc(logRef, {
        status: 'failed',
        error: `Unsupported scheduled email type: ${log.emailType || 'unknown'}`,
        sentAt: nowIso,
      });
      continue;
    }

    const sendResult = await sendWithRetry(resend, {
      from: fromEmail,
      to: recipientEmail,
      subject: generated.subject,
      html: generated.html,
    });

    const totalAttempts = Number(log.retryCount || 0) + sendResult.attempts;

    if (sendResult.ok) {
      result.sentCount++;
      await updateDoc(logRef, {
        status: 'sent',
        sentAt: nowIso,
        subject: generated.subject,
        error: null,
        retryCount: Math.max(0, totalAttempts - 1),
      });
      continue;
    }

    if (totalAttempts >= MAX_ATTEMPTS) {
      result.failedCount++;
      await updateDoc(logRef, {
        status: 'failed',
        sentAt: nowIso,
        subject: generated.subject,
        error: sendResult.error || 'Send failed after retries.',
        retryCount: totalAttempts,
      });
    } else {
      result.deferredCount++;
      await updateDoc(logRef, {
        subject: generated.subject,
        error: sendResult.error || 'Send failed; will retry on the next run.',
        retryCount: totalAttempts,
      });
    }
  }

  return result;
}

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

  const fromEmail = getFromEmail();
  const appUrl = process.env.APP_URL || DEFAULT_APP_URL;
  const feedbackFormUrl = process.env.RESEND_FEEDBACK_FORM_URL || '';

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const db = getDbInstance();

    if (body.action === 'process_scheduled') {
      const runResult = await processScheduledEmails(db, resend, fromEmail, appUrl, feedbackFormUrl);
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

    const generated = bookingEmail({
      parentName,
      childName,
      scheduledAt: session.scheduledAt || new Date().toISOString(),
      timeSlot: session.timeSlot || '45-Minute Therapy Slot',
      therapistName,
      durationMinutes: session.durationMinutes || 45,
      appUrl,
    });

    const sendResult = await sendWithRetry(resend, {
      from: fromEmail,
      to: parentEmail,
      subject: generated.subject,
      html: generated.html,
    });

    const sentAt = new Date().toISOString();

    await setDoc(bookingLogRef, {
      id: bookingLogId,
      sessionId,
      recipientEmail: parentEmail,
      recipientName: parentName,
      childName,
      therapistName,
      emailType: 'booking_confirmation',
      subject: generated.subject,
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
    const scheduledRows = [
      {
        id: `scheduled-rem-${sessionId}`,
        emailType: 'reminder_2days',
        scheduledFor: new Date(sessionTime - 2 * 24 * 60 * 60 * 1000).toISOString(),
        subject: 'Reminder: your appointment is in 2 days',
      },
      {
        id: `scheduled-fb-${sessionId}`,
        emailType: 'feedback_1day',
        scheduledFor: new Date(sessionTime + 1 * 24 * 60 * 60 * 1000).toISOString(),
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
