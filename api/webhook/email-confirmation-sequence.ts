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
  // Allow CORS
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
    const resendApiKey = process.env.RESEND_API_KEY;
    const resend = resendApiKey && !resendApiKey.startsWith('re_xxxx') ? new Resend(resendApiKey) : null;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Nurturing Minds <connect@drsweetybhatnagar.com>';

    if (req.method === 'GET') {
      return res.status(200).json({
        status: 'online',
        service: 'Nurturing Minds Email Confirmation Sequence',
        resendConfigured: !!resend,
      });
    }

    const db = getDbInstance();

    if (req.method === 'POST') {
      const { sessionId, action } = req.body || {};

      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required in request body' });
      }

      // Fetch session
      const sessionSnap = await getDoc(doc(db, 'sessions', sessionId));
      if (!sessionSnap.exists()) {
        return res.status(404).json({ error: `Session ${sessionId} not found` });
      }
      const session = sessionSnap.data() as any;

      // Fetch patient
      const patientSnap = await getDoc(doc(db, 'patients', session.patientId));
      if (!patientSnap.exists()) {
        console.error(`[EMAIL ERROR] session ${sessionId}: Failed to fetch patient ${session.patientId}`);
        return res.status(404).json({ error: 'Patient document not found' });
      }
      const patient = patientSnap.data() as any;
      const parentEmail = patient.parentEmail;
      const parentName = patient.motherName || patient.fatherName || 'Parent';
      const childName = patient.childName || 'Child';

      // Check missing parentEmail
      if (!parentEmail || !parentEmail.includes('@')) {
        const errorMsg = `[EMAIL ERROR] session ${sessionId}: Failed to fetch parent email (parentEmail is null)`;
        console.error(errorMsg);

        const logId = `email-${Date.now()}`;
        await setDoc(doc(db, 'emailLogs', logId), {
          id: logId,
          sessionId,
          recipientEmail: parentEmail || 'unknown',
          emailType: 'booking_confirmation',
          sentAt: new Date().toISOString(),
          status: 'failed',
          error: errorMsg,
        });

        return res.status(200).json({ success: false, error: errorMsg, logId });
      }

      // Fetch therapist
      let therapistName = 'Dr Sweety Bhatnagar';
      if (session.therapistId) {
        const therapistSnap = await getDoc(doc(db, 'therapists', session.therapistId));
        if (therapistSnap.exists()) {
          therapistName = therapistSnap.data()?.name || therapistName;
        }
      }

      const formattedDate = new Date(session.scheduledAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeSlot = session.timeSlot || '45-Minute Therapy Slot';

      const emailHtml = `
<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #0d9488; margin: 0;">Nurturing Minds Therapy Center</h2>
    <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Pediatric Clinical Care</p>
  </div>
  <p>Hi ${parentName},</p>
  <p>Great news! Your appointment for <strong>${childName}</strong> is confirmed.</p>
  <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
    <h3 style="margin-top: 0; color: #0f766e;">Session Details:</h3>
    <p style="margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
    <p style="margin: 4px 0;"><strong>Time:</strong> ${timeSlot}</p>
    <p style="margin: 4px 0;"><strong>Therapist:</strong> ${therapistName}</p>
    <p style="margin: 4px 0;"><strong>Duration:</strong> 45 minutes</p>
    <p style="margin: 4px 0;"><strong>Location:</strong> Nurturing Minds Therapy Center, 2nd Floor, Navalur, Chennai</p>
  </div>
  <div style="margin: 20px 0;">
    <h4 style="color: #334155; margin-bottom: 8px;">What to Bring:</h4>
    <ul>
      <li>Your child's medical reports (if any)</li>
      <li>A notebook for notes (optional)</li>
      <li>Comfortable clothes for your child</li>
    </ul>
  </div>
  <p>Questions? Reply to this email or call +91 98110 23456</p>
  <p style="margin-top: 24px;">Best regards,<br><strong>Nurturing Minds Team</strong></p>
</div>`;

      // Send via Resend if configured
      let sendResult: any = null;
      let emailStatus = 'sent';
      let errorDetail = null;

      if (resend) {
        try {
          sendResult = await resend.emails.send({
            from: fromEmail,
            to: parentEmail,
            subject: 'Your appointment with Dr Sweety is confirmed',
            html: emailHtml,
          });
          console.log(`[EMAIL SENT] Booking confirmation to ${parentEmail} for session ${sessionId} (${new Date().toLocaleString()})`);
        } catch (sendErr: any) {
          console.error(`[EMAIL ERROR] session ${sessionId}: ${sendErr.message}`);
          emailStatus = 'failed';
          errorDetail = sendErr.message;
        }
      } else {
        console.warn(`[SIMULATED EMAIL SENT] to ${parentEmail} for session ${sessionId} (No Resend API Key configured)`);
      }

      // Log to emailLogs
      const logId = `email-${Date.now()}`;
      await setDoc(doc(db, 'emailLogs', logId), {
        id: logId,
        sessionId,
        recipientEmail: parentEmail,
        recipientName: parentName,
        childName,
        therapistName,
        emailType: 'booking_confirmation',
        sentAt: new Date().toISOString(),
        status: emailStatus,
        error: errorDetail,
      });

      return res.status(200).json({
        success: emailStatus === 'sent',
        logId,
        sessionId,
        recipientEmail: parentEmail,
        status: emailStatus,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Unhandled webhook error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
