import React, { useState } from 'react';
import { Expense, Budget } from '../types/finance';
import { formatMoney, toPersianDigits } from '../utils/shamsi';
import {
  Receipt,
  Plus,
  Search,
  Calendar,
  Clock,
  Trash2,
  Filter,
  Tag,
  ArrowUpRight,
} from 'lucide-react';

interface ExpensesSectionProps {
  expenses: Expense[];
  budgets: Budget[];
  monthName: string;
  totalExpenses: number;
  onOpenAddModal: (defaultBudgetId?: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  currencyUnit?: string;
}

export const ExpensesSection: React.FC<ExpensesSectionProps> = ({
  expenses,
  budgets,
  monthName,
  totalExpenses,
  onOpenAddModal,
  onDeleteExpense,
  currencyUnit = 'تومان',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBudgetFilter, setSelectedBudgetFilter] = useState<string>('all');

  // Filtered expenses
  const filteredExpenses = expenses
    .filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.note && e.note.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesBudget =
        selectedBudgetFilter === 'all' || e.budgetId === selectedBudgetFilter;
      return matchesSearch && matchesBudget;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-4 pb-6 text-right">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-900 p-5 rounded-3xl border border-rose-500/20 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] font-medium text-rose-400">بخش سوم: مخارج</span>
            <h2 className="text-xl font-black text-white mt-0.5">مخارج ثبت‌شده {monthName}</h2>
          </div>
          <button
            onClick={() => onOpenAddModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/30 hover:bg-rose-600 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت خرج جدید</span>
          </button>
        </div>

        <div className="flex items-baseline justify-between bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 mt-3">
          <span className="text-xs text-slate-400">مجموع کل مخارج این ماه:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-rose-400">
              {formatMoney(totalExpenses, '')}
            </span>
            <span className="text-xs text-slate-400">{currencyUnit}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در عنوان خرج یا یادداشت..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition"
          />
        </div>

        {/* Budget Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedBudgetFilter('all')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              selectedBudgetFilter === 'all'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            همه ({toPersianDigits(expenses.length)})
          </button>

          {budgets.map((b) => {
            const count = expenses.filter((e) => e.budgetId === b.id).length;
            const isSelected = selectedBudgetFilter === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBudgetFilter(b.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                  isSelected
                    ? 'bg-slate-800 border-rose-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: b.color }}
                />
                <span>{b.title}</span>
                <span className="text-[10px] opacity-70">({toPersianDigits(count)})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 p-6">
          <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-400">
            {expenses.length === 0
              ? 'هنوز هیچ خرجی برای این ماه ثبت نشده است'
              : 'موردی با این مشخصات یافت نشد'}
          </p>
          <button
            onClick={() => onOpenAddModal()}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>اولین خرج را ثبت کنید</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredExpenses.map((expense) => {
            const budget = budgets.find((b) => b.id === expense.budgetId);
            const budgetColor = budget?.color || '#94a3b8';
            const budgetName = budget?.title || expense.budgetName;

            return (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition group"
              >
                {/* Right: Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: budgetColor }}
                    />
                    <h4 className="text-xs font-bold text-white">{expense.title}</h4>
                  </div>

                  <div className="flex items-center gap-2.5 text-[10px] text-slate-400">
                    <span
                      className="px-2 py-0.5 rounded-md font-medium"
                      style={{
                        backgroundColor: `${budgetColor}20`,
                        color: budgetColor,
                      }}
                    >
                      {budgetName}
                    </span>

                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{expense.date}</span>
                    </span>

                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{expense.time}</span>
                    </span>
                  </div>

                  {expense.note && (
                    <p className="text-[10px] text-slate-400/90 pt-0.5 pr-4 border-r-2 border-slate-700">
                      {expense.note}
                    </p>
                  )}
                </div>

                {/* Left: Amount & Delete */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-left">
                    <span className="text-xs font-black text-rose-400 block leading-tight">
                      -{formatMoney(expense.amount, '')}
                    </span>
                    <span className="text-[9px] text-slate-500 block">{currencyUnit}</span>
                  </div>

                  <button
                    onClick={() => onDeleteExpense(expense.id)}
                    title="حذف این خرج و بازگشت مبلغ به بودجه"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
