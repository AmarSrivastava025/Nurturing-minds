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
const FIREBASE_CONFIG = {
  projectId: process.env.FIREBASE_PROJECT_ID || "balmy-wharf-97dgj",
  appId: "1:1038683265587:web:016f51594477b4b1ada146",
  apiKey: "AIzaSyAnbryZy8wAuJSN5dC0_OPjeQn5Tpd6B9w",
  authDomain: "balmy-wharf-97dgj.firebaseapp.com",
  firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || "ai-studio-nurturingmindsth-306ae0f0-9613-4944-96ec-a37fdb5bd347",
  storageBucket: "balmy-wharf-97dgj.firebasestorage.app",
  messagingSenderId: "1038683265587"
};

function getDbInstance() {
  const app = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();
  return FIREBASE_CONFIG.firestoreDatabaseId
    ? getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId)
    : getFirestore(app);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const resend = resendApiKey && !resendApiKey.startsWith('re_xxxx') ? new Resend(resendApiKey) : null;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Nurturing Minds <connect@drsweetybhatnagar.com>';
    const db = getDbInstance();

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
