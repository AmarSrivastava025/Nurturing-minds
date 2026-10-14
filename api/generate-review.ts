import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are helping a parent who visited a child therapy clinic write a Google review.
Rewrite the parent's words into a clear, simple, natural review of 2 to 4 sentences.
Use only what the parent wrote. Do not add facts, results, names, treatments, diagnoses or claims that the parent did not write.
Keep the star rating honest: if the parent is unhappy, the review must sound calm and factual, never angry or accusatory.
Remove any child's name, medical condition, diagnosis, medication or school name.
Never promise outcomes, cures or guarantees. Never mention prices.
Write in simple English, the way a parent types on a phone.
Return only the review text. No quotation marks, no headings, no commentary.`;

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = (requestLog.get(ip) || []).filter((t) => t > windowStart);
  if (recent.length >= RATE_LIMIT_MAX) {
    requestLog.set(ip, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

function logStatus(status: number): void {
  console.log(`${new Date().toISOString()} ${status}`);
}

function stripQuotes(value: string): string {
  return value
    .trim()
    .replace(/^["'\u2018\u2019\u201C\u201D]+/, '')
    .replace(/["'\u2018\u2019\u201C\u201D]+$/, '')
    .trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    logStatus(405);
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket?.remoteAddress || 'unknown')
      .split(',')[0]
      .trim() || 'unknown';

  if (isRateLimited(ip)) {
    logStatus(429);
    return res.status(429).json({ error: 'rate_limited' });
  }

  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  }
  body = body || {};

  const rating = body.rating;
  const text = typeof body.text === 'string' ? body.text : '';
  const trimmedText = text.trim();

  const ratingValid = Number.isInteger(rating) && rating >= 1 && rating <= 5;
  const textValid = trimmedText.length >= 20 && trimmedText.length <= 500;

  if (!ratingValid || !textValid) {
    logStatus(400);
    return res.status(400).json({ error: 'invalid_request' });
  }

  const apiKey = process.env.REVIEW_AI_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) {
    logStatus(502);
    return res.status(502).json({ error: 'generation_failed' });
  }

  try {
    const userMessage = `Star rating: ${rating} out of 5\nParent's words: ${trimmedText}`;

    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.7 },
      }),
    });

    if (!geminiRes.ok) {
      logStatus(502);
      return res.status(502).json({ error: 'generation_failed' });
    }

    const data: any = await geminiRes.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const review = typeof raw === 'string' ? stripQuotes(raw) : '';

    if (!review) {
      logStatus(502);
      return res.status(502).json({ error: 'generation_failed' });
    }

    const placeUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
    logStatus(200);
    return res.status(200).json({ review, placeUrl });
  } catch {
    logStatus(502);
    return res.status(502).json({ error: 'generation_failed' });
  }
}
