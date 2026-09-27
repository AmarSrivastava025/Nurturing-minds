import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';

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
    const db = getDbInstance();
    const nowIso = new Date().toISOString();

    const q = query(
      collection(db, 'messageLogs'),
      where('status', '==', 'scheduled')
    );

    const snapshot = await getDocs(q);
    const dueMessages: any[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.scheduledFor && data.scheduledFor <= nowIso) {
        dueMessages.push({ id: docSnap.id, ...data });
      }
    });

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioConfigured = Boolean(twilioAccountSid && twilioAuthToken);

    let processedCount = 0;
    let sentCount = 0;

    for (const msg of dueMessages) {
      processedCount++;
      let sendSuccess = true;
      let errorMsg: string | null = null;

      if (twilioConfigured && msg.recipientPhone) {
        try {
          const from =
            msg.channel === 'whatsapp'
              ? process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
              : process.env.TWILIO_PHONE_NUMBER || '+14155238886';
          const to =
            msg.channel === 'whatsapp'
              ? `whatsapp:${msg.recipientPhone}`
              : msg.recipientPhone;

          const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
          const authHeader =
            'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

          const form = new URLSearchParams();
          form.append('To', to);
          form.append('From', from);
          form.append('Body', msg.body);

          const twRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: form.toString(),
          });

          if (!twRes.ok) {
            const errData = (await twRes.json()) as any;
            sendSuccess = false;
            errorMsg = errData.message || `Twilio HTTP error ${twRes.status}`;
          }
        } catch (err: any) {
          sendSuccess = false;
          errorMsg = err.message || 'Twilio delivery error';
        }
      }

      await updateDoc(doc(db, 'messageLogs', msg.id), {
        status: sendSuccess ? 'sent' : 'failed',
        sentAt: new Date().toISOString(),
        error: errorMsg,
        retryCount: (msg.retryCount || 0) + 1,
      });

      if (sendSuccess) sentCount++;
    }

    return res.status(200).json({
      success: true,
      timestamp: nowIso,
      scheduledFound: dueMessages.length,
      processedCount,
      sentCount,
    });
  } catch (error: any) {
    console.error('Error executing scheduled WhatsApp/SMS cron:', error);
    return res.status(500).json({ error: error.message || 'Internal cron error' });
  }
}
