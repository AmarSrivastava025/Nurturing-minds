import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { DEFAULT_FROM_EMAIL, getResendClient } from '../../src/services/automation/email-sender';
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

function isAuthorized(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.authorization || '';
  return header === `Bearer ${secret}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const resend = getResendClient();
  if (!resend) {
    console.error('[EMAIL ERROR] RESEND_API_KEY is not configured on the server.');
    return res.status(503).json({
      success: false,
      error: 'Email sending is not configured. Set RESEND_API_KEY in the server environment.',
    });
  }

  try {
    const db = getDbInstance();
    const result = await processScheduledEmails({
      db,
      resend,
      fromEmail: DEFAULT_FROM_EMAIL,
      appUrl: process.env.APP_URL || '',
      feedbackFormUrl: process.env.RESEND_FEEDBACK_FORM_URL || '',
    });

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error('[EMAIL ERROR] Scheduled email run failed:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Scheduled email run failed.' });
  }
}
