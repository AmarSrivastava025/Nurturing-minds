export const BRAND_PRIMARY = '#6D0281';
export const BRAND_PRIMARY_DARK = '#570167';
export const BRAND_ACCENT = '#E8590C';
export const BRAND_BG = '#FAF7FB';

export const CLINIC_NAME = 'Nurturing Minds Therapy Center';
export const CLINIC_TAGLINE = 'Pediatric Occupational Therapy Practice';
export const CLINIC_PHONE = '+91 97893 05029';
export const CLINIC_EMAIL = 'connect@drsweetybhatnagar.com';
export const CLINIC_LOCATION = 'Club Opal, Olympia Opaline, Club House, OMR Road, Navalur, Chennai - 600130';
export const DEFAULT_APP_URL = 'https://clinic.drsweetybhatnagar.com';
export const CLINIC_LOGO_URL = `${DEFAULT_APP_URL}/logo.svg`;

export const GOOGLE_FEEDBACK_FORM_URL = '';

export interface EmailBranding {
  appUrl?: string;
  logoUrl?: string;
}

export function isUsableUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return !/placeholder|example\.com|xxxx/i.test(trimmed);
}

export function formatAppointmentDate(dateInput: string | Date | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}

interface ShellParams {
  preheader: string;
  heading: string;
  intro: string;
  body: string;
  branding?: EmailBranding;
}

function renderShell({ preheader, heading, intro, body, branding }: ShellParams): string {
  const appUrl = branding?.appUrl || DEFAULT_APP_URL;
  const logoUrl = branding?.logoUrl || `${appUrl}/logo.svg`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${heading}</title>
</head>
<body style="margin:0;padding:24px;background-color:${BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#2d3748;">
  <div style="display:none;font-size:1px;color:${BRAND_BG};max-height:0;overflow:hidden;">${preheader}</div>
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #ece3f0;box-shadow:0 6px 18px -8px rgba(109,2,129,0.25);">

    <div style="background:linear-gradient(135deg,${BRAND_PRIMARY} 0%,${BRAND_PRIMARY_DARK} 100%);padding:26px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:52px;vertical-align:middle;">
            <img src="${logoUrl}" width="44" height="44" alt="${CLINIC_NAME}" style="display:block;width:44px;height:44px;border-radius:50%;background:#ffffff;padding:4px;">
          </td>
          <td style="padding-left:14px;vertical-align:middle;">
            <div style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:-0.3px;">${CLINIC_NAME}</div>
            <div style="color:#f3d9fa;font-size:13px;margin-top:2px;">${CLINIC_TAGLINE}</div>
          </td>
        </tr>
      </table>
    </div>

    <div style="height:4px;background:${BRAND_ACCENT};"></div>

    <div style="padding:30px 28px;">
      <h1 style="margin:0 0 14px 0;color:#1a202c;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${heading}</h1>
      <p style="margin:0;font-size:15px;color:#4a5568;">${intro}</p>
      ${body}
    </div>

    <div style="background:#faf7fb;border-top:1px solid #ece3f0;padding:22px 28px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:${BRAND_PRIMARY};">${CLINIC_NAME}</p>
      <p style="margin:6px 0 0 0;font-size:12px;color:#718096;">${CLINIC_LOCATION}</p>
      <p style="margin:4px 0 0 0;font-size:12px;color:#718096;">
        Phone: <a href="tel:${CLINIC_PHONE.replace(/\s/g, '')}" style="color:${BRAND_PRIMARY};text-decoration:none;">${CLINIC_PHONE}</a>
        &nbsp;&bull;&nbsp;
        Email: <a href="mailto:${CLINIC_EMAIL}" style="color:${BRAND_PRIMARY};text-decoration:none;">${CLINIC_EMAIL}</a>
      </p>
      <p style="margin:12px 0 0 0;font-size:11px;color:#a0aec0;">
        You are receiving this email because your child is enrolled at ${CLINIC_NAME}.
      </p>
    </div>

  </div>
</body>
</html>`.trim();
}

function detailRow(label: string, value: string, isLast = false): string {
  const border = isLast ? '' : 'border-bottom:1px solid #f0e6f4;';
  return `<tr>
    <td style="padding:9px 0;${border}color:#718096;font-size:14px;width:110px;vertical-align:top;">${label}</td>
    <td style="padding:9px 0;${border}color:#1a202c;font-size:14px;font-weight:600;">${value}</td>
  </tr>`;
}

function detailCard(title: string, rows: string): string {
  return `<div style="background:#fbf5fd;border:1px solid #f0e6f4;border-left:4px solid ${BRAND_PRIMARY};border-radius:0 10px 10px 0;padding:18px 20px;margin:22px 0;">
    <div style="color:${BRAND_PRIMARY};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">${title}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${rows}</table>
  </div>`;
}

function bulletList(title: string, items: string[]): string {
  const lis = items
    .map((item) => `<li style="margin-bottom:6px;">${item}</li>`)
    .join('');
  return `<div style="background:#ffffff;border:1px solid #ece3f0;border-radius:10px;padding:18px 20px;margin:22px 0;">
    <div style="color:#1a202c;font-size:14px;font-weight:700;margin-bottom:8px;">${title}</div>
    <ul style="margin:0;padding-left:20px;color:#4a5568;font-size:14px;">${lis}</ul>
  </div>`;
}

export function generateBookingConfirmationHtml(params: {
  parentName: string;
  childName: string;
  scheduledAt: string;
  timeSlot: string;
  therapistName: string;
  durationMinutes?: number;
  branding?: EmailBranding;
}): { subject: string; html: string } {
  const subject = 'Your appointment with Dr Sweety is confirmed';
  const rows = [
    detailRow('Date', formatAppointmentDate(params.scheduledAt)),
    detailRow('Time', params.timeSlot || '45-Minute Therapy Slot'),
    detailRow('Therapist', params.therapistName),
    detailRow('Duration', `${params.durationMinutes || 45} minutes`),
    detailRow('Location', CLINIC_LOCATION, true),
  ].join('');

  const html = renderShell({
    preheader: `Appointment confirmed for ${params.childName}.`,
    heading: 'Your appointment is confirmed',
    intro: `Hi <strong>${params.parentName}</strong>, great news — the appointment for <strong>${params.childName}</strong> has been confirmed.`,
    body: `${detailCard('Session Details', rows)}
${bulletList('What to bring', [
      "Your child's medical reports and previous assessment cards (if any)",
      'A notebook for observations and clinical notes (optional)',
      'Comfortable clothing that allows free movement during therapy',
    ])}
<p style="margin:22px 0 0 0;font-size:14px;color:#4a5568;">Questions? Simply reply to this email or call us at <strong style="color:${BRAND_PRIMARY};">${CLINIC_PHONE}</strong>.</p>
<p style="margin:22px 0 0 0;font-size:14px;color:#4a5568;">Warm regards,<br><strong style="color:${BRAND_PRIMARY};">Nurturing Minds Team</strong></p>`,
    branding: params.branding,
  });

  return { subject, html };
}

export function generateReminderEmailHtml(params: {
  parentName: string;
  childName: string;
  scheduledAt: string;
  timeSlot: string;
  therapistName: string;
  branding?: EmailBranding;
}): { subject: string; html: string } {
  const subject = 'Reminder: your appointment is in 2 days';
  const rows = [
    detailRow('Date', formatAppointmentDate(params.scheduledAt)),
    detailRow('Time', params.timeSlot || '45-Minute Therapy Slot'),
    detailRow('Therapist', params.therapistName, true),
  ].join('');

  const html = renderShell({
    preheader: `${params.childName}'s appointment is in 2 days.`,
    heading: 'Your appointment is in 2 days',
    intro: `Hi <strong>${params.parentName}</strong>, a friendly reminder that <strong>${params.childName}</strong> has a therapy session coming up in two days.`,
    body: `${detailCard('Upcoming Session', rows)}
${bulletList('Pre-session tips', [
      'Ensure your child is well rested before the appointment',
      'Avoid heavy meals 30 minutes before the session',
      'Plan to arrive 10 minutes early so your child can settle in',
    ])}
<p style="margin:22px 0 0 0;font-size:14px;color:#4a5568;">Need to reschedule? Call us at <strong style="color:${BRAND_PRIMARY};">${CLINIC_PHONE}</strong> at the earliest so we can offer the slot to another family.</p>
<p style="margin:22px 0 0 0;font-size:14px;color:#4a5568;">See you soon,<br><strong style="color:${BRAND_PRIMARY};">Nurturing Minds Team</strong></p>`,
    branding: params.branding,
  });

  return { subject, html };
}

