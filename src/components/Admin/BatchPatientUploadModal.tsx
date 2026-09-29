import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  UserCheck,
  Trash2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Therapist, Patient } from '../../types';
import { store } from '../../services/store';
import {
  downloadPatientCsvTemplate,
  downloadPatientExcelTemplate,
  parsePatientSpreadsheet,
  ParsedPatientRow,
  SpreadsheetParseResult,
  CSV_TEMPLATE_HEADERS,
  CSV_SAMPLE_ROWS,
} from '../../utils/csvPatientUtils';

interface BatchPatientUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  therapists: Therapist[];
  onImportSuccess?: (importedCount: number) => void;
}

export const BatchPatientUploadModal: React.FC<BatchPatientUploadModalProps> = ({
  isOpen,
  onClose,
  therapists,
  onImportSuccess,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<SpreadsheetParseResult | null>(null);
  const [showSampleReference, setShowSampleReference] = useState(false);
  const [importedSummary, setImportedSummary] = useState<{ count: number; names: string[] } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle Drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Handle file select via input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseResult(null);
    setImportedSummary(null);

    try {
      const result = await parsePatientSpreadsheet(file, therapists);
      setParseResult(result);
    } catch (err) {
      console.error('Failed to parse file:', err);
      alert('Could not parse the file. Please ensure it is a valid .csv, .xlsx, or .xls file.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleRemoveRow = (rowNumber: number) => {
    if (!parseResult) return;
    const updatedValid = parseResult.validRows.filter((r) => r.rowNumber !== rowNumber);
    const updatedInvalid = parseResult.invalidRows.filter((r) => r.rowNumber !== rowNumber);

    setParseResult({
      ...parseResult,
      validRows: updatedValid,
      invalidRows: updatedInvalid,
      validCount: updatedValid.length,
      invalidCount: updatedInvalid.length,
      totalCount: updatedValid.length + updatedInvalid.length,
    });
  };

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    const patientsToCreate = parseResult.validRows.map((r) => r.data);
    const created = store.createPatientsBatch(patientsToCreate);

    const names = created.map((p) => p.childName);
    setImportedSummary({ count: created.length, names });

    if (onImportSuccess) {
      onImportSuccess(created.length);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setImportedSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 my-8 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-50 text-[#6D0281] border border-purple-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Batch Import Patients via CSV / Excel
              </h3>
              <p className="text-xs text-slate-500">
                Upload your clinic patient roster in bulk with automatic therapist matching & parent invites.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1 text-xs">
          {/* SUCCESS SCREEN */}
          {importedSummary ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-900">
                  {importedSummary.count} Patients Enrolled Successfully!
                </h4>
                <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                  Clinical records, parent portal invite codes, and therapist assignments have been
                  instantly generated and registered in the CRM.
                </p>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/80 max-w-md mx-auto text-left">
                <p className="font-semibold text-emerald-900 text-[11px] mb-1.5">
                  Imported Children Roster:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {importedSummary.names.map((name, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-medium"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 font-semibold transition"
                >
                  Upload Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-[#6D0281] hover:bg-[#570167] text-white font-bold transition shadow-xs"
                >
                  Go to Patient CRM
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: Download Templates */}
              <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-[#6D0281]" />
                      Step 1: Download Patient Template
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Use our pre-formatted spreadsheet template with sample data and column headers.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadPatientCsvTemplate}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-100 text-[#6D0281] border border-purple-200 font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download CSV Template
                    </button>

                    <button
                      type="button"
                      onClick={downloadPatientExcelTemplate}
                      className="px-3 py-1.5 rounded-xl bg-[#6D0281] hover:bg-[#570167] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Download Excel (.xlsx)
                    </button>
                  </div>
                </div>

                {/* Collapsible Column Guide */}
                <div className="border-t border-purple-100 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSampleReference(!showSampleReference)}
                    className="text-[11px] text-[#6D0281] font-semibold hover:underline flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {showSampleReference ? 'Hide Template Columns & Format' : 'View Template Columns & Format'}
                    {showSampleReference ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {showSampleReference && (
                    <div className="mt-2.5 p-3 bg-white rounded-xl border border-purple-100 text-[11px] space-y-2 overflow-x-auto">
                      <p className="font-semibold text-slate-700">Supported Columns in Template:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-slate-600">
                        <div>• <strong>Child Full Name*</strong> (e.g. Aarav Sharma)</div>
                        <div>• <strong>Age in Years*</strong> (e.g. 5)</div>
                        <div>• <strong>Blood Group</strong> (e.g. B+, O+)</div>
                        <div>• <strong>Primary Symptom</strong> (Clinical OT)</div>
                        <div>• <strong>Chief Clinical Complaint</strong></div>
                        <div>• <strong>Father Full Name*</strong></div>
                        <div>• <strong>Father Contact</strong> (+91 ...)</div>
                        <div>• <strong>Mother Full Name*</strong></div>
                        <div>• <strong>Mother Contact</strong> (+91 ...)</div>
                        <div>• <strong>Primary Contact</strong> (mother / father)</div>
                        <div>• <strong>Assigned Therapist</strong> (e.g. Ritu Verma)</div>
                        <div>• <strong>Session Timing</strong> (45-min slots)</div>
                        <div>• <strong>Payment Status</strong> (current / late)</div>
                        <div>• <strong>Weekly Sessions</strong> (e.g. 3)</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: Drag & Drop / Click Upload Area */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-[#6D0281]" />
                  Step 2: Upload Completed CSV or Excel File
                </h4>

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all duration-200 ${
                    dragActive
                      ? 'border-[#6D0281] bg-purple-50/80 scale-[1.01]'
                      : selectedFile
                      ? 'border-purple-300 bg-purple-50/30'
                      : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/20'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-purple-50 text-[#6D0281] flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>

                    {selectedFile ? (
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Click or drag another file to replace
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-slate-800 text-sm">
                          Drag and drop your CSV or Excel file here
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Or <span className="text-[#6D0281] font-semibold underline">browse from your computer</span> (.csv, .xlsx, .xls)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Parsing Indicator */}
              {isParsing && (
                <div className="p-4 bg-purple-50 rounded-xl text-center text-purple-900 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#6D0281] border-t-transparent rounded-full animate-spin"></div>
                  <span>Parsing and validating spreadsheet data...</span>
                </div>
              )}

              {/* STEP 3: Validation & Data Preview Table */}
              {parseResult && (
                <div className="space-y-3 pt-2">
                  {/* Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{parseResult.validCount} Valid Patients</span>
                      </div>

                      {parseResult.invalidCount > 0 && (
                        <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                          <AlertCircle className="w-4 h-4" />
                          <span>{parseResult.invalidCount} Invalid Rows (Skipped)</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleReset}
                      className="text-[11px] text-slate-500 hover:text-red-600 font-semibold"
                    >
                      Clear / Choose Another File
                    </button>
                  </div>

                  {/* Invalid Rows Warnings */}
                  {parseResult.invalidRows.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                      <p className="font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                        The following rows contain errors and will not be imported:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                        {parseResult.invalidRows.map((inv) => (
                          <li key={inv.rowNumber}>
                            <strong>Row {inv.rowNumber}:</strong> {inv.errors.join('; ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Valid Rows Preview Table */}
                  {parseResult.validRows.length > 0 ? (
                    <div className="border border-purple-100 rounded-xl overflow-hidden">
                      <div className="bg-purple-50/70 p-2.5 font-bold text-[11px] text-slate-700 flex items-center justify-between">
                        <span>Preview: Ready to Import ({parseResult.validRows.length})</span>
                        <span className="text-[10px] text-slate-500">
                          Review before final enrollment
                        </span>
                      </div>

                      <div className="overflow-x-auto max-h-56">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3">Row</th>
                              <th className="py-2 px-3">Child & Age</th>
                              <th className="py-2 px-3">Primary Symptom</th>
                              <th className="py-2 px-3">Parents & Contact</th>
                              <th className="py-2 px-3">Therapist</th>
                              <th className="py-2 px-3">Schedule</th>
                              <th className="py-2 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {parseResult.validRows.map((row) => (
                              <tr key={row.rowNumber} className="hover:bg-purple-50/20">
                                <td className="py-2 px-3 text-slate-400 font-mono">
                                  #{row.rowNumber}
                                </td>
                                <td className="py-2 px-3 font-semibold text-slate-900">
                                  {row.data.childName} ({row.data.age}y, {row.data.bloodGroup})
                                </td>
                                <td className="py-2 px-3 text-slate-600 max-w-[140px] truncate" title={row.data.symptom}>
                                  {row.data.symptom}
                                </td>
                                <td className="py-2 px-3 text-slate-600">
                                  <p>{row.data.motherName} / {row.data.fatherName}</p>
                                  <p className="text-[10px] text-slate-400">{row.data.motherContact || row.data.fatherContact}</p>
                                  {row.data.parentEmail && (
                                    <p className="text-[10px] text-teal-700 font-mono truncate">{row.data.parentEmail}</p>
                                  )}
                                </td>
                                <td className="py-2 px-3">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#6D0281] bg-purple-50 px-2 py-0.5 rounded-md">
                                    <UserCheck className="w-3 h-3" />
                                    {row.matchedTherapistName}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-600 text-[10px]">
                                  {row.data.sessionsPerWeek}x/wk • {row.data.sessionTiming}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    onClick={() => handleRemoveRow(row.rowNumber)}
                                    className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                                    title="Exclude row"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-xl text-center text-amber-800">
                      No valid patient rows found in this file. Please check the template format.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400">
            * Automatic parent invite codes will be created for each enrolled child.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              {importedSummary ? 'Close' : 'Cancel'}
            </button>

            {!importedSummary && (
              <button
                type="button"
                disabled={!parseResult || parseResult.validCount === 0 || isParsing}
                onClick={handleConfirmImport}
                className="px-5 py-2 text-xs font-bold text-white bg-[#6D0281] hover:bg-[#570167] rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                Import {parseResult ? parseResult.validCount : 0} Patients to CRM
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
