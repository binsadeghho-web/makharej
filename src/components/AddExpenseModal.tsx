import React, { useState, useEffect } from 'react';
import { Budget, Expense } from '../types/finance';
import { getCurrentShamsiDate, formatMoney, toPersianDigits, toEnglishDigits } from '../utils/shamsi';
import { X, Calendar, Clock, Check, AlertCircle, Plus, Edit3 } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgets: Budget[];
  allExpenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'timestamp'>) => void;
  onUpdateExpense?: (expense: Expense) => void;
  editingExpense?: Expense | null;
  defaultBudgetId?: string;
  currencyUnit?: string;
}

const QUICK_TITLES = [
  'خرید سوپرمارکت',
  'نانوایی و میوه',
  'بنزین و سوخت',
  'کرایه تاکسی / اسنپ',
  'رستوران و کافه',
  'دارو و درمان',
  'قبوض و شارژ',
  'خرید پوشاک',
  'اینترنت و بسته',
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  budgets,
  allExpenses,
  onAddExpense,
  onUpdateExpense,
  editingExpense,
  defaultBudgetId,
  currencyUnit = 'تومان',
}) => {
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(editingExpense);

  // Initialize form based on whether we are editing or creating a new expense
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (editingExpense) {
        // Editing existing expense
        setTitle(editingExpense.title || '');
        setAmountStr(String(editingExpense.amount || ''));
        setSelectedBudgetId(editingExpense.budgetId || budgets[0]?.id || '');
        setDateStr(editingExpense.date || '');
        setTimeStr(editingExpense.time || '');
        setNote(editingExpense.note || '');
      } else {
        // Creating new expense
        const now = getCurrentShamsiDate();
        setDateStr(now.formatted);
        setTimeStr(now.timeFormatted);
        setTitle('');
        setAmountStr('');
        setNote('');
        if (defaultBudgetId) {
          setSelectedBudgetId(defaultBudgetId);
        } else if (budgets.length > 0) {
          setSelectedBudgetId(budgets[0].id);
        }
      }
    }
  }, [isOpen, editingExpense, defaultBudgetId, budgets]);

  if (!isOpen) return null;

  const rawAmount = parseFloat(toEnglishDigits(amountStr).replace(/,/g, '')) || 0;

  // Find remaining balance of chosen budget
  // Note: If editing, deduct the previous expense amount from current spent calculation
  const selectedBudget = budgets.find((b) => b.id === selectedBudgetId);
  const previousExpenseAmountInThisBudget =
    isEditing && editingExpense && editingExpense.budgetId === selectedBudgetId
      ? editingExpense.amount
      : 0;

  const totalSpentInSelected = selectedBudget
    ? allExpenses.filter((e) => e.budgetId === selectedBudget.id).reduce((sum, e) => sum + e.amount, 0)
    : 0;

  // Available balance before this new / edited amount is applied
  const availableBefore = selectedBudget
    ? selectedBudget.allocatedAmount - (totalSpentInSelected - previousExpenseAmountInThisBudget)
    : 0;

  const newRemainingAfterExpense = availableBefore - rawAmount;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = toEnglishDigits(e.target.value).replace(/[^0-9]/g, '');
    setAmountStr(val);
  };

  const addQuickAmount = (addition: number) => {
    const current = parseFloat(toEnglishDigits(amountStr).replace(/,/g, '')) || 0;
    setAmountStr(String(current + addition));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('لطفاً عنوان خرج را وارد کنید');
      return;
    }
    if (rawAmount <= 0) {
      setError('لطفاً مبلغ خرج را مشخص کنید');
      return;
    }
    if (!selectedBudgetId) {
      setError('لطفاً بودجه مربوطه را انتخاب کنید');
      return;
    }

    const budget = budgets.find((b) => b.id === selectedBudgetId);
    const budgetName = budget ? budget.title : 'سایر';

    if (isEditing && editingExpense && onUpdateExpense) {
      onUpdateExpense({
        ...editingExpense,
        title: title.trim(),
        amount: rawAmount,
        budgetId: selectedBudgetId,
        budgetName,
        date: dateStr.trim() || editingExpense.date,
        time: timeStr.trim() || editingExpense.time,
        note: note.trim() ? note.trim() : undefined,
      });
    } else {
      onAddExpense({
        title: title.trim(),
        amount: rawAmount,
        budgetId: selectedBudgetId,
        budgetName,
        date: dateStr.trim() || getCurrentShamsiDate().formatted,
        time: timeStr.trim() || getCurrentShamsiDate().timeFormatted,
        note: note.trim() ? note.trim() : undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-t-[32px] sm:rounded-3xl bg-slate-900 border border-slate-800 text-right overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800/80 shrink-0">
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
              {isEditing ? (
                <>
                  <Edit3 className="w-4 h-4 text-emerald-400" />
                  <span>ویرایش خرج ثبت‌شده</span>
                </>
              ) : (
                <span>ثبت مخارج جدید</span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {isEditing ? 'تغییر مبلغ، سرفصل بودجه یا مشخصات خرج' : 'کسر مستقیم و آنی از بودجه انتخاب شده'}
            </p>
          </div>
          <div className="w-9" />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              مبلغ خرج ({currencyUnit}) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amountStr ? toPersianDigits(Number(amountStr).toLocaleString('en-US')) : ''}
                onChange={handleAmountChange}
                placeholder="مثال: ۲۵۰,۰۰۰"
                className="w-full text-2xl font-bold bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3.5 text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition text-left dir-ltr"
                autoFocus={!isEditing}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
                {currencyUnit}
              </span>
            </div>

            {/* Fast Quick-Add Amount Buttons */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              {[50000, 100000, 250000, 500000, 1000000].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => addQuickAmount(quick)}
                  className="shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95"
                >
                  +{formatMoney(quick, '')}
                </button>
              ))}
            </div>
          </div>

          {/* Title input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              عنوان خرج <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: خرید مواد غذایی هفتگی"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
            />

            {/* Quick title suggestions */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              {QUICK_TITLES.map((qTitle) => (
                <button
                  key={qTitle}
                  type="button"
                  onClick={() => setTitle(qTitle)}
                  className="shrink-0 px-2 py-1 text-[11px] rounded-lg bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                >
                  {qTitle}
                </button>
              ))}
            </div>
          </div>

          {/* Budget dropdown selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              از کدام بودجه کسر شود؟ <span className="text-rose-400">*</span>
            </label>
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                {budgets.map((b) => {
                  const isSelected = selectedBudgetId === b.id;
                  const bPrevAmount =
                    isEditing && editingExpense && editingExpense.budgetId === b.id
                      ? editingExpense.amount
                      : 0;
                  const bSpent = allExpenses
                    .filter((e) => e.budgetId === b.id)
                    .reduce((sum, e) => sum + e.amount, 0);
                  const bAvailable = b.allocatedAmount - (bSpent - bPrevAmount);

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBudgetId(b.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-right transition-all ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: b.color }}
                        />
                        <div>
                          <p className="text-xs font-bold text-white">{b.title}</p>
                          <p className="text-[10px] text-slate-400">
                            مانده قبل از این خرج:{' '}
                            <span
                              className={bAvailable < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}
                            >
                              {formatMoney(bAvailable, currencyUnit)}
                            </span>
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {selectedBudget && rawAmount > 0 && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    newRemainingAfterExpense < 0
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}
                >
                  <span>مانده بودجه پس از این خرج:</span>
                  <span className="font-bold">
                    {formatMoney(newRemainingAfterExpense, currencyUnit)}
                    {newRemainingAfterExpense < 0 && ' (کسری سقف!)'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>تاریخ شمسی</span>
              </label>
              <input
                type="text"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 text-center focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>ساعت ثبت</span>
              </label>
              <input
                type="text"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 text-center focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">یادداشت اختیاری</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: خرید برای مهمانی"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isEditing ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>ذخیره تغییرات خرج</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>ثبت خرج و کسر از بودجه</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
