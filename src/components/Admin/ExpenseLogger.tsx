import React, { useState } from 'react';
import { IndianRupee, Sparkles, Send, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import { Expense } from '../../types';
import { store } from '../../services/store';
import { parseExpenseSentence } from '../../services/ai';

interface ExpenseLoggerProps {
  expenses: Expense[];
}

export const ExpenseLogger: React.FC<ExpenseLoggerProps> = ({ expenses }) => {
  const [inputSentence, setInputSentence] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<{
    amount: number;
    payee: string;
    date: string;
    category: string;
    modelStamp: string;
  } | null>(null);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSentence.trim()) return;

    setIsParsing(true);
    try {
      const result = await parseExpenseSentence(inputSentence.trim());
      setParsedPreview({
        amount: result.amount,
        payee: result.payee,
        date: result.date,
        category: result.category,
        modelStamp: result.providerStamp,
      });
    } catch (err) {
      console.error('Error parsing expense sentence:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmAdd = () => {
    if (!parsedPreview) return;

    store.addExpense({
      amount: parsedPreview.amount,
      payee: parsedPreview.payee,
      date: parsedPreview.date,
      category: parsedPreview.category,
      rawSentence: inputSentence.trim(),
      modelStamp: parsedPreview.modelStamp,
    });

    setInputSentence('');
    setParsedPreview(null);
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Delete this expense entry?')) {
      store.deleteExpense(id);
    }
  };

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header and Info */}
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-[#6D0281]" />
          Natural Language Expense Logger
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Type a simple plain sentence (e.g. &quot;Paid ₹5,000 to Ramesh for center cleaning&quot;). OpenRouter free-tier AI parses it into structured data.
        </p>
      </div>

      {/* Input Box */}
      <div className="bg-white p-5 rounded-2xl border border-purple-100/80 shadow-xs">
        <form onSubmit={handleParse} className="space-y-3">
          <label className="text-xs font-semibold text-slate-700 block">
            Enter Plain Expense Sentence:
          </label>

          <div className="relative flex items-center">
            <input
              type="text"
              value={inputSentence}
              onChange={(e) => setInputSentence(e.target.value)}
              placeholder="e.g. Paid ₹5,000 to Ramesh for clinic cleaning on 2nd Sep"
              className="w-full pl-4 pr-28 py-3 text-xs md:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none placeholder:text-slate-400"
            />

            <button
              type="submit"
              disabled={isParsing || !inputSentence.trim()}
              className="absolute right-2 px-3.5 py-2 bg-[#6D0281] hover:bg-[#570167] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              {isParsing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Parse AI
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="font-medium text-slate-400">Try clicking:</span>
            <button
              type="button"
              onClick={() => setInputSentence('Paid ₹5,000 to Ramesh for therapy room sanitization')}
              className="hover:text-[#6D0281] underline cursor-pointer"
            >
              &quot;Paid ₹5,000 to Ramesh for therapy room sanitization&quot;
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setInputSentence('Purchased ₹3,200 sensory clay and textured balls from Amazon')}
              className="hover:text-[#6D0281] underline cursor-pointer"
            >
              &quot;Purchased ₹3,200 sensory clay from Amazon&quot;
            </button>
          </div>
        </form>

        {/* Parsed Preview Card */}
        {parsedPreview && (
          <div className="mt-4 p-4 rounded-xl bg-purple-50/70 border border-purple-200 animate-in fade-in">
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-purple-200/60">
              <span className="text-xs font-bold text-[#6D0281] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Parsed Structured Entry
              </span>
              <span className="text-[10px] font-mono text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                {parsedPreview.modelStamp}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-700 my-2">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Amount</span>
                <span className="font-extrabold text-base text-slate-900">
                  ₹ {parsedPreview.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Payee</span>
                <span className="font-bold text-slate-900">{parsedPreview.payee}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Date</span>
                <span className="font-medium text-slate-900">{parsedPreview.date}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Category</span>
                <span className="font-medium text-slate-900 capitalize">{parsedPreview.category}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-purple-200/60">
              <button
                type="button"
                onClick={() => setParsedPreview(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white rounded-lg transition"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#6D0281] hover:bg-[#570167] rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm & Log Expense
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logged Expenses Table */}
      <div className="bg-white rounded-2xl border border-purple-100/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Expense Register ({expenses.length} records)
            </h3>
            <p className="text-[11px] text-slate-400">Feeds into Dr. Bhatnagar&apos;s Monthly P&L</p>
          </div>
          <p className="text-xs font-bold text-[#6D0281]">
            Total Logged: ₹ {totalExpense.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Payee / Purpose</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">Original Input Sentence</th>
                <th className="py-2.5 px-4">Model Stamp</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-medium text-slate-700">{exp.date}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{exp.payee}</td>
                  <td className="py-3 px-4">
                    <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-extrabold text-[#6D0281]">
                    ₹ {exp.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate">
                    &quot;{exp.rawSentence}&quot;
                  </td>
                  <td className="py-3 px-4 text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                    {exp.modelStamp}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                      title="Delete expense entry"
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
    </div>
  );
};
