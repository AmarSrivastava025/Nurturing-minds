import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = getDbInstance();
    const out: any = {};

    for (const name of ['patients', 'therapists', 'invites', 'sessions', 'emailLogs']) {
      const snap = await getDocs(collection(db, name));
      const entry: any = { count: snap.size };
      if (name === 'patients') {
        entry.names = snap.docs.map((d) => d.data().childName).sort();
      }
      if (name === 'therapists') {
        entry.names = snap.docs.map((d) => d.data().name).sort();
      }
      out[name] = entry;
    }

    return res.status(200).json(out);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
