import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
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

function cleanPhoneNumber(rawPhone: string): { formatted: string; isValid: boolean } {
  if (!rawPhone) return { formatted: '', isValid: false };
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) return { formatted: `+91${digits}`, isValid: true };
  if (digits.length === 12 && digits.startsWith('91')) return { formatted: `+${digits}`, isValid: true };
  return { formatted: rawPhone.startsWith('+') ? rawPhone : `+${digits}`, isValid: digits.length >= 10 };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;

    const twilioConfigured = Boolean(twilioAccountSid && twilioAuthToken);
    const webhookConfigured = Boolean(webhookUrl);

    if (req.method === 'GET') {
      return res.status(200).json({
        status: 'online',
        service: 'Nurturing Minds WhatsApp & SMS Automation Service',
        twilioConfigured,
        webhookConfigured,
        clinicLocation: '2nd Floor, Navalur, Chennai',
        director: 'Dr. Sweety Bhatnagar',
      });
    }

    if (req.method === 'POST') {
      const {
        sessionId,
        type = 'reminder_24h',
        channel = 'whatsapp',
        newTherapistId,
        reason,
        customPhone,
        customBody,
      } = req.body || {};

      const db = getDbInstance();

      let targetPhone = customPhone || '';
      let targetName = 'Parent';
      let childName = 'Child';
      let therapistName = 'Dr. Sweety Bhatnagar';
      let timeSlot = '45-min slot';
      let scheduledAt = new Date().toISOString();

      // If sessionId is provided, fetch clinical context from Firestore
      if (sessionId) {
        const sessionRef = doc(db, 'sessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (sessionSnap.exists()) {
          const sessionData = sessionSnap.data() as any;
          scheduledAt = sessionData.scheduledAt || scheduledAt;
          timeSlot = sessionData.timeSlot || timeSlot;

          // Fetch patient
          if (sessionData.patientId) {
            const patSnap = await getDoc(doc(db, 'patients', sessionData.patientId));
            if (patSnap.exists()) {
              const pat = patSnap.data() as any;
              childName = pat.childName || childName;
              const isFather = pat.primaryContact === 'father';
              targetName = isFather ? pat.fatherName || 'Parent' : pat.motherName || 'Parent';
              if (!targetPhone) {
                targetPhone = isFather
                  ? pat.fatherContact || pat.motherContact || ''
                  : pat.motherContact || pat.fatherContact || '';
              }
            }
          }

          // Fetch therapist
          const activeThId = newTherapistId || sessionData.therapistId;
          if (activeThId) {
            const thSnap = await getDoc(doc(db, 'therapists', activeThId));
            if (thSnap.exists()) {
              therapistName = (thSnap.data() as any).name || therapistName;
            }
          }
        }
      }

      const { formatted, isValid } = cleanPhoneNumber(targetPhone);
      if (!isValid) {
        return res.status(400).json({
          error: `Invalid recipient phone number: ${targetPhone || 'None provided'}`,
        });
      }

      // Generate Message Body if not explicitly passed
      let messageBody = customBody || '';
      if (!messageBody) {
        if (type === 'therapist_swap') {
          messageBody = `🚨 *Clinical Schedule Update — Nurturing Minds Therapy Center*
Dear ${targetName},
Regarding *${childName}*'s session today at *${timeSlot}*:
Due to clinical scheduling${reason ? ` (${reason})` : ''}, Dr. Sweety Bhatnagar has assigned *${therapistName}* to conduct today's session.
All clinical developmental notes have been thoroughly reviewed.
Thank you for your understanding!
Dr. Sweety Bhatnagar & Team
📞 +91 98110 23456`;
        } else if (type === 'reminder_2h') {
          messageBody = `⏰ *Session Alert: Starting in 2 Hours*
Dear ${targetName},
*${childName}*'s 45-minute therapy session with *${therapistName}* is starting soon at *${timeSlot}*.
📍 Location: 2nd Floor, Navalur, Chennai (Near OMR Toll Plaza).
Please bring a water bottle. If delayed, message or call us at +91 98110 23456.`;
        } else if (type === 'booking_alert') {
          messageBody = `✅ *Session Confirmed — Nurturing Minds*
Dear ${targetName},
Appointment confirmed for *${childName}* with *${therapistName}* at *${timeSlot}*.
📍 Location: 2nd Floor, Navalur, Chennai.
We look forward to supporting ${childName}! 🌸`;
        } else {
          // Default: reminder_24h
          messageBody = `🌟 *Nurturing Minds Therapy Center*
Dear ${targetName},
Friendly reminder that *${childName}*'s session with *${therapistName}* is scheduled for tomorrow at *${timeSlot}* (45 mins strictly).
📍 Location: 2nd Floor, Navalur, Chennai.
Please arrive 5 minutes early.
Dr. Sweety Bhatnagar & Team
📞 Helpline: +91 98110 23456`;
        }
      }

      // Dispatch to provider or simulator
      let messageId = `msg-${Date.now()}`;
      let deliveryStatus: 'sent' | 'failed' = 'sent';
      let deliveryError: string | null = null;
      let usedProvider = 'simulator';

      if (twilioConfigured) {
        try {
          const from =
            channel === 'whatsapp'
              ? process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
              : process.env.TWILIO_PHONE_NUMBER || '+14155238886';
          const to = channel === 'whatsapp' ? `whatsapp:${formatted}` : formatted;

          const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
          const authHeader = 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

          const form = new URLSearchParams();
          form.append('To', to);
          form.append('From', from);
          form.append('Body', messageBody);

          const twilioRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: form.toString(),
          });

          if (twilioRes.ok) {
            const data = (await twilioRes.json()) as any;
            messageId = data.sid || messageId;
            usedProvider = 'twilio';
          } else {
            const err = (await twilioRes.json()) as any;
            deliveryStatus = 'failed';
            deliveryError = err.message || `Twilio error status ${twilioRes.status}`;
          }
        } catch (err: any) {
          deliveryStatus = 'failed';
          deliveryError = err.message || 'Twilio network error';
        }
      } else if (webhookConfigured) {
        try {
          const whRes = await fetch(webhookUrl!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: formatted,
              message: messageBody,
              channel,
              childName,
              recipientName: targetName,
            }),
          });
          if (whRes.ok) {
            usedProvider = 'webhook';
          } else {
            deliveryStatus = 'failed';
            deliveryError = `Webhook status ${whRes.status}`;
          }
        } catch (err: any) {
          deliveryStatus = 'failed';
          deliveryError = err.message || 'Webhook error';
        }
      }

      // Record to Firestore messageLogs
      const logRecord = {
        id: `msg-${sessionId || 'direct'}-${type}-${Date.now()}`,
        sessionId: sessionId || 'adhoc',
        recipientPhone: formatted,
        recipientName: targetName,
        childName,
        therapistName,
        channel,
        messageType: type,
        sentAt: new Date().toISOString(),
        status: deliveryStatus,
        error: deliveryError,
        body: messageBody,
        provider: usedProvider,
        retryCount: 0,
      };

      await setDoc(doc(db, 'messageLogs', logRecord.id), logRecord, { merge: true });

      return res.status(200).json({
        success: deliveryStatus === 'sent',
        log: logRecord,
        provider: usedProvider,
        twilioConfigured,
        webhookConfigured,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in WhatsApp/SMS webhook:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
