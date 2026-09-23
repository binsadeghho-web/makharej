import React, { useState } from 'react';
import { Budget, Expense, MonthSummary } from '../types/finance';
import { getBudgetCalculations } from '../services/storage';
import { formatMoney, toPersianDigits } from '../utils/shamsi';
import { BudgetDonutChart } from './BudgetDonutChart';
import {
  PieChart,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Receipt,
  Calendar,
  Clock,
  CheckCircle2,
  ListOrdered,
  X,
} from 'lucide-react';

interface BudgetsSectionProps {
  budgets: Budget[];
  expenses: Expense[];
  summary: MonthSummary;
  monthName: string;
  onAddBudget: (budget: Omit<Budget, 'id'>) => void;
  onUpdateBudget: (budget: Budget) => void;
  onDeleteBudget: (budgetId: string) => void;
  onQuickAddExpenseForBudget: (budgetId: string) => void;
  onDeleteExpense?: (expenseId: string) => void;
  currencyUnit?: string;
}

const PRESET_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#6366f1', // indigo
];

export const BudgetsSection: React.FC<BudgetsSectionProps> = ({
  budgets,
  expenses,
  summary,
  monthName,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
  onQuickAddExpenseForBudget,
  onDeleteExpense,
  currencyUnit = 'تومان',
}) => {
  const [chartMode, setChartMode] = useState<'expenses' | 'allocated'>('expenses');
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);

  // Form states for adding/editing
  const [formTitle, setFormTitle] = useState('');
  const [formAmountStr, setFormAmountStr] = useState('');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);

  const openAddModal = () => {
    setEditingBudget(null);
    setFormTitle('');
    setFormAmountStr('');
    setFormColor(PRESET_COLORS[budgets.length % PRESET_COLORS.length]);
    setShowAddBudgetModal(true);
  };

  const openEditModal = (b: Budget) => {
    setEditingBudget(b);
    setFormTitle(b.title);
    setFormAmountStr(String(b.allocatedAmount));
    setFormColor(b.color);
    setShowAddBudgetModal(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formAmountStr.replace(/,/g, '')) || 0;
    if (!formTitle.trim() || amount <= 0) return;

    if (editingBudget) {
      onUpdateBudget({
        ...editingBudget,
        title: formTitle.trim(),
        allocatedAmount: amount,
        color: formColor,
      });
    } else {
      onAddBudget({
        title: formTitle.trim(),
        allocatedAmount: amount,
        color: formColor,
      });
    }
    setShowAddBudgetModal(false);
  };

  const toggleExpand = (budgetId: string) => {
    setExpandedBudgetId((prev) => (prev === budgetId ? null : budgetId));
  };

  // Prepare Donut Chart Data
  const donutData =
    chartMode === 'expenses'
      ? budgets
          .map((b) => {
            const { spent } = getBudgetCalculations(b, expenses);
            return {
              id: b.id,
              title: b.title,
              amount: spent,
              color: b.color,
              percentage: summary.totalExpenses > 0 ? (spent / summary.totalExpenses) * 100 : 0,
            };
          })
          .filter((item) => item.amount > 0)
      : budgets.map((b) => {
          return {
            id: b.id,
            title: b.title,
            amount: b.allocatedAmount,
            color: b.color,
            percentage:
              summary.totalBudgetAllocated > 0
                ? (b.allocatedAmount / summary.totalBudgetAllocated) * 100
                : 0,
          };
        });

  const chartTotal = chartMode === 'expenses' ? summary.totalExpenses : summary.totalBudgetAllocated;
  const chartTitle = chartMode === 'expenses' ? 'کل مخارج ثبت شده' : 'کل سقف بودجه‌ها';

  return (
    <div className="space-y-5 pb-8 text-right">
      {/* Top Banner KPI */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] font-medium text-teal-400">بخش دوم: بودجه‌بندی و تفکیک</span>
            <h2 className="text-xl font-black text-white mt-0.5">وضعیت تفکیکی بودجه‌های {monthName}</h2>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold hover:bg-teal-500/25 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>بودجه جدید</span>
          </button>
        </div>

        {/* 3 Main Numbers */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">بودجه کل مصوب</span>
            <span className="text-xs font-extrabold text-white block">
              {formatMoney(summary.totalBudgetAllocated, '')}
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5 block">{currencyUnit}</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">کل مبلغ کسر شده</span>
            <span className="text-xs font-extrabold text-rose-400 block">
              {formatMoney(summary.totalExpenses, '')}
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5 block">{currencyUnit}</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">مانده کل آزاد</span>
            <span
              className={`text-xs font-extrabold block ${
                summary.remainingBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatMoney(summary.remainingBudget, '')}
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5 block">{currencyUnit}</span>
          </div>
        </div>
      </div>

      {/* Interactive Pie / Donut Chart */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">نمودار دایره‌ای بودجه و مخارج</h3>
          </div>

          {/* Chart Toggle */}
          <div className="flex p-0.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
            <button
              onClick={() => setChartMode('expenses')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                chartMode === 'expenses'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              خرج‌های واقعی
            </button>
            <button
              onClick={() => setChartMode('allocated')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                chartMode === 'allocated'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              سهم سقف بودجه
            </button>
          </div>
        </div>

        <BudgetDonutChart
          data={donutData}
          totalAmount={chartTotal}
          centerSubtitle={chartTitle}
          unit={currencyUnit}
        />
      </div>

      {/* Detailed Budget Breakdown Section (تفکیک بودجه‌ها: چقدر کسر شده و چقدر مانده) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-bold text-white">گزارش تفکیکی هر بودجه (کسر شده و مانده)</h3>
            <p className="text-[10px] text-slate-400">لمس هر بودجه برای مشاهده لیست اقلام کسر شده</p>
          </div>
          <span className="text-[11px] text-teal-400 font-bold">
            {toPersianDigits(budgets.length)} سرفصل بودجه
          </span>
        </div>

        {budgets.map((budget) => {
          const { spent, remaining, percentage, isOverBudget, overAmount } = getBudgetCalculations(
            budget,
            expenses
          );
          const budgetExpenses = expenses.filter((e) => e.budgetId === budget.id);
          const isExpanded = expandedBudgetId === budget.id;

          return (
            <div
              key={budget.id}
              className="bg-slate-900/90 border border-slate-800/80 rounded-3xl shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-700"
            >
              {/* Card Header & Controls */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: budget.color }}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white">{budget.title}</h4>
                      <span className="text-[10px] text-slate-400">
                        {isOverBudget ? (
                          <span className="text-rose-400 font-bold">
                            تجاوز از سقف: {formatMoney(overAmount, currencyUnit)}
                          </span>
                        ) : (
                          <span>{toPersianDigits(percentage.toFixed(0))}٪ از این بودجه کسر گردیده</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onQuickAddExpenseForBudget(budget.id)}
                      title="ثبت خرج برای این بودجه"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ثبت خرج</span>
                    </button>

                    <button
                      onClick={() => openEditModal(budget)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="ویرایش بودجه"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteBudget(budget.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                      title="حذف بودجه"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Visual Consumption Bar */}
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOverBudget
                        ? 'bg-rose-500'
                        : percentage > 85
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: !isOverBudget ? budget.color : undefined,
                    }}
                  />
                </div>

                {/* Clear 3-Box Breakdown: چقدر بوده، چقدر کسر شده، چقدر مانده */}
                <div className="grid grid-cols-3 gap-2 text-right">
                  {/* 1. Original Budget */}
                  <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block mb-0.5 font-medium">بودجه مصوب:</span>
                    <span className="text-xs font-bold text-slate-200 block">
                      {formatMoney(budget.allocatedAmount, '')}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">{currencyUnit}</span>
                  </div>

                  {/* 2. Amount Deducted / Spent */}
                  <div className="bg-rose-950/20 p-2.5 rounded-2xl border border-rose-500/30">
                    <span className="text-[10px] text-rose-300/80 block mb-0.5 font-medium">کسر شده:</span>
                    <span className="text-xs font-extrabold text-rose-400 block">
                      {spent > 0 ? `-${formatMoney(spent, '')}` : '۰'}
                    </span>
                    <span className="text-[9px] text-rose-400/60 mt-0.5 block">{currencyUnit}</span>
                  </div>

                  {/* 3. Remaining */}
                  <div
                    className={`p-2.5 rounded-2xl border ${
                      remaining >= 0
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-rose-950/30 border-rose-500/50'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 block mb-0.5 font-medium">مانده بودجه:</span>
                    <span
                      className={`text-xs font-extrabold block ${
                        remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatMoney(remaining, '')}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">
                      {remaining < 0 ? 'کسری سقف!' : currencyUnit}
                    </span>
                  </div>
                </div>

                {/* Accordion Toggle: ریز مخارج کسر شده */}
                <button
                  onClick={() => toggleExpand(budget.id)}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/60 text-xs text-slate-300 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-teal-400" />
                    <span>ریز مخارج کسر شده از این بودجه</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-400 font-bold">
                      {toPersianDigits(budgetExpenses.length)} قلم
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Expanded Itemized Expenses List */}
              {isExpanded && (
                <div className="bg-slate-950/90 border-t border-slate-800/80 p-3.5 space-y-2 animate-in fade-in duration-150">
                  {budgetExpenses.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-xs">
                      هنوز هیچ خرجی از این بودجه کسر نشده است (تمام سقف دست‌نخورده باقی مانده).
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {budgetExpenses.map((exp) => (
                        <div
                          key={exp.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs"
                        >
                          <div className="space-y-0.5">
                            <p className="font-bold text-white text-xs">{exp.title}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="flex items-center gap-0.5">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {exp.date}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {exp.time}
                              </span>
                              {exp.note && <span className="text-slate-400">({exp.note})</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-rose-400 text-xs">
                              -{formatMoney(exp.amount, currencyUnit)}
                            </span>
                            {onDeleteExpense && (
                              <button
                                onClick={() => onDeleteExpense(exp.id)}
                                title="حذف این خرج و بازگشت وجه به بودجه"
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit Budget Modal */}
      {showAddBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-[32px] sm:rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <button
                onClick={() => setShowAddBudgetModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-bold text-white">
                {editingBudget ? 'ویرایش سرفصل بودجه' : 'تعریف بودجه جدید'}
              </h3>
              <div className="w-6" />
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  عنوان دسته‌بندی بودجه
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: خرج‌های روزمره یا سایر هزینه‌ها"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  میزان سقف بودجه تعیین شده ({currencyUnit})
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formAmountStr}
                  onChange={(e) => setFormAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="مثال: ۸۰۰۰۰۰۰"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold text-teal-400 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-left dir-ltr"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">رنگ شاخص در نمودار</label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      className={`w-7 h-7 rounded-full shrink-0 transition-all ${
                        formColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-70'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition"
                >
                  {editingBudget ? 'ذخیره تغییرات' : 'ثبت سرفصل بودجه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
