import React, { useState } from 'react';
import { MonthlyFile, MonthSummary, Deposit } from '../types/finance';
import { formatMoney, toPersianDigits, getCurrentShamsiDate } from '../utils/shamsi';
import {
  CheckCircle2,
  Circle,
  Plus,
  Lock,
  ArrowDownCircle,
  Sparkles,
  Calendar,
  Trash2,
  Edit2,
  X,
  Info,
} from 'lucide-react';

interface DepositsSectionProps {
  currentFile: MonthlyFile;
  summary: MonthSummary;
  onToggleDepositReceived: (depositId: string) => void;
  onAddDeposit: (deposit: Omit<Deposit, 'id' | 'createdAt'>) => void;
  onDeleteDeposit: (depositId: string) => void;
  onOpenCloseMonthModal: () => void;
  currencyUnit?: string;
}

export const DepositsSection: React.FC<DepositsSectionProps> = ({
  currentFile,
  summary,
  onToggleDepositReceived,
  onAddDeposit,
  onDeleteDeposit,
  onOpenCloseMonthModal,
  currencyUnit = 'تومان',
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [depositType, setDepositType] = useState<'fixed' | 'adhoc'>('fixed');
  const [newTitle, setNewTitle] = useState('');
  const [newAmountStr, setNewAmountStr] = useState('');
  const [autoMarkReceived, setAutoMarkReceived] = useState(true);

  const fixedDeposits = currentFile.deposits.filter((d) => d.isFixed);
  const adhocDeposits = currentFile.deposits.filter((d) => !d.isFixed);

  const receivedPercent =
    summary.totalPlannedDeposits > 0
      ? Math.round((summary.totalReceivedDeposits / summary.totalPlannedDeposits) * 100)
      : 0;

  const handleCreateDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newAmountStr.replace(/,/g, '')) || 0;
    if (!newTitle.trim() || amount <= 0) return;

    const now = getCurrentShamsiDate();
    onAddDeposit({
      title: newTitle.trim(),
      amount,
      isFixed: depositType === 'fixed',
      isReceived: autoMarkReceived,
      receivedDate: autoMarkReceived ? now.formatted : undefined,
      receivedTime: autoMarkReceived ? now.timeFormatted : undefined,
    });

    setNewTitle('');
    setNewAmountStr('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Month Header Banner */}
      <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-teal-950/40 p-5 rounded-3xl border border-emerald-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] font-medium text-emerald-400">بخش اول: واریزی‌ها</span>
            <h2 className="text-xl font-black text-white mt-0.5">درآمدهای {currentFile.monthName}</h2>
          </div>
          <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            {toPersianDigits(receivedPercent)}٪ محقق شده
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-4 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(receivedPercent, 100)}%` }}
          />
        </div>

        {/* Cards Row */}
        <div className="grid grid-cols-3 gap-2 text-right">
          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block mb-1">واریز شده</span>
            <span className="text-xs font-extrabold text-emerald-400 block leading-tight">
              {formatMoney(summary.totalReceivedDeposits, '')}
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5 block">{currencyUnit}</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block mb-1">کل پیش‌بینی</span>
            <span className="text-xs font-extrabold text-slate-200 block leading-tight">
              {formatMoney(summary.totalPlannedDeposits, '')}
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5 block">{currencyUnit}</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block mb-1">در انتظار واریز</span>
            <span className="text-xs font-extrabold text-amber-400 block leading-tight">
              {formatMoney(Math.max(0, summary.totalPlannedDeposits - summary.totalReceivedDeposits), '')}
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5 block">{currencyUnit}</span>
          </div>
        </div>
      </div>

      {/* Action to Add Deposit */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-300">لیست واریزی‌های ماه جاری</span>
        <button
          onClick={() => {
            setDepositType('fixed');
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 active:scale-95 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>افزودن واریزی</span>
        </button>
      </div>

      {/* 1. Fixed Deposits List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <span className="font-semibold text-slate-300">واریزی‌های ثابت ماهانه</span>
            <span className="text-[10px] text-slate-500">
              ({toPersianDigits(fixedDeposits.filter((d) => d.isReceived).length)} از{' '}
              {toPersianDigits(fixedDeposits.length)} تیک خورده)
            </span>
          </div>
        </div>

        {fixedDeposits.length === 0 ? (
          <div className="text-center py-6 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-xs">
            هنوز واریزی ثابتی تعریف نشده است
          </div>
        ) : (
          <div className="space-y-2">
            {fixedDeposits.map((deposit) => (
              <div
                key={deposit.id}
                onClick={() => onToggleDepositReceived(deposit.id)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.99] ${
                  deposit.isReceived
                    ? 'bg-emerald-950/25 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      deposit.isReceived
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/40'
                        : 'border-2 border-slate-600 text-transparent hover:border-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>

                  <div>
                    <h4
                      className={`text-xs font-bold transition-all ${
                        deposit.isReceived ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {deposit.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      {deposit.isReceived ? (
                        <span className="text-emerald-400 font-medium">
                          واریز شد {deposit.receivedDate ? `در ${deposit.receivedDate}` : ''}
                        </span>
                      ) : (
                        <span className="text-amber-400/80">در انتظار واریز در طول ماه (لمس کنید تا تیک بخورد)</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <span
                      className={`text-xs font-extrabold ${
                        deposit.isReceived ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      {formatMoney(deposit.amount, '')}
                    </span>
                    <span className="text-[10px] text-slate-500 block">{currencyUnit}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDeposit(deposit.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Ad-hoc / Occasional Deposits List */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-semibold text-slate-300">واریزی‌های موردی و متفرقه</span>
            <span className="text-[10px] text-slate-500">({toPersianDigits(adhocDeposits.length)} مورد)</span>
          </div>
          <button
            onClick={() => {
              setDepositType('adhoc');
              setShowAddModal(true);
            }}
            className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-medium"
          >
            <Plus className="w-3 h-3" />
            <span>+ واریزی موردی</span>
          </button>
        </div>

        {adhocDeposits.length === 0 ? (
          <div className="text-center py-4 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800/80 text-slate-500 text-xs">
            واریزی موردی ثبت نشده است (در صورت دریافت درآمد اتفاقی، پاداش یا هدیه آن را ثبت کنید)
          </div>
        ) : (
          <div className="space-y-2">
            {adhocDeposits.map((deposit) => (
              <div
                key={deposit.id}
                onClick={() => onToggleDepositReceived(deposit.id)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.99] ${
                  deposit.isReceived
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      deposit.isReceived
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40'
                        : 'border-2 border-slate-600 text-transparent'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white">{deposit.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {deposit.isReceived ? (
                        <span className="text-amber-400">واریز شده {deposit.receivedDate ? `در ${deposit.receivedDate}` : ''}</span>
                      ) : (
                        <span className="text-slate-500">ثبت شده - لمس جهت تیک خوردن</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <span className="text-xs font-extrabold text-amber-300">
                      {formatMoney(deposit.amount, '')}
                    </span>
                    <span className="text-[10px] text-slate-500 block">{currencyUnit}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDeposit(deposit.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Close Month Prominent Action */}
      <div className="pt-4">
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/20 rounded-3xl p-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-bold">
            <Lock className="w-4 h-4" />
            <span>پایان دوره و بایگانی پرونده</span>
          </div>
          <p className="text-xs text-slate-300 leading-5">
            وقتی ماه شمسی به پایان رسید، با زدن دکمه زیر پرونده {currentFile.monthName} بسته، جمع‌بندی و در آرشیو قفل
            می‌شود و پرونده ماه جدید آماده می‌گردد.
          </p>
          <button
            onClick={onOpenCloseMonthModal}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>بستن پرونده این ماه و بایگانی</span>
          </button>
        </div>
      </div>

      {/* Add Deposit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-[32px] sm:rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-bold text-white">
                {depositType === 'fixed' ? 'افزودن واریزی ثابت' : 'ثبت واریزی موردی'}
              </h3>
              <div className="w-6" />
            </div>

            <form onSubmit={handleCreateDeposit} className="space-y-4">
              {/* Type Switcher */}
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDepositType('fixed')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                    depositType === 'fixed'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  واریزی ثابت ماهانه
                </button>
                <button
                  type="button"
                  onClick={() => setDepositType('adhoc')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                    depositType === 'adhoc'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  واریزی موردی / متفرقه
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان واریزی</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={depositType === 'fixed' ? 'مثال: حقوق شرکت' : 'مثال: پاداش پایان سال'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  مبلغ واریزی ({currencyUnit})
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newAmountStr}
                  onChange={(e) => setNewAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="مثال: ۲۵۰۰۰۰۰۰"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-left dir-ltr"
                />
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoMarkReceived}
                    onChange={(e) => setAutoMarkReceived(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs text-slate-300">
                    هم‌اکنون واریز شده و تیک خورده ثبت شود
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                >
                  افزودن و ثبت واریزی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
