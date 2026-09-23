import React, { useState } from 'react';
import { MonthlyFile } from '../types/finance';
import { calculateMonthSummary, getBudgetCalculations } from '../services/storage';
import { formatMoney, toPersianDigits } from '../utils/shamsi';
import { BudgetDonutChart } from './BudgetDonutChart';
import {
  Archive,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Download,
  Upload,
  ArrowLeft,
  Lock,
  CheckCircle2,
  PieChart,
  FileSpreadsheet,
} from 'lucide-react';

interface ArchiveSectionProps {
  archives: MonthlyFile[];
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currencyUnit?: string;
}

export const ArchiveSection: React.FC<ArchiveSectionProps> = ({
  archives,
  onExportBackup,
  onImportBackup,
  currencyUnit = 'تومان',
}) => {
  const [selectedArchive, setSelectedArchive] = useState<MonthlyFile | null>(null);

  if (selectedArchive) {
    const summary = calculateMonthSummary(selectedArchive);
    const isSurplus = summary.netCashflow >= 0;

    const donutData = selectedArchive.budgets
      .map((b) => {
        const { spent } = getBudgetCalculations(b, selectedArchive.expenses);
        return {
          id: b.id,
          title: b.title,
          amount: spent,
          color: b.color,
          percentage: summary.totalExpenses > 0 ? (spent / summary.totalExpenses) * 100 : 0,
        };
      })
      .filter((d) => d.amount > 0);

    return (
      <div className="space-y-4 pb-8 text-right animate-in fade-in duration-150">
        {/* Top return bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedArchive(null)}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
          >
            <ChevronRight className="w-4 h-4" />
            <span>بازگشت به لیست آرشیو</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>پرونده بایگانی‌شده</span>
          </div>
        </div>

        {/* Month Header Banner */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
          <span className="text-[11px] text-slate-400">گزارش پرونده مختومه</span>
          <h2 className="text-xl font-extrabold text-white mt-0.5">{selectedArchive.monthName}</h2>

          {/* Unified Summary Cards */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">واریزی دریافت شده</span>
              <span className="text-xs font-bold text-emerald-400 block">
                {formatMoney(summary.totalReceivedDeposits, '')}
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5 block">{currencyUnit}</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">کل مخارج ماه</span>
              <span className="text-xs font-bold text-rose-400 block">
                {formatMoney(summary.totalExpenses, '')}
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5 block">{currencyUnit}</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">مازاد نقدینگی نهایی</span>
              <span
                className={`text-xs font-bold block ${
                  isSurplus ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isSurplus ? '+' : ''}
                {formatMoney(summary.netCashflow, '')}
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5 block">{currencyUnit}</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        {donutData.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl">
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white">سهم مخارج در این ماه</h3>
            </div>
            <BudgetDonutChart
              data={donutData}
              totalAmount={summary.totalExpenses}
              centerSubtitle="کل مخارج"
              unit={currencyUnit}
            />
          </div>
        )}

        {/* Budgets Performance in this archived month */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-300 px-1">عملکرد بودجه‌ها در این ماه</h3>
          <div className="space-y-2">
            {selectedArchive.budgets.map((b) => {
              const { spent, remaining } = getBudgetCalculations(b, selectedArchive.expenses);
              return (
                <div
                  key={b.id}
                  className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <div>
                      <h4 className="text-xs font-bold text-white">{b.title}</h4>
                      <p className="text-[10px] text-slate-400">
                        سقف: {formatMoney(b.allocatedAmount, currencyUnit)}
                      </p>
                    </div>
                  </div>

                  <div className="text-left text-xs">
                    <span className="text-rose-400 font-bold block">
                      خرج: {formatMoney(spent, '')}
                    </span>
                    <span
                      className={`text-[10px] font-medium block ${
                        remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      مانده: {formatMoney(remaining, currencyUnit)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deposits in this archived month */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-300 px-1">واریزی‌های ثبت شده در این ماه</h3>
          <div className="space-y-1.5">
            {selectedArchive.deposits.map((d) => (
              <div
                key={d.id}
                className="bg-slate-900/50 border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${d.isReceived ? 'text-emerald-400' : 'text-slate-600'}`}
                  />
                  <span className="font-medium text-slate-200">{d.title}</span>
                  <span className="text-[10px] text-slate-500">
                    {d.isFixed ? '(ثابت)' : '(موردی)'}
                  </span>
                </div>
                <span className="font-bold text-slate-300">
                  {formatMoney(d.amount, currencyUnit)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses history */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-300 px-1">
            ریز مخارج ثبت‌شده ({toPersianDigits(selectedArchive.expenses.length)} مورد)
          </h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {selectedArchive.expenses.map((e) => (
              <div
                key={e.id}
                className="bg-slate-900/50 border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-medium text-slate-200">{e.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {e.budgetName} • {e.date}
                  </p>
                </div>
                <span className="font-bold text-rose-400">-{formatMoney(e.amount, currencyUnit)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8 text-right">
      {/* Archive Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium mb-1">
          <Archive className="w-4 h-4" />
          <span>آرشیو و پرونده‌های پیشین</span>
        </div>
        <h2 className="text-xl font-extrabold text-white">تاریخچه پرونده‌های مالی</h2>
        <p className="text-xs text-slate-400 mt-1 leading-5">
          با بستن هر ماه، یک پرونده مستقل و قفل‌شده در این بخش ذخیره می‌شود تا بتوانید عملکرد ماه‌های گذشته را بررسی و مقایسه کنید.
        </p>

        {/* Backup export & import */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <button
            onClick={onExportBackup}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>پشتیبان‌گیری (JSON)</span>
          </button>

          <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition active:scale-95">
            <Upload className="w-3.5 h-3.5 text-teal-400" />
            <span>بازیابی فایل پشتیبان</span>
            <input
              type="file"
              accept=".json"
              onChange={onImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Archives List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-300">پرونده‌های بایگانی شده</span>
          <span className="text-[11px] text-slate-500">{toPersianDigits(archives.length)} پرونده</span>
        </div>

        {archives.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 p-6">
            <Archive className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-400">هنوز پرونده‌ای بایگانی نشده است</p>
            <p className="text-[11px] text-slate-500 mt-1">
              در پایان ماه جاری با زدن دکمه «بستن پرونده این ماه» در بخش واریزی‌ها، اولین پرونده در اینجا ذخیره خواهد شد.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {archives.map((archive) => {
              const sum = calculateMonthSummary(archive);
              const isSurplus = sum.netCashflow >= 0;

              return (
                <div
                  key={archive.id}
                  onClick={() => setSelectedArchive(archive)}
                  className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-2xl shadow-sm cursor-pointer transition active:scale-[0.99] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{archive.monthName}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        واریزی دریافت شده: {formatMoney(sum.totalReceivedDeposits, currencyUnit)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <span className="text-xs font-extrabold text-rose-400 block leading-tight">
                        خرج: {formatMoney(sum.totalExpenses, '')}
                      </span>
                      <span
                        className={`text-[10px] font-bold block ${
                          isSurplus ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isSurplus ? 'پس‌انداز: +' : 'کسری: '}
                        {formatMoney(sum.netCashflow, currencyUnit)}
                      </span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
