import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.RESEND_API_KEY;
  let constructed = false;
  let error: string | null = null;

  try {
    if (apiKey) {
      const client = new Resend(apiKey);
      constructed = Boolean(client);
    }
  } catch (err: any) {
    error = err?.message || String(err);
  }

  return res.status(200).json({
    ok: true,
    resendImport: true,
    keyPresent: Boolean(apiKey),
    keyPrefix: apiKey ? apiKey.slice(0, 3) : null,
    constructed,
    error,
  });
}
