import React, { useState } from 'react';
import { MonthlyFile, MonthSummary } from '../types/finance';
import { formatMoney, getNextShamsiMonth, getShamsiMonthTitle, toPersianDigits } from '../utils/shamsi';
import { X, Lock, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';

interface CloseMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFile: MonthlyFile;
  summary: MonthSummary;
  onConfirmClose: (options: { carryOverBudgets: boolean }) => void;
  currencyUnit?: string;
}

export const CloseMonthModal: React.FC<CloseMonthModalProps> = ({
  isOpen,
  onClose,
  currentFile,
  summary,
  onConfirmClose,
  currencyUnit = 'تومان',
}) => {
  const [carryOverBudgets, setCarryOverBudgets] = useState(true);

  if (!isOpen) return null;

  const nextMonth = getNextShamsiMonth(currentFile.year, currentFile.month);
  const nextMonthTitle = getShamsiMonthTitle(nextMonth.year, nextMonth.month);

  const pendingDeposits = currentFile.deposits.filter((d) => !d.isReceived);
  const isSurplus = summary.netCashflow >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-t-[32px] sm:rounded-3xl bg-slate-900 border border-slate-800 text-right overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>بستن و بایگانی پرونده</span>
            </div>
            <h3 className="text-lg font-extrabold text-white">پرونده {currentFile.monthName}</h3>
          </div>
          <div className="w-9" />
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            با بستن پرونده، تمامی واریزی‌ها، بودجه‌ها و مخارج ماه{' '}
            <strong className="text-white">{currentFile.monthName}</strong> به صورت یک گزارش یکپارچه در آرشیو قفل و ذخیره
            شده و بلافاصله پرونده ماه جدید (<strong className="text-emerald-400">{nextMonthTitle}</strong>) بازگشایی
            می‌گردد.
          </p>

          {/* Pending deposits warning if any */}
          {pendingDeposits.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  توجه: {toPersianDigits(pendingDeposits.length)} مورد از واریزی‌ها هنوز تیک نخورده‌اند:
                </p>
                <div className="mt-1 space-y-0.5 text-[11px] text-amber-300/80">
                  {pendingDeposits.slice(0, 3).map((d) => (
                    <div key={d.id}>• {d.title} ({formatMoney(d.amount, currencyUnit)})</div>
                  ))}
                  {pendingDeposits.length > 3 && (
                    <div>و {toPersianDigits(pendingDeposits.length - 3)} مورد دیگر...</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Summary KPI Cards */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400">خلاصه صورت‌حساب پایانی این ماه:</h4>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 divide-y divide-slate-800/60 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">کل واریزی‌های دریافت شده:</span>
                <span className="font-bold text-emerald-400">
                  {formatMoney(summary.totalReceivedDeposits, currencyUnit)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-slate-400">کل مخارج انجام شده:</span>
                <span className="font-bold text-rose-400">
                  {formatMoney(summary.totalExpenses, currencyUnit)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-slate-400">کل بودجه تخصیص یافته:</span>
                <span className="font-bold text-slate-200">
                  {formatMoney(summary.totalBudgetAllocated, currencyUnit)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-slate-400">مانده صرف‌نشده بودجه‌ها:</span>
                <span
                  className={`font-bold ${
                    summary.remainingBudget >= 0 ? 'text-teal-400' : 'text-rose-400'
                  }`}
                >
                  {formatMoney(summary.remainingBudget, currencyUnit)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-800">
                <span className="font-bold text-slate-200">تراز نهایی ماه (مازاد نقدی):</span>
                <span
                  className={`text-sm font-extrabold ${
                    isSurplus ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isSurplus ? '+' : ''}
                  {formatMoney(summary.netCashflow, currencyUnit)}
                </span>
              </div>
            </div>
          </div>

          {/* New month transition option */}
          <div className="bg-slate-950/40 border border-slate-800/60 p-3.5 rounded-2xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={carryOverBudgets}
                onChange={(e) => setCarryOverBudgets(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:outline-none bg-slate-900 border-slate-700"
              />
              <span className="text-xs text-slate-300 font-medium select-none">
                انتقال سقف دسته‌بندی‌های بودجه فعلی به پرونده ماه جدید ({nextMonthTitle})
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 shrink-0 space-y-2">
          <button
            onClick={() => onConfirmClose({ carryOverBudgets })}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>تایید نهایی و بازگشایی پرونده {nextMonthTitle}</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
          >
            انصراف و ادامه ماه جاری
          </button>
        </div>
      </div>
    </div>
  );
};
