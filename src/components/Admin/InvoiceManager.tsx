import React, { useState } from 'react';
import { Download, Plus, Receipt, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Invoice, Patient, Therapist } from '../../types';
import { store } from '../../services/store';
import { downloadInvoicePDF } from '../../services/pdf';

interface InvoiceManagerProps {
  invoices: Invoice[];
  patients: Patient[];
  therapists: Therapist[];
}

export const InvoiceManager: React.FC<InvoiceManagerProps> = ({
  invoices,
  patients,
  therapists,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [amount, setAmount] = useState<number>(18000);
  const [description, setDescription] = useState('12-Session Monthly Pediatric Occupational Therapy Package');
  const [paymentMode, setPaymentMode] = useState<Invoice['paymentMode']>('UPI');

  const getPatient = (id: string) => patients.find((p) => p.id === id);
  const getTherapist = (id?: string) => therapists.find((t) => t.id === id);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    const newInvoice = store.createInvoice(selectedPatientId, amount, description, paymentMode);
    const patient = getPatient(selectedPatientId);
    if (patient) {
      const therapist = getTherapist(patient.assignedTherapistId);
      downloadInvoicePDF(newInvoice, patient, therapist);
    }

    setShowCreateModal(false);
  };

  const handleDownload = (invoice: Invoice) => {
    const patient = getPatient(invoice.patientId);
    if (!patient) return;
    const therapist = getTherapist(patient.assignedTherapistId);
    downloadInvoicePDF(invoice, patient, therapist);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#6D0281]" />
            Official Receipts & Invoicing Register
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generates branded clinical receipts in brand colors (#6D0281) with official seal and signature.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-[#6D0281] hover:bg-[#570167] text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Issue Official Receipt
        </button>
      </div>

      {/* Register List */}
      <div className="bg-white rounded-2xl border border-purple-100/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Issued Receipts ({invoices.length})
          </h3>
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Replaces physical paper receipt register
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Receipt No.</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Child & Parents</th>
                <th className="py-2.5 px-4">Particulars</th>
                <th className="py-2.5 px-4">Payment Mode</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4 text-right">PDF Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => {
                const patient = getPatient(inv.patientId);

                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#6D0281]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(inv.issuedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{patient?.childName || 'Child'}</p>
                      <p className="text-[10px] text-slate-400">
                        {patient?.motherName} / {patient?.fatherName}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                      {inv.description}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {inv.paymentMode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">
                      ₹ {inv.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDownload(inv)}
                        className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-[#6D0281] rounded-lg text-xs font-semibold transition border border-purple-200 inline-flex items-center gap-1"
                        title="Download Branded Official Receipt PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to Issue New Receipt */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Issue Official Therapy Receipt</h3>
            <p className="text-xs text-slate-500 mb-4">
              Issues receipt, updates child&apos;s payment status to current, and generates branded PDF.
            </p>

            <form onSubmit={handleCreateInvoice} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Patient *</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-white font-medium"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.childName} (Mother: {p.motherName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Service Particulars *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Mode *</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as Invoice['paymentMode'])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-white font-medium"
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe)</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Cash">Cash at Center</option>
                    <option value="Card">Card POS</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#6D0281] hover:bg-[#570167] rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Issue & Download PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
