import * as XLSX from 'xlsx';
import { Patient, Therapist } from '../types';

export interface ParsedPatientRow {
  rowNumber: number;
  data: Omit<Patient, 'id' | 'createdAt'>;
  isValid: boolean;
  errors: string[];
  matchedTherapistName: string;
}

export interface SpreadsheetParseResult {
  validRows: ParsedPatientRow[];
  invalidRows: ParsedPatientRow[];
  totalCount: number;
  validCount: number;
  invalidCount: number;
}

export const CSV_TEMPLATE_HEADERS = [
  'Child Full Name*',
  'Age in Years*',
  'Blood Group',
  'Primary Symptom',
  'Chief Clinical Complaint',
  'Father Full Name*',
  'Father Contact Number',
  'Mother Full Name*',
  'Mother Contact Number',
  'Primary Contact (mother/father)',
  'Emergency Contact (mother/father)',
  'Weekly Sessions Count',
  'Assigned Therapist Name or ID',
  'Session Timing Schedule',
  'Payment Status (current/late/partial)',
  'Pending Payment Amount (INR)',
  'Pending Payment Month',
];

export const CSV_SAMPLE_ROWS = [
  [
    'Aarav Sharma',
    '5',
    'B+',
    'Sensory processing sensitivity & fine motor delay',
    'Difficulty holding pencil and emotional dysregulation during noise',
    'Rajesh Sharma',
    '+91 98123 45670',
    'Pooja Sharma',
    '+91 98123 45671',
    'mother',
    'father',
    '3',
    'Ritu Verma',
    'Mon, Wed, Fri • 4:00 PM - 4:45 PM',
    'current',
    '0',
    '',
  ],
  [
    'Ananya Iyer',
    '4',
    'O+',
    'Vestibular seeking & toe walking',
    'Needs deep pressure sensory input and bilateral coordination work',
    'Karthik Iyer',
    '+91 98234 56780',
    'Lakshmi Iyer',
    '+91 98234 56781',
    'mother',
    'father',
    '2',
    'Dr. Sweety Bhatnagar',
    'Tue, Thu • 5:00 PM - 5:45 PM',
    'current',
    '0',
    '',
  ],
  [
    'Kabir Malhotra',
    '6',
    'A+',
    'Attention deficit & sensory processing difficulty',
    'Struggles with seated tabletop focus and midline crossing',
    'Siddharth Malhotra',
    '+91 98345 67890',
    'Rhea Malhotra',
    '+91 98345 67891',
    'mother',
    'mother',
    '3',
    'Ananya Deshmukh',
    'Mon, Wed, Fri • 6:00 PM - 6:45 PM',
    'late',
    '7500',
    'August 2026',
  ],
];

/**
 * Generates and triggers download of CSV template
 */
