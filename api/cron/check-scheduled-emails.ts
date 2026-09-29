import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_APP_URL = 'https://clinic.drsweetybhatnagar.com';

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

  const appUrl = (process.env.APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '');

  try {
    const response = await fetch(`${appUrl}/api/webhook/email-confirmation-sequence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'process_scheduled' }),
    });

    const data: any = await response.json().catch(() => null);

    if (!response.ok || !data) {
      console.error('[EMAIL ERROR] Scheduled run failed:', response.status, data?.error);
      return res.status(502).json({
        success: false,
        error: 'Scheduled email run failed.',
        detail: data?.error || `Automation endpoint returned ${response.status}`,
      });
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...data,
    });
  } catch (error: any) {
    console.error('[EMAIL ERROR] Scheduled run could not reach the automation endpoint:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Scheduled email run failed.' });
  }
}
