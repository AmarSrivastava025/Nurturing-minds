import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CLINIC_LOCATION } from '../src/services/automation/email-templates';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ ok: true, srcImport: true, CLINIC_LOCATION });
}
