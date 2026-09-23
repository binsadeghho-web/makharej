import React, { useState, useMemo } from 'react';
import { MonthlyFile, Expense, Budget, Deposit } from '../types/finance';
import { calculateMonthSummary, getBudgetCalculations } from '../services/storage';
import { formatMoney, toPersianDigits } from '../utils/shamsi';
import { BudgetDonutChart } from './BudgetDonutChart';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Archive,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Download,
  Upload,
  Lock,
  CheckCircle2,
  PieChart,
  FileSpreadsheet,
  Search,
  BarChart3,
  Layers,
  Sparkles,
  CalendarClock,
  ArrowUpDown,
  Filter,
  Receipt,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  X,
  Tag,
} from 'lucide-react';

interface ArchiveSectionProps {
  archives: MonthlyFile[];
  currentFile?: MonthlyFile;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currencyUnit?: string;
}

export const ArchiveSection: React.FC<ArchiveSectionProps> = ({
  archives,
  currentFile,
  onExportBackup,
  onImportBackup,
  currencyUnit = 'تومان',
}) => {
  // Navigation tabs within Archive section
  const [activeTab, setActiveTab] = useState<'periods' | 'search' | 'comparison'>('periods');
  const [selectedArchive, setSelectedArchive] = useState<MonthlyFile | null>(null);

  // Search in single period view
  const [singlePeriodSearch, setSinglePeriodSearch] = useState('');
  const [singlePeriodCategory, setSinglePeriodCategory] = useState<string>('all');

  // Cross-period search query & settings
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [includeCurrentMonth, setIncludeCurrentMonth] = useState(true);

  // Combined list of periods for analysis
  const allAvailablePeriods = useMemo(() => {
    const list: { file: MonthlyFile; isCurrent: boolean }[] = [];
    if (includeCurrentMonth && currentFile) {
      list.push({ file: currentFile, isCurrent: true });
    }
    archives.forEach((arc) => {
      list.push({ file: arc, isCurrent: false });
    });
    return list;
  }, [archives, currentFile, includeCurrentMonth]);

  // Extract all expenses across all available periods
  const allCrossPeriodExpenses = useMemo(() => {
    return allAvailablePeriods.flatMap(({ file, isCurrent }) =>
      file.expenses.map((exp) => ({
        ...exp,
        periodName: file.monthName,
        periodId: file.id,
        isCurrentPeriod: isCurrent,
      }))
    );
  }, [allAvailablePeriods]);

  // Frequent suggestion tags
  const popularKeywords = useMemo(() => {
    const counts: Record<string, number> = {};
    allCrossPeriodExpenses.forEach((e) => {
      const words = e.title.trim().split(/\s+/);
      words.forEach((w) => {
        if (w.length >= 3 && !['برای', 'های', 'خرید', 'تومان'].includes(w)) {
          counts[w] = (counts[w] || 0) + 1;
        }
      });
      if (e.budgetName) {
        counts[e.budgetName] = (counts[e.budgetName] || 0) + 2;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word]) => word);
  }, [allCrossPeriodExpenses]);

  // Cross-period search statistics calculation
  const searchStatistics = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return null;

    const matched = allCrossPeriodExpenses.filter(
      (exp) =>
        exp.title.toLowerCase().includes(q) ||
        (exp.note && exp.note.toLowerCase().includes(q)) ||
        exp.budgetName.toLowerCase().includes(q)
    );

    if (matched.length === 0) {
      return {
        query: q,
        totalAmount: 0,
        count: 0,
        avgPerTransaction: 0,
        maxTransaction: null as any,
        minTransaction: null as any,
        periodBreakdown: [] as any[],
        matchedExpenses: [] as any[],
      };
    }

    const totalAmount = matched.reduce((sum, e) => sum + e.amount, 0);
    const count = matched.length;
    const avgPerTransaction = Math.round(totalAmount / count);

    // Max and min transactions
    const sortedByAmount = [...matched].sort((a, b) => b.amount - a.amount);
    const maxTransaction = sortedByAmount[0];
    const minTransaction = sortedByAmount[sortedByAmount.length - 1];

    // Breakdown per period
    const periodsMap: Record<
      string,
      { periodName: string; isCurrent: boolean; amount: number; count: number; totalMonthExpenses: number }
    > = {};

    allAvailablePeriods.forEach(({ file, isCurrent }) => {
      const summary = calculateMonthSummary(file);
      periodsMap[file.id] = {
        periodName: file.monthName,
        isCurrent,
        amount: 0,
        count: 0,
        totalMonthExpenses: summary.totalExpenses,
      };
    });

    matched.forEach((e) => {
      if (periodsMap[e.periodId]) {
        periodsMap[e.periodId].amount += e.amount;
        periodsMap[e.periodId].count += 1;
      }
    });

    const periodBreakdown = Object.values(periodsMap)
      .filter((p) => p.count > 0)
      .map((p) => ({
        ...p,
        percentageOfMonth:
          p.totalMonthExpenses > 0 ? Math.round((p.amount / p.totalMonthExpenses) * 100) : 0,
      }));

    return {
      query: q,
      totalAmount,
      count,
      avgPerTransaction,
      maxTransaction,
      minTransaction,
      periodBreakdown,
      matchedExpenses: matched,
    };
  }, [globalSearchQuery, allCrossPeriodExpenses, allAvailablePeriods]);

  // Overall financial summary across all periods
  const overallHistoricalSummary = useMemo(() => {
    let totalDeposits = 0;
    let totalExpenses = 0;
    let periodCount = allAvailablePeriods.length;

    allAvailablePeriods.forEach(({ file }) => {
      const sum = calculateMonthSummary(file);
      totalDeposits += sum.totalReceivedDeposits;
      totalExpenses += sum.totalExpenses;
    });

    const netBalance = totalDeposits - totalExpenses;
    const savingsRate =
      totalDeposits > 0 ? Math.round((netBalance / totalDeposits) * 100) : 0;

    return {
      totalDeposits,
      totalExpenses,
      netBalance,
      savingsRate,
      periodCount,
    };
  }, [allAvailablePeriods]);

  // Recharts comparison data across periods
  const comparisonChartData = useMemo(() => {
    return allAvailablePeriods
      .map(({ file, isCurrent }) => {
        const sum = calculateMonthSummary(file);
        return {
          name: isCurrent ? `${file.monthName} (جاری)` : file.monthName,
          واریزی: sum.totalReceivedDeposits,
          مخارج: sum.totalExpenses,
          تراز: sum.netCashflow,
        };
      })
      .reverse(); // chronological order
  }, [allAvailablePeriods]);

  // ----------------------------------------------------
  // RENDER: Detailed View for a Single Period
  // ----------------------------------------------------
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

    // Filter single period expenses
    const filteredPeriodExpenses = selectedArchive.expenses.filter((e) => {
      const matchSearch =
        !singlePeriodSearch.trim() ||
        e.title.toLowerCase().includes(singlePeriodSearch.toLowerCase()) ||
        (e.note && e.note.toLowerCase().includes(singlePeriodSearch.toLowerCase()));
      const matchCat =
        singlePeriodCategory === 'all' || e.budgetId === singlePeriodCategory;
      return matchSearch && matchCat;
    });

    return (
      <div className="space-y-4 pb-8 text-right animate-in fade-in duration-150">
        {/* Top return bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedArchive(null);
              setSinglePeriodSearch('');
              setSinglePeriodCategory('all');
            }}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>بازگشت به آرشیو</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>پرونده مالی مختومه</span>
          </div>
        </div>

        {/* Month Header Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-5 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-indigo-400 font-medium">جزییات پرونده مختومه</span>
              <h2 className="text-xl font-black text-white mt-0.5">{selectedArchive.monthName}</h2>
            </div>
            <div className="text-left text-[11px] text-slate-400">
              <span>{toPersianDigits(selectedArchive.expenses.length)} خرج ثبت‌شده</span>
            </div>
          </div>

          {/* Unified Summary Cards */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">دریافتی محقق‌شده</span>
              <span className="text-xs font-extrabold text-emerald-400 block">
                {formatMoney(summary.totalReceivedDeposits, '')}
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5 block">{currencyUnit}</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">کل مخارج کسرشده</span>
              <span className="text-xs font-extrabold text-rose-400 block">
                {formatMoney(summary.totalExpenses, '')}
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5 block">{currencyUnit}</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">تراز نهایی ماه</span>
              <span
                className={`text-xs font-extrabold block ${
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

        {/* Budgets Performance in this archived month */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>وضعیت سرفصل‌های بودجه در این دوره</span>
            </h3>
            <span className="text-[10px] text-slate-500">
              {toPersianDigits(selectedArchive.budgets.length)} سرفصل
            </span>
          </div>

          <div className="space-y-2">
            {selectedArchive.budgets.map((b) => {
              const { spent, remaining, percentage, isOverBudget } = getBudgetCalculations(
                b,
                selectedArchive.expenses
              );
              return (
                <div
                  key={b.id}
                  className="bg-slate-900/80 border border-slate-800/90 p-3.5 rounded-2xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                      <div>
                        <h4 className="text-xs font-bold text-white">{b.title}</h4>
                        <span className="text-[10px] text-slate-400">
                          سقف: {formatMoney(b.allocatedAmount, currencyUnit)}
                        </span>
                      </div>
                    </div>

                    <div className="text-left text-xs">
                      <span className="text-rose-400 font-bold block">
                        خرج: {formatMoney(spent, '')}
                      </span>
                      <span
                        className={`text-[10px] font-semibold block ${
                          isOverBudget ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {isOverBudget ? 'کسری سقف: -' : 'مانده: '}
                        {formatMoney(Math.abs(remaining), currencyUnit)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOverBudget ? 'bg-rose-500' : percentage > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deposits in this archived month with Expected Arrival Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span>واریزی‌ها و زمان‌بندی این دوره</span>
            </h3>
            <span className="text-[10px] text-slate-500">
              {toPersianDigits(selectedArchive.deposits.length)} مورد
            </span>
          </div>

          <div className="space-y-1.5">
            {selectedArchive.deposits.map((d) => (
              <div
                key={d.id}
                className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2
                    className={`w-4 h-4 ${d.isReceived ? 'text-emerald-400' : 'text-slate-600'}`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{d.title}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400">
                        {d.isFixed ? 'ثابت' : 'موردی'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      {(d.expectedDate || d.expectedDay) && (
                        <span className="flex items-center gap-1 text-teal-300">
                          <CalendarClock className="w-3 h-3" />
                          <span>زمان واریزی: {d.expectedDate || `روز ${toPersianDigits(d.expectedDay!)}`}</span>
                        </span>
                      )}
                      {d.isReceived && d.receivedDate && (
                        <span className="text-emerald-400">دریافت: {d.receivedDate}</span>
                      )}
                    </div>
                  </div>
                </div>

                <span className="font-extrabold text-emerald-400">
                  {formatMoney(d.amount, currencyUnit)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses List with Search & Filter within this period */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-rose-400" />
              <span>ریز مخارج ثبت‌شده در این دوره</span>
            </h3>
            <span className="text-[10px] text-slate-500">
              {toPersianDigits(filteredPeriodExpenses.length)} مورد
            </span>
          </div>

          {/* Quick Search within this single period */}
          <div className="relative">
            <input
              type="text"
              value={singlePeriodSearch}
              onChange={(e) => setSinglePeriodSearch(e.target.value)}
              placeholder="جستجو در مخارج این ماه..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            {singlePeriodSearch && (
              <button
                onClick={() => setSinglePeriodSearch('')}
                className="absolute left-2.5 top-2.5 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Itemized Expenses */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {filteredPeriodExpenses.length === 0 ? (
              <div className="text-center py-6 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-xs">
                موردی یافت نشد
              </div>
            ) : (
              filteredPeriodExpenses.map((e) => (
                <div
                  key={e.id}
                  className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-200">{e.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      <span className="text-slate-300 font-medium">{e.budgetName}</span> • {e.date}
                      {e.note ? ` • ${e.note}` : ''}
                    </p>
                  </div>
                  <span className="font-extrabold text-rose-400">
                    -{formatMoney(e.amount, currencyUnit)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Donut Chart if data exists */}
        {donutData.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl mt-2">
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
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Main Archive Overview & Cross-Period Search
  // ----------------------------------------------------
  return (
    <div className="space-y-5 pb-8 text-right">
      {/* Archive Header & Overall Historical Metrics */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/50 p-5 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium">
            <Archive className="w-4 h-4" />
            <span>تاریخچه و مرکز آمار دوره‌ها</span>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold">
            {toPersianDigits(allAvailablePeriods.length)} دوره ثبت شده
          </span>
        </div>

        <h2 className="text-lg font-black text-white">آرشیو دوره‌ها و تحلیل آماری</h2>
        <p className="text-xs text-slate-400 mt-1 leading-5">
          مشاهده پرونده‌های گذشته، بررسی جزییات عملکرد هر ماه و استخراج آمار هزینه‌ها در تمامی دوره‌ها.
        </p>

        {/* Historical Aggregates */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 text-center">
            <span className="text-[9px] text-slate-400 block mb-0.5">کل دریافتی‌های تاریخچه</span>
            <span className="text-xs font-black text-emerald-400 block">
              {formatMoney(overallHistoricalSummary.totalDeposits, '')}
            </span>
            <span className="text-[8px] text-slate-500">{currencyUnit}</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 text-center">
            <span className="text-[9px] text-slate-400 block mb-0.5">کل مخارج تاریخچه</span>
            <span className="text-xs font-black text-rose-400 block">
              {formatMoney(overallHistoricalSummary.totalExpenses, '')}
            </span>
            <span className="text-[8px] text-slate-500">{currencyUnit}</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 text-center">
            <span className="text-[9px] text-slate-400 block mb-0.5">تراز کل انباشته</span>
            <span
              className={`text-xs font-black block ${
                overallHistoricalSummary.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {overallHistoricalSummary.netBalance >= 0 ? '+' : ''}
              {formatMoney(overallHistoricalSummary.netBalance, '')}
            </span>
            <span className="text-[8px] text-slate-500">{currencyUnit}</span>
          </div>
        </div>

        {/* Backup export & import */}
        <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-slate-800/80">
          <button
            onClick={onExportBackup}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>پشتیبان‌گیری (JSON)</span>
          </button>

          <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition active:scale-95">
            <Upload className="w-3.5 h-3.5 text-teal-400" />
            <span>بازیابی فایل پشتیبان</span>
            <input type="file" accept=".json" onChange={onImportBackup} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex p-1 bg-slate-900 rounded-2xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('periods')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition cursor-pointer ${
            activeTab === 'periods'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>پرونده‌ها و جزییات</span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition cursor-pointer ${
            activeTab === 'search'
              ? 'bg-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>آمارگیری بین دوره‌ها</span>
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition cursor-pointer ${
            activeTab === 'comparison'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>مقایسه دوره‌ها</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PERIODS LIST & SELECTION FOR DETAILS */}
      {/* ========================================================= */}
      {activeTab === 'periods' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300">لیست تمامی دوره‌های ثبت‌شده</span>
            <span className="text-[11px] text-slate-500">
              (لمس هر دوره جهت دیدن جزییات کامل)
            </span>
          </div>

          {/* Current Active Month Card (if exists) */}
          {currentFile && (
            <div
              onClick={() => setSelectedArchive(currentFile)}
              className="bg-emerald-950/20 border border-emerald-500/40 hover:border-emerald-500 p-4 rounded-2xl shadow-sm cursor-pointer transition active:scale-[0.99] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white">{currentFile.monthName}</h4>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      دوره فعال جاری
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {toPersianDigits(currentFile.expenses.length)} خرج ثبت‌شده • {toPersianDigits(currentFile.budgets.length)} سرفصل
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-left">
                  <span className="text-xs font-black text-rose-400 block leading-tight">
                    خرج: {formatMoney(calculateMonthSummary(currentFile).totalExpenses, '')}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold block">
                    مشاهده جزییات کامل
                  </span>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          )}

          {/* Archived Periods List */}
          {archives.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 p-6 space-y-2">
              <Archive className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">هنوز دوره مختومه‌ای در آرشیو ثبت نشده است</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-5">
                با اتمام ماه و زدن دکمه «بستن پرونده این ماه» در تب واریزی‌ها، دوره‌ها به عنوان سند مختومه در اینجا ذخیره می‌شوند.
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
                    className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/60 p-4 rounded-2xl shadow-sm cursor-pointer transition active:scale-[0.99] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white">{archive.monthName}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          دریافتی: {formatMoney(sum.totalReceivedDeposits, currencyUnit)}
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
      )}

      {/* ========================================================= */}
      {/* TAB 2: CROSS-PERIOD SEARCH & ANALYTICS */}
      {/* ========================================================= */}
      {activeTab === 'search' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Search Box */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-teal-400" />
                <span>جستجو و تحلیل آماری یک مورد در بین دوره‌ها</span>
              </label>
              <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCurrentMonth}
                  onChange={(e) => setIncludeCurrentMonth(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-teal-500 bg-slate-950 border-slate-700"
                />
                <span>شامل ماه جاری</span>
              </label>
            </div>

            <div className="relative">
              <input
                type="text"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder="عنوان خرج، کلمه یا سرفصل (مثلاً: بنزین، سوپرمارکت، اجاره...)"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pr-10 pl-9 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 shadow-inner"
                autoFocus
              />
              <Search className="w-4 h-4 text-teal-400 absolute right-3.5 top-3" />
              {globalSearchQuery && (
                <button
                  onClick={() => setGlobalSearchQuery('')}
                  className="absolute left-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Popular quick chips */}
            {popularKeywords.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-500">پیشنهادات پرتکرار:</span>
                {popularKeywords.map((kw) => (
                  <button
                    key={kw}
                    onClick={() => setGlobalSearchQuery(kw)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                      globalSearchQuery === kw
                        ? 'bg-teal-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Results / Detailed Statistics */}
          {searchStatistics ? (
            searchStatistics.count === 0 ? (
              <div className="text-center py-10 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 p-5 space-y-1.5">
                <Search className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-300">
                  هیچ موردی با عبارت «{searchStatistics.query}» در دوره‌ها یافت نشد
                </p>
                <p className="text-[11px] text-slate-500">
                  کلمه دیگری را جستجو کنید یا املای آن را بررسی نمایید.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats Highlights Cards */}
                <div className="bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-900 border border-teal-500/30 p-4 rounded-3xl shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>نتیجه آمارگیری برای: «{searchStatistics.query}»</span>
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300">
                      {toPersianDigits(searchStatistics.count)} تراکنش پیدا شد
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-right">
                    <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-0.5">مجموع هزینه‌شده</span>
                      <span className="text-sm font-black text-teal-300 block">
                        {formatMoney(searchStatistics.totalAmount, currencyUnit)}
                      </span>
                    </div>

                    <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-0.5">میانگین هر پرداخت</span>
                      <span className="text-sm font-black text-indigo-300 block">
                        {formatMoney(searchStatistics.avgPerTransaction, currencyUnit)}
                      </span>
                    </div>
                  </div>

                  {/* Max & Min Highlights */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {searchStatistics.maxTransaction && (
                      <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">بیشترین پرداخت:</span>
                        <span className="font-extrabold text-rose-400">
                          {formatMoney(searchStatistics.maxTransaction.amount, currencyUnit)}
                        </span>
                        <span className="text-[9px] text-slate-500 block truncate mt-0.5">
                          {searchStatistics.maxTransaction.periodName} ({searchStatistics.maxTransaction.date})
                        </span>
                      </div>
                    )}

                    {searchStatistics.minTransaction && (
                      <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">کمترین پرداخت:</span>
                        <span className="font-extrabold text-emerald-400">
                          {formatMoney(searchStatistics.minTransaction.amount, currencyUnit)}
                        </span>
                        <span className="text-[9px] text-slate-500 block truncate mt-0.5">
                          {searchStatistics.minTransaction.periodName} ({searchStatistics.minTransaction.date})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Period by Period Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 px-1 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
                    <span>تفکیک هزینه «{searchStatistics.query}» به تفکیک دوره‌ها</span>
                  </h4>

                  <div className="space-y-1.5">
                    {searchStatistics.periodBreakdown.map((pb) => (
                      <div
                        key={pb.periodName}
                        className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{pb.periodName}</span>
                            {pb.isCurrent && (
                              <span className="text-[8px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                جاری
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {toPersianDigits(pb.count)} بار ثبت • سهم {toPersianDigits(pb.percentageOfMonth)}٪ از کل مخارج این ماه
                          </p>
                        </div>

                        <span className="font-black text-rose-400">
                          {formatMoney(pb.amount, currencyUnit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Itemized Matched Expenses */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 px-1 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    <span>ریز تمام موارد منطبق شده ({toPersianDigits(searchStatistics.matchedExpenses.length)} تراکنش)</span>
                  </h4>

                  <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                    {searchStatistics.matchedExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="bg-slate-900/60 border border-slate-800/90 p-3 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-200">{exp.title}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="text-teal-400 font-semibold">{exp.periodName}</span>
                            <span>•</span>
                            <span>{exp.budgetName}</span>
                            <span>•</span>
                            <span>{exp.date}</span>
                            {exp.note && <span>({exp.note})</span>}
                          </div>
                        </div>

                        <span className="font-black text-rose-400">
                          -{formatMoney(exp.amount, currencyUnit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : (
            /* Search is empty: show general insights */
            <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl text-center space-y-3">
              <Calculator className="w-8 h-8 text-teal-400/80 mx-auto" />
              <div>
                <h4 className="text-xs font-bold text-white">تحلیلگر آماری دوره‌های مالی</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 leading-5">
                  کافیست در کادر بالا هر موضوعی مانند <strong>«بنزین»</strong>، <strong>«سوپرمارکت»</strong>، <strong>«اجاره»</strong> یا <strong>«پزشک»</strong> را تایپ کنید تا مجموع مبالغ پرداختی، میانگین، بالاترین هزینه و تفکیک ماهانه آن را در تمام دوره‌ها استخراج کند.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CROSS-PERIOD TRENDS & COMPARISON */}
      {/* ========================================================= */}
      {activeTab === 'comparison' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl shadow-lg space-y-4">
            <div>
              <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>روند مقایسه‌ای دوره‌ها (درآمد در مقابل مخارج)</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">مقایسه عملکرد مالی ماه‌های ثبت‌شده</p>
            </div>

            {comparisonChartData.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                داده‌ای برای نمایش مقایسه وجود ندارد
              </div>
            ) : (
              <div style={{ width: '100%', height: 260 }} className="dir-ltr select-none">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-right text-xs dir-rtl space-y-1">
                              <span className="font-bold text-white block pb-1 border-b border-slate-800">
                                {data.name}
                              </span>
                              <div className="flex justify-between gap-4 text-emerald-400 font-medium">
                                <span>دریافتی:</span>
                                <span>{formatMoney(data.واریزی, currencyUnit)}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-rose-400 font-medium">
                                <span>مخارج:</span>
                                <span>{formatMoney(data.مخارج, currencyUnit)}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300 font-medium pt-1 border-t border-slate-800">
                                <span>تراز:</span>
                                <span className={data.تراز >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {formatMoney(data.تراز, currencyUnit)}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="واریزی" name="واریزی" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="مخارج" name="مخارج" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
                <span>دریافتی محقق‌شده</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded-md bg-rose-500 shrink-0" />
                <span>کل مخارج کسرشده</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
