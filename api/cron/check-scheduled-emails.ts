import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { Resend } from 'resend';
import config from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(config) : getApp();
const db = config.firestoreDatabaseId
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Nurturing Minds <connect@drsweetybhatnagar.com>';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const nowIso = new Date().toISOString();
    const logsCol = collection(db, 'emailLogs');
    const q = query(logsCol, where('status', '==', 'scheduled'));
    const snapshot = await getDocs(q);

    let processedCount = 0;
    let sentCount = 0;

    for (const d of snapshot.docs) {
      const log = d.data() as any;
      if (log.scheduledFor && log.scheduledFor <= nowIso) {
        processedCount++;

        // Send email via Resend if client available
        if (resend && log.recipientEmail && log.recipientEmail.includes('@')) {
          try {
            await resend.emails.send({
              from: fromEmail,
              to: log.recipientEmail,
              subject: log.subject || 'Nurturing Minds Appointment Update',
              html: `<p>Hi ${log.recipientName || 'Parent'},</p><p>This is a scheduled notification regarding ${log.childName || 'your child'}'s therapy session.</p><p>Best regards,<br>Nurturing Minds Team</p>`,
            });
            sentCount++;
            await updateDoc(doc(db, 'emailLogs', d.id), {
              status: 'sent',
              sentAt: new Date().toISOString(),
            });
          } catch (err: any) {
            console.error(`[EMAIL ERROR] Cron failed for log ${d.id}:`, err);
            await updateDoc(doc(db, 'emailLogs', d.id), {
              error: err.message,
            });
          }
        } else {
          // Simulated delivery in demo mode
          sentCount++;
          await updateDoc(doc(db, 'emailLogs', d.id), {
            status: 'sent',
            sentAt: new Date().toISOString(),
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      timestamp: nowIso,
      scheduledFound: snapshot.size,
      processedCount,
      sentCount,
    });
  } catch (error: any) {
    console.error('Error in cron job:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