export function downloadPatientCsvTemplate() {
  const escapeCell = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = CSV_TEMPLATE_HEADERS.map(escapeCell).join(',');
  const rowLines = CSV_SAMPLE_ROWS.map((row) => row.map(escapeCell).join(','));
  const csvContent = [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'NurturingMinds_Patients_Import_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and triggers download of Excel (.xlsx) template
 */
export function downloadPatientExcelTemplate() {
  const wsData = [CSV_TEMPLATE_HEADERS, ...CSV_SAMPLE_ROWS];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 22 }, // Child Name
    { wch: 14 }, // Age
    { wch: 12 }, // Blood Group
    { wch: 35 }, // Primary Symptom
    { wch: 45 }, // Chief Clinical Complaint
    { wch: 22 }, // Father Name
    { wch: 24 }, // Father Contact
    { wch: 22 }, // Mother Name
    { wch: 24 }, // Mother Contact
    { wch: 28 }, // Primary Contact
    { wch: 30 }, // Emergency Contact
    { wch: 22 }, // Weekly Sessions
    { wch: 30 }, // Assigned Therapist
    { wch: 35 }, // Session Timing
    { wch: 32 }, // Payment Status
    { wch: 28 }, // Pending Amount
    { wch: 24 }, // Pending Month
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Patient Import Template');
  XLSX.writeFile(wb, 'NurturingMinds_Patients_Import_Template.xlsx');
}

/**
 * Normalizes header keys to standard names
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parses an uploaded CSV or Excel file and validates against clinic requirements
 */
export async function parsePatientSpreadsheet(
  file: File,
  therapists: Therapist[]
): Promise<SpreadsheetParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert worksheet to raw json array
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
  });

  const validRows: ParsedPatientRow[] = [];
  const invalidRows: ParsedPatientRow[] = [];

  // Matcher for therapists
  const defaultTherapist = therapists.find((t) => t.id === 'th-3') || therapists[0];

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for 0-index, +1 for header row
    const errors: string[] = [];

    // Map columns flexibly
    const normalizedRow: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      normalizedRow[normalizeKey(k)] = String(v ?? '').trim();
    }

    // Extract child name
    const childName =
      normalizedRow['childfullname'] ||
      normalizedRow['childname'] ||
      normalizedRow['patientname'] ||
      normalizedRow['child'] ||
      '';

    if (!childName) {
      errors.push('Child Full Name is required.');
    }

    // Extract age
    const rawAge =
      normalizedRow['ageinyears'] ||
      normalizedRow['age'] ||
      normalizedRow['childage'] ||
      '';
    const ageNum = parseInt(rawAge, 10);
    if (!rawAge || isNaN(ageNum) || ageNum <= 0 || ageNum > 21) {
      errors.push('Age must be a valid number between 1 and 21.');
    }

    // Blood Group
    const bloodGroup = normalizedRow['bloodgroup'] || 'B+';

    // Symptoms and Chief Complaint
    const symptom =
      normalizedRow['primarysymptom'] ||
      normalizedRow['symptom'] ||
      normalizedRow['condition'] ||
      'Pediatric Occupational Therapy Evaluation';

    const chiefComplaint =
      normalizedRow['chiefclinicalcomplaint'] ||
      normalizedRow['chiefcomplaint'] ||
      normalizedRow['complaint'] ||
      symptom;

    // Parent details
    const fatherName =
      normalizedRow['fatherfullname'] ||
      normalizedRow['fathername'] ||
      normalizedRow['father'] ||
      '';

    const fatherContact =
      normalizedRow['fathercontactnumber'] ||
      normalizedRow['fathercontact'] ||
      normalizedRow['fatherphone'] ||
      '+91 98765 43210';

    const motherName =
      normalizedRow['motherfullname'] ||
      normalizedRow['mothername'] ||
      normalizedRow['mother'] ||
      '';

    const motherContact =
      normalizedRow['mothercontactnumber'] ||
      normalizedRow['mothercontact'] ||
      normalizedRow['motherphone'] ||
      '+91 98765 43211';

    if (!fatherName && !motherName) {
      errors.push('At least one parent name (Mother or Father) is required.');
    }

    // Contact designations
    const rawPrimary = (normalizedRow['primarycontact'] || 'mother').toLowerCase();
    const primaryContact: 'father' | 'mother' = rawPrimary.includes('father') ? 'father' : 'mother';

    const rawEmergency = (normalizedRow['emergencycontact'] || 'father').toLowerCase();
    const emergencyContact: 'father' | 'mother' = rawEmergency.includes('mother') ? 'mother' : 'father';

    // Sessions per week
    const rawSessionsPerWeek =
      normalizedRow['weeklysessionscount'] ||
      normalizedRow['sessionsperweek'] ||
      normalizedRow['sessionsweek'] ||
      '3';
    const sessionsPerWeek = parseInt(rawSessionsPerWeek, 10) || 3;

    // Assigned Therapist Matching
    const rawTherapist =
      normalizedRow['assignedtherapistnameorid'] ||
      normalizedRow['assignedtherapist'] ||
      normalizedRow['therapist'] ||
      '';

    let matchedTherapist = defaultTherapist;
    if (rawTherapist) {
      const normalizedQuery = rawTherapist.toLowerCase();
      const directMatch = therapists.find(
        (t) =>
          t.id.toLowerCase() === normalizedQuery ||
          t.name.toLowerCase().includes(normalizedQuery) ||
          normalizedQuery.includes(t.name.toLowerCase().split(' ')[0])
      );
      if (directMatch) {
        matchedTherapist = directMatch;
      }
    }

    // Session Timing
    const sessionTiming =
      normalizedRow['sessiontimingschedule'] ||
      normalizedRow['sessiontiming'] ||
      normalizedRow['timings'] ||
      'Mon, Wed, Fri • 4:00 PM - 4:45 PM';

    // Payment Status
    const rawPayment = (normalizedRow['paymentstatus'] || 'current').toLowerCase();
    let paymentStatus: Patient['paymentStatus'] = 'current';
    if (rawPayment.includes('late')) paymentStatus = 'late';
    else if (rawPayment.includes('partial')) paymentStatus = 'partial';

    // Pending payment amount
    const rawPendingAmount =
      normalizedRow['pendingpaymentamountinr'] ||
      normalizedRow['pendingpaymentamount'] ||
      normalizedRow['pendingamount'] ||
      '0';
    const pendingPaymentAmount = parseFloat(rawPendingAmount) || (paymentStatus === 'late' ? 7500 : 0);

    // Pending payment month
    const pendingPaymentMonth =
      normalizedRow['pendingpaymentmonth'] ||
      normalizedRow['pendingmonth'] ||
      (paymentStatus === 'late' ? 'Current Month' : '');

    const patientData: Omit<Patient, 'id' | 'createdAt'> = {
      childName: childName || 'Unnamed Child',
      age: isNaN(ageNum) ? 5 : ageNum,
      bloodGroup,
      symptom,
      chiefComplaint,
      fatherName: fatherName || 'Parent / Guardian',
      fatherContact,
      motherName: motherName || 'Parent / Guardian',
      motherContact,
      primaryContact,
      emergencyContact,
      sessionsPerWeek: Math.min(6, Math.max(1, sessionsPerWeek)),
      assignedTherapistId: matchedTherapist ? matchedTherapist.id : 'th-3',
      sessionTiming,
      paymentStatus,
      pendingPaymentAmount: pendingPaymentAmount > 0 ? pendingPaymentAmount : undefined,
      pendingPaymentMonth: pendingPaymentMonth || undefined,
    };

    const parsedRow: ParsedPatientRow = {
      rowNumber,
      data: patientData,
      isValid: errors.length === 0,
      errors,
      matchedTherapistName: matchedTherapist?.name || 'Dr. Sweety Bhatnagar',
    };

    if (errors.length === 0) {
      validRows.push(parsedRow);
    } else {
      invalidRows.push(parsedRow);
    }
  });

  return {
    validRows,
    invalidRows,
    totalCount: rawRows.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
  };
}