export function generateFeedbackEmailHtml(params: {
  parentName: string;
  childName: string;
  appUrl?: string;
  googleFormUrl?: string;
  branding?: EmailBranding;
}): { subject: string; html: string } {
  const subject = "How was your session? We'd love your feedback";
  const formUrl = params.googleFormUrl || GOOGLE_FEEDBACK_FORM_URL;
  const appUrl = params.appUrl || params.branding?.appUrl || DEFAULT_APP_URL;

  const feedbackBlock = isUsableUrl(formUrl)
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${formUrl}" target="_blank" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:8px;font-weight:600;font-size:15px;">Share session feedback &rarr;</a>
      </div>`
    : `<div style="background:#fbf5fd;border:1px solid #f0e6f4;border-radius:10px;padding:18px 20px;margin:22px 0;">
        <p style="margin:0;font-size:14px;color:#4a5568;">Please reply to this email and tell us how the session went for <strong>${params.childName}</strong> — your feedback helps us serve your family better.</p>
      </div>`;

  const html = renderShell({
    preheader: `Thank you for attending ${params.childName}'s session.`,
    heading: 'We value your feedback',
    intro: `Hi <strong>${params.parentName}</strong>, thank you for attending a session with us. We hope <strong>${params.childName}</strong> had a wonderful and supportive experience.`,
    body: `${feedbackBlock}
${
      isUsableUrl(appUrl)
        ? `<p style="margin:0;font-size:14px;color:#4a5568;">Ready to book the next session? Visit <a href="${appUrl}" target="_blank" style="color:${BRAND_PRIMARY};font-weight:600;text-decoration:underline;">your family portal</a>.</p>`
        : ''
    }
<p style="margin:22px 0 0 0;font-size:14px;color:#4a5568;">Best regards,<br><strong style="color:${BRAND_PRIMARY};">Nurturing Minds Team</strong></p>`,
    branding: params.branding,
  });

  return { subject, html };
}
