import { Resend } from 'resend';

export const DEFAULT_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'Nurturing Minds <connect@drsweetybhatnagar.com>';

export function getResendClient(): Resend | null {
  const rawKey = process.env.RESEND_API_KEY;
  if (!rawKey) return null;
  const apiKey = rawKey.trim();
  if (!apiKey || apiKey.startsWith('re_xxxx') || apiKey.length < 10) return null;
  return new Resend(apiKey);
}

export interface EmailSendResult {
  ok: boolean;
  attempts: number;
  messageId?: string;
  error?: string;
}

export interface OutboundEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export async function sendEmailWithRetry(
  client: Resend,
  message: OutboundEmail,
  maxAttempts = 3
): Promise<EmailSendResult> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response: any = await client.emails.send({
        from: message.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
      });

      if (response?.error) {
        throw new Error(response.error.message || 'Resend rejected the message');
      }

      return { ok: true, attempts: attempt, messageId: response?.data?.id };
    } catch (err: any) {
      lastError = err?.message || String(err);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return { ok: false, attempts: maxAttempts, error: lastError || 'Unknown Resend error' };
}
