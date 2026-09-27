import { jsPDF } from 'jspdf';
import { Invoice, Patient, Therapist } from '../types';

let cachedLogoDataUrl: string | null = null;

/**
 * Pre-renders the official Nurturing Minds vector logo from /logo.svg onto an
 * offscreen canvas to obtain a high-resolution PNG data URL for jsPDF.
 */
async function getLogoImage(): Promise<string | null> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 400, 400);
          const data = canvas.toDataURL('image/png');
          cachedLogoDataUrl = data;
          resolve(data);
          return;
        }
      } catch (e) {
        console.warn('Could not rasterize logo for PDF:', e);
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = '/logo.svg';

    // Safety timeout to avoid hanging PDF generation
    setTimeout(() => resolve(cachedLogoDataUrl), 500);
  });
}

// Preload logo on module initialization
if (typeof window !== 'undefined') {
  getLogoImage().catch(() => {});
}

/**
 * Generates an authentic medical signature for Dr. Sweety Bhatnagar
 * in clinical fountain-pen navy blue with realistic cursive flourishes.
 */
function generateDrSweetySignature(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, 600, 180);
  ctx.strokeStyle = '#183B7A'; // Classic royal medical fountain-pen blue
  ctx.fillStyle = '#183B7A';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Dr. prefix with physician loop
  ctx.beginPath();
  ctx.moveTo(40, 110);
  ctx.bezierCurveTo(35, 65, 75, 45, 95, 52);
  ctx.bezierCurveTo(115, 60, 112, 100, 78, 128);
  ctx.bezierCurveTo(68, 138, 92, 132, 112, 118);
  ctx.stroke();

  // Dot after Dr
  ctx.beginPath();
  ctx.arc(120, 122, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // "Sweety" - elegant cursive
  ctx.beginPath();
  // Capital S
  ctx.moveTo(138, 118);
  ctx.bezierCurveTo(148, 75, 178, 38, 192, 44);
  ctx.bezierCurveTo(208, 50, 198, 85, 162, 102);
  ctx.bezierCurveTo(142, 112, 155, 132, 188, 125);
  // w
  ctx.bezierCurveTo(198, 122, 206, 100, 216, 120);
  ctx.bezierCurveTo(222, 130, 230, 100, 240, 120);
  // ee
  ctx.bezierCurveTo(246, 112, 252, 98, 258, 108);
  ctx.bezierCurveTo(262, 118, 252, 124, 266, 120);
  ctx.bezierCurveTo(272, 112, 278, 98, 284, 108);
  ctx.bezierCurveTo(288, 118, 278, 124, 292, 118);
  // t stem
  ctx.bezierCurveTo(296, 112, 303, 62, 306, 64);
  ctx.bezierCurveTo(308, 78, 306, 116, 318, 116);
  // y with deep elegant loop
  ctx.bezierCurveTo(326, 116, 332, 102, 338, 118);
  ctx.bezierCurveTo(342, 128, 346, 158, 336, 170);
  ctx.bezierCurveTo(325, 182, 312, 174, 326, 152);
  ctx.bezierCurveTo(340, 130, 356, 114, 372, 112);
  ctx.stroke();

  // t crossbar
  ctx.beginPath();
  ctx.moveTo(294, 82);
  ctx.quadraticCurveTo(310, 80, 324, 84);
  ctx.stroke();

  // "Bhatnagar"
  ctx.beginPath();
  // Capital B stem
  ctx.moveTo(376, 56);
  ctx.lineTo(376, 124);
  // Double upper/lower loops
  ctx.moveTo(374, 60);
  ctx.bezierCurveTo(398, 50, 416, 76, 396, 90);
  ctx.bezierCurveTo(422, 94, 412, 124, 376, 124);
  // h ascender
  ctx.bezierCurveTo(392, 122, 402, 66, 406, 70);
  ctx.bezierCurveTo(410, 82, 406, 122, 422, 118);
  // atnagar fluid waves
  ctx.bezierCurveTo(432, 114, 436, 102, 444, 118);
  ctx.bezierCurveTo(450, 106, 454, 86, 458, 116);
  ctx.bezierCurveTo(464, 112, 470, 102, 476, 118);
  ctx.bezierCurveTo(482, 120, 488, 106, 492, 118);
  // g descender loop
  ctx.bezierCurveTo(496, 126, 500, 154, 490, 162);
  ctx.bezierCurveTo(480, 170, 474, 156, 486, 142);
  // ar
  ctx.bezierCurveTo(498, 126, 508, 114, 520, 112);
  ctx.stroke();

  // Confident underscore flourish
  ctx.beginPath();
  ctx.moveTo(150, 142);
  ctx.bezierCurveTo(240, 152, 420, 146, 530, 132);
  ctx.stroke();

  // Subtle twin dots
  ctx.beginPath();
  ctx.arc(542, 135, 2.5, 0, Math.PI * 2);
  ctx.arc(550, 137, 2.5, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}

/**
 * Generates an official branded PDF receipt / invoice for Dr. Sweety Bhatnagar's practice.
 * Built with client-side jsPDF using exact brand palette (#6D0281 and #E8590C).
 */
export async function generateInvoicePDF(
  invoice: Invoice,
  patient: Patient,
  therapist?: Therapist
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [109, 2, 129]; // #6D0281 Plum
  const secondaryColor = [232, 89, 12]; // #E8590C Warm Orange
  const darkSlate = [30, 41, 59];
  const mutedText = [100, 116, 139];
  const lightBg = [250, 247, 251];

  // Top Plum Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 42, 'F');

  // Orange Accent Line below banner
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(0, 42, 210, 2, 'F');

  // Circular Medallion Background for Logo
  doc.setFillColor(255, 255, 255);
  doc.circle(22, 21, 14, 'F');
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setLineWidth(0.8);
  doc.circle(22, 21, 13.5, 'D');

  // Embed official Nurturing Minds clinical logo
  const logoDataUrl = await getLogoImage();
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 9, 8, 26, 26);
  } else {
    // Vector fallback badge if image hasn't loaded
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.circle(22, 21, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('NM', 22, 24, { align: 'center' });
  }

  // Banner Titles
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('NURTURING MINDS THERAPY CENTER', 42, 18);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Pediatric Occupational Therapy Practice • Sensory Integration • Soundsory', 42, 25);
  doc.text('Dr. Sweety Bhatnagar (BOT, MOT Pediatrics) • Clinical Director', 42, 31);

  // Document Heading & Receipt Meta
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL THERAPY RECEIPT', 14, 55);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Replaces physical paper receipt register', 14, 60);

  // Receipt Box (Right Side)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(125, 48, 71, 24, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(125, 48, 71, 24, 2, 2, 'D');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(`RECEIPT NO:`, 128, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.invoiceNumber}`, 155, 54);

  doc.setFont('helvetica', 'bold');
  doc.text(`DATE ISSUED:`, 128, 60);
  doc.setFont('helvetica', 'normal');
  const formattedDate = new Date(invoice.issuedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  doc.text(formattedDate, 155, 60);

  doc.setFont('helvetica', 'bold');
  doc.text(`PAYMENT MODE:`, 128, 66);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.paymentMode || 'UPI / Bank Transfer'}`, 155, 66);

  // Patient Particulars Card (Height adjusted to 44mm to fit all details comfortably)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, 76, 182, 44, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 76, 182, 44, 2, 2, 'D');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PATIENT & GUARDIAN PARTICULARS', 18, 83);

  // Left column: Child details
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Child Name:', 18, 90);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patient.childName} (${patient.age} yrs, ${patient.bloodGroup})`, 42, 90);

  doc.setFont('helvetica', 'bold');
  doc.text('Clinical Focus:', 18, 96);
  doc.setFont('helvetica', 'normal');
  const symptomTruncated = patient.symptom.length > 35 ? patient.symptom.slice(0, 35) + '...' : patient.symptom;
  doc.text(`${symptomTruncated}`, 42, 96);

  doc.setFont('helvetica', 'bold');
  doc.text('Assigned Therapist:', 18, 102);
  doc.setFont('helvetica', 'normal');
  doc.text(`${therapist?.name || 'Dr. Sweety Bhatnagar'}`, 50, 102);

  doc.setFont('helvetica', 'bold');
  doc.text('Registration ID:', 18, 108);
  doc.setFont('helvetica', 'normal');
  doc.text(`NM-${patient.id.replace('pat-', 'P')}`, 46, 108);

  // Right column: Guardian & Schedule (Cleanly spaced and bounded)
  doc.setFont('helvetica', 'bold');
  doc.text('Parents:', 108, 90);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patient.motherName} / ${patient.fatherName}`, 124, 90);

  doc.setFont('helvetica', 'bold');
  doc.text('Primary Contact:', 108, 96);
  doc.setFont('helvetica', 'normal');
  const primaryPhone = patient.primaryContact === 'mother' ? patient.motherContact : patient.fatherContact;
  doc.text(`${primaryPhone} (${patient.primaryContact})`, 136, 96);

  doc.setFont('helvetica', 'bold');
  doc.text('Session Plan:', 108, 102);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patient.sessionsPerWeek} sessions/wk (${patient.sessionsPerWeek * 4} slots/mo)`, 132, 102);

  doc.setFont('helvetica', 'bold');
  doc.text('Slot Timing:', 108, 108);
  doc.setFont('helvetica', 'normal');
  // Constrain timing text to max 60mm so it never overflows the card (ends at 196mm)
  const timingLines = doc.splitTextToSize(patient.sessionTiming, 60);
  doc.text(timingLines[0] || patient.sessionTiming, 130, 108);

  // Service Breakdown Table Header
  const tableY = 126;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(14, tableY, 182, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('SR.', 18, tableY + 5.5);
  doc.text('SERVICE / THERAPY PROGRAM PARTICULARS', 30, tableY + 5.5);
  doc.text('SESSIONS', 146, tableY + 5.5, { align: 'center' });
  doc.text('AMOUNT (INR)', 188, tableY + 5.5, { align: 'right' });

  // Table Row 1 - Dynamically measured to eliminate text collision
  const row1Y = tableY + 8;
  const descLines: string[] = doc.splitTextToSize(invoice.description, 100);
  const rowHeight = Math.max(18, 11 + descLines.length * 4.5);

  doc.setFillColor(255, 255, 255);
  doc.rect(14, row1Y, 182, rowHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(14, row1Y, 182, rowHeight, 'D');

  // SR Number
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('1', 20, row1Y + 7);

  // Description Lines (bounded strictly to 100mm width, leaving SESSIONS column untouched)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  let curDescY = row1Y + 6.5;
  for (const line of descLines) {
    doc.text(line, 30, curDescY);
    curDescY += 4.5;
  }

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('In-center supervised sessions with parent live observation & co-regulation', 30, curDescY + 1);

  // Sessions Column (Centered at X = 146)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(`${patient.sessionsPerWeek * 4} slots`, 146, row1Y + 8, { align: 'center' });

  // Amount Column (Right-aligned at X = 188, cleanly using standard INR currency formatting)
  doc.setFont('helvetica', 'bold');
  doc.text(`INR ${invoice.amount.toLocaleString('en-IN')}`, 188, row1Y + 8, { align: 'right' });

  // Total Summary Section
  const totalY = row1Y + rowHeight + 4;

  // "PAID IN FULL" Official Seal Badge (56mm width, soft green background, 100% contained)
  const badgeX = 14;
  const badgeWidth = 56;
  const badgeHeight = 14;

  // Soft emerald background fill + green border
  doc.setFillColor(240, 253, 244); // #F0FDF4 emerald-50
  doc.roundedRect(badgeX, totalY, badgeWidth, badgeHeight, 2, 2, 'F');
  doc.setDrawColor(22, 163, 74); // emerald-600
  doc.setLineWidth(0.8);
  doc.roundedRect(badgeX, totalY, badgeWidth, badgeHeight, 2, 2, 'D');

  // Vector checkmark inside badge
  const checkX = badgeX + 6;
  const checkY = totalY + 7;
  doc.setDrawColor(22, 163, 74);
  doc.setLineWidth(1.1);
  doc.line(checkX, checkY, checkX + 2, checkY + 2.5);
  doc.line(checkX + 2, checkY + 2.5, checkX + 6, checkY - 2.5);

  // Text inside badge - perfectly centered and safely within the 56mm box
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PAID IN FULL', checkX + 9, totalY + 8.8);

  // Total Summary Box (Right Side)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(115, totalY, 81, 14, 'F');
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.rect(115, totalY, 81, 14, 'D');

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('TOTAL PAID:', 120, totalY + 9);
  doc.text(`INR ${invoice.amount.toLocaleString('en-IN')}/-`, 190, totalY + 9, { align: 'right' });

  // Important Practice Notice
  const noticeY = totalY + 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PRACTICE POLICY & PARENT PARTNERSHIP:', 14, noticeY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(
    '1. Live In-Center Model: Parents actively observe sessions inside the therapy room to reinforce developmental goals at home.',
    14,
    noticeY + 5
  );
  doc.text(
    '2. Rescheduling Policy: All session schedule modifications are coordinated directly through Dr. Sweety Bhatnagar.',
    14,
    noticeY + 9
  );
  doc.text(
    '3. This official receipt is valid for all medical reimbursement and therapy allowance claims.',
    14,
    noticeY + 13
  );

  // Signatures / Stamps
  const signY = noticeY + 48;

  // Add authentic handwritten signature above the name of Dr. Sweety Bhatnagar
  const sigDataUrl = generateDrSweetySignature();
  if (sigDataUrl) {
    doc.addImage(sigDataUrl, 'PNG', 134, signY - 18, 58, 17);
  }

  // Signature divider line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(130, signY, 195, signY);

  // Centered signatory credentials
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Dr. Sweety Bhatnagar', 162.5, signY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Founder & Clinical Director', 162.5, signY + 9.5, { align: 'center' });
  doc.text('Nurturing Minds Therapy Center', 162.5, signY + 13.5, { align: 'center' });

  // Bottom Center Footer
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 285, 210, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Nurturing Minds Therapy Center • connect@drsweetybhatnagar.com • +91 98110 23456', 105, 292, {
    align: 'center',
  });

  return doc;
}

export async function downloadInvoicePDF(
  invoice: Invoice,
  patient: Patient,
  therapist?: Therapist
): Promise<void> {
  const doc = await generateInvoicePDF(invoice, patient, therapist);
  const fileName = `NurturingMinds_Receipt_${patient.childName.replace(/\s+/g, '_')}_${invoice.invoiceNumber}.pdf`;
  doc.save(fileName);
}

