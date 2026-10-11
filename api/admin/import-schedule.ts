import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, writeBatch } from 'firebase/firestore';

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

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function slotLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const end = h * 60 + m + 45;
  const fmt = (mins: number) => {
    let hh = Math.floor(mins / 60) % 24;
    const mm = mins % 60;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return `${hh < 10 ? `0${hh}` : hh}:${mm < 10 ? `0${mm}` : mm} ${ampm}`;
  };
  return `${fmt(h * 60 + m)} - ${fmt(end)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const entries: Array<{ date: string; time: string; child: string }> = body.entries || [];

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries[] is required' });
    }

    const db = getDbInstance();
    const patientsSnap = await getDocs(collection(db, 'patients'));
    const byName = new Map<string, { id: string; childName: string }>();
    const all: Array<{ key: string; id: string; childName: string }> = [];
    patientsSnap.docs.forEach((d) => {
      const data: any = d.data();
      const key = normalise(String(data.childName || ''));
      const entry = { key, id: d.id, childName: data.childName };
      byName.set(key, entry);
      all.push(entry);
    });

    const resolvePatient = (child: string) => {
      const key = normalise(child);
      const exact = byName.get(key);
      if (exact) return exact;
      const partial = all.filter((p) => p.key.startsWith(key) || key.startsWith(p.key));
      return partial.length === 1 ? partial[0] : null;
    };

    const unmatched = new Set<string>();
    const created: string[] = [];
    const batch = writeBatch(db);

    entries.forEach((entry, index) => {
      const match = resolvePatient(entry.child);
      if (!match) {
        unmatched.add(entry.child);
        return;
      }
      const scheduledAt = new Date(`${entry.date}T${entry.time}:00+05:30`).toISOString();
      const id = `ses-${entry.date}-${entry.time.replace(':', '')}-${match.id}-${index}`;
      batch.set(
        doc(db, 'sessions', id),
        {
          id,
          patientId: match.id,
          scheduledAt,
          status: 'scheduled',
          timeSlot: slotLabel(entry.time),
          durationMinutes: 45,
          notifyParent: false,
        },
        { merge: true }
      );
      created.push(`${entry.date} ${entry.time} ${match.childName}`);
    });

    await batch.commit();

    return res.status(200).json({
      submitted: entries.length,
      created: created.length,
      unmatchedChildren: Array.from(unmatched).sort(),
      patientsKnown: byName.size,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
