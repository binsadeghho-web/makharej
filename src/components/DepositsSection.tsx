import React, { useState, useMemo } from 'react';
import { MonthlyFile, MonthSummary, Deposit } from '../types/finance';
import { formatMoney, toPersianDigits, getCurrentShamsiDate } from '../utils/shamsi';
import {
  CheckCircle2,
  Circle,
  Plus,
  Lock,
  Calendar,
  CalendarClock,
  Clock,
  Trash2,
  Edit2,
  ArrowUpDown,
  ArrowDownUp,
  X,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';

interface DepositsSectionProps {
  currentFile: MonthlyFile;
  summary: MonthSummary;
  onToggleDepositReceived: (depositId: string) => void;
  onAddDeposit: (deposit: Omit<Deposit, 'id' | 'createdAt'>) => void;
  onUpdateDeposit?: (deposit: Deposit) => void;
  onDeleteDeposit: (depositId: string) => void;
  onOpenCloseMonthModal: () => void;
  currencyUnit?: string;
}

const PRESET_DAYS = [1, 5, 10, 15, 20, 25, 28, 30];

export const DepositsSection: React.FC<DepositsSectionProps> = ({
  currentFile,
  summary,
  onToggleDepositReceived,
  onAddDeposit,
  onUpdateDeposit,
  onDeleteDeposit,
  onOpenCloseMonthModal,
  currencyUnit = 'تومان',
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null);

  // Sorting state: 'none' | 'asc' | 'desc'
  const [sortTimeMode, setSortTimeMode] = useState<'none' | 'asc' | 'desc'>('none');

  // Form states
  const [depositType, setDepositType] = useState<'fixed' | 'adhoc'>('fixed');
  const [formTitle, setFormTitle] = useState('');
  const [formAmountStr, setFormAmountStr] = useState('');
  const [formExpectedDay, setFormExpectedDay] = useState<number | undefined>(25);
  const [formCustomDateText, setFormCustomDateText] = useState('');
  const [autoMarkReceived, setAutoMarkReceived] = useState(false);

  // Open modal for creation
  const handleOpenAdd = (type: 'fixed' | 'adhoc') => {
    setEditingDeposit(null);
    setDepositType(type);
    setFormTitle('');
    setFormAmountStr('');
    setFormExpectedDay(type === 'fixed' ? 25 : undefined);
    setFormCustomDateText('');
    setAutoMarkReceived(false);
    setShowAddModal(true);
  };

  // Open modal for editing
  const handleOpenEdit = (deposit: Deposit, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDeposit(deposit);
    setDepositType(deposit.isFixed ? 'fixed' : 'adhoc');
    setFormTitle(deposit.title);
    setFormAmountStr(String(deposit.amount));
    setFormExpectedDay(deposit.expectedDay);
    setFormCustomDateText(deposit.expectedDate || '');
    setAutoMarkReceived(deposit.isReceived);
    setShowAddModal(true);
  };

  // Cycle sort mode
  const handleToggleSort = () => {
    setSortTimeMode((prev) => {
      if (prev === 'none') return 'asc';
      if (prev === 'asc') return 'desc';
      return 'none';
    });
  };

  // Helper to extract day number for sorting
  const getSortDay = (d: Deposit): number => {
    if (typeof d.expectedDay === 'number' && !isNaN(d.expectedDay) && d.expectedDay > 0) {
      return d.expectedDay;
    }
    if (d.expectedDate) {
      const match = d.expectedDate.match(/\d+/);
      if (match) return parseInt(match[0], 10);
    }
    return 999; // Items without specified time go to the bottom
  };

  // Apply sorting if requested
  const sortDeposits = (list: Deposit[]): Deposit[] => {
    if (sortTimeMode === 'none') return list;
    return [...list].sort((a, b) => {
      const dayA = getSortDay(a);
      const dayB = getSortDay(b);
      if (dayA === dayB) return 0;
      return sortTimeMode === 'asc' ? dayA - dayB : dayB - dayA;
    });
  };

  const fixedDeposits = useMemo(() => {
    const list = currentFile.deposits.filter((d) => d.isFixed);
    return sortDeposits(list);
  }, [currentFile.deposits, sortTimeMode]);

  const adhocDeposits = useMemo(() => {
    const list = currentFile.deposits.filter((d) => !d.isFixed);
    return sortDeposits(list);
  }, [currentFile.deposits, sortTimeMode]);

  const receivedPercent =
    summary.totalPlannedDeposits > 0
      ? Math.round((summary.totalReceivedDeposits / summary.totalPlannedDeposits) * 100)
      : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formAmountStr.replace(/,/g, '')) || 0;
    if (!formTitle.trim() || amount <= 0) return;

    const now = getCurrentShamsiDate();

    let finalExpectedDate = formCustomDateText.trim();
    if (!finalExpectedDate && formExpectedDay) {
      finalExpectedDate = `روز ${toPersianDigits(formExpectedDay)} ماه`;
    }

    if (editingDeposit && onUpdateDeposit) {
      onUpdateDeposit({
        ...editingDeposit,
        title: formTitle.trim(),
        amount,
        isFixed: depositType === 'fixed',
        isReceived: autoMarkReceived,
        receivedDate: autoMarkReceived ? (editingDeposit.receivedDate || now.formatted) : undefined,
        receivedTime: autoMarkReceived ? (editingDeposit.receivedTime || now.timeFormatted) : undefined,
        expectedDay: formExpectedDay,
        expectedDate: finalExpectedDate || undefined,
      });
    } else {
      onAddDeposit({
        title: formTitle.trim(),
        amount,
        isFixed: depositType === 'fixed',
        isReceived: autoMarkReceived,
        receivedDate: autoMarkReceived ? now.formatted : undefined,
        receivedTime: autoMarkReceived ? now.timeFormatted : undefined,
        expectedDay: formExpectedDay,
        expectedDate: finalExpectedDate || undefined,
      });
    }

    setShowAddModal(false);
  };

  return (
    <div className="space-y-5 pb-6 text-right">
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

      {/* Action Bar: Sort by Expected Time & Add Deposit */}
      <div className="flex items-center justify-between gap-2 px-1">
        {/* Sort by Expected Deposit Time Button */}
        <button
          onClick={handleToggleSort}
          title="مرتب‌سازی ریز واریزی‌ها بر اساس زمان مورد انتظار واریز"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 cursor-pointer ${
            sortTimeMode === 'asc'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
              : sortTimeMode === 'desc'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-teal-400" />
          <span>
            {sortTimeMode === 'asc'
              ? 'مرتب با زمان (اول تا آخر ماه ↑)'
              : sortTimeMode === 'desc'
              ? 'مرتب با زمان (آخر به اول ماه ↓)'
              : 'مرتب‌سازی براساس زمان واریزی'}
          </span>
        </button>

        {/* Add Deposit Button */}
        <button
          onClick={() => handleOpenAdd('fixed')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>افزودن واریزی</span>
        </button>
      </div>

      {/* Active Sort Notification Banner (if sort is active) */}
      {sortTimeMode !== 'none' && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-300">
          <div className="flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5 text-teal-400" />
            <span>
              واریزی‌ها بر اساس <strong>زمان مورد انتظار برای واریز</strong> ({sortTimeMode === 'asc' ? 'صعودی: روزهای اول تا انتهای ماه' : 'نزولی: روزهای انتهایی تا ابتدای ماه'}) مرتب شده‌اند.
            </span>
          </div>
          <button
            onClick={() => setSortTimeMode('none')}
            className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer shrink-0 mr-2"
          >
            حالت عادی
          </button>
        </div>
      )}

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
            {fixedDeposits.map((deposit) => {
              const displayExpectedTime =
                deposit.expectedDate ||
                (deposit.expectedDay ? `روز ${toPersianDigits(deposit.expectedDay)} ماه` : null);

              return (
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
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
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
                          deposit.isReceived ? 'text-white' : 'text-slate-200'
                        }`}
                      >
                        {deposit.title}
                      </h4>

                      {/* Expected Time Badge & Status */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {displayExpectedTime && (
                          <div
                            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border font-medium ${
                              deposit.isReceived
                                ? 'bg-slate-900/80 border-slate-800 text-slate-400'
                                : 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                            }`}
                          >
                            <CalendarClock className="w-3 h-3 text-teal-400 shrink-0" />
                            <span>زمان واریزی: {displayExpectedTime}</span>
                          </div>
                        )}

                        {deposit.isReceived ? (
                          <span className="text-[10px] text-emerald-400 font-medium">
                            ✓ واریز شد {deposit.receivedDate ? `در ${deposit.receivedDate}` : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400/90 font-medium">
                            در انتظار واریز (لمس کنید تا تیک بخورد)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-left ml-1">
                      <span
                        className={`text-xs font-extrabold ${
                          deposit.isReceived ? 'text-emerald-400' : 'text-slate-200'
                        }`}
                      >
                        {formatMoney(deposit.amount, '')}
                      </span>
                      <span className="text-[10px] text-slate-500 block">{currencyUnit}</span>
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={(e) => handleOpenEdit(deposit, e)}
                      title="ویرایش واریزی و تغییر زمان واریز"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDeposit(deposit.id);
                      }}
                      title="حذف واریزی"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
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

      {/* 2. Ad-hoc / Occasional Deposits List */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-semibold text-slate-300">واریزی‌های موردی و متفرقه</span>
            <span className="text-[10px] text-slate-500">({toPersianDigits(adhocDeposits.length)} مورد)</span>
          </div>
          <button
            onClick={() => handleOpenAdd('adhoc')}
            className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>+ واریزی موردی</span>
          </button>
        </div>

        {adhocDeposits.length === 0 ? (
          <div className="text-center py-4 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800/80 text-slate-500 text-xs">
            واریزی موردی ثبت نشده است (پاداش، هدیه، فروش دارایی و...)
          </div>
        ) : (
          <div className="space-y-2">
            {adhocDeposits.map((deposit) => {
              const displayExpectedTime =
                deposit.expectedDate ||
                (deposit.expectedDay ? `روز ${toPersianDigits(deposit.expectedDay)} ماه` : null);

              return (
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
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
                        deposit.isReceived
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40'
                          : 'border-2 border-slate-600 text-transparent hover:border-slate-400'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white">{deposit.title}</h4>

                      {/* Expected Time Badge & Status */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {displayExpectedTime && (
                          <div
                            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border font-medium ${
                              deposit.isReceived
                                ? 'bg-slate-900/80 border-slate-800 text-slate-400'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            }`}
                          >
                            <CalendarClock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>زمان واریزی: {displayExpectedTime}</span>
                          </div>
                        )}

                        {deposit.isReceived ? (
                          <span className="text-[10px] text-amber-400 font-medium">
                            واریز شد {deposit.receivedDate ? `در ${deposit.receivedDate}` : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            ثبت شده - لمس جهت تیک خوردن
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-left ml-1">
                      <span className="text-xs font-extrabold text-amber-300">
                        {formatMoney(deposit.amount, '')}
                      </span>
                      <span className="text-[10px] text-slate-500 block">{currencyUnit}</span>
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={(e) => handleOpenEdit(deposit, e)}
                      title="ویرایش واریزی و تغییر زمان واریز"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDeposit(deposit.id);
                      }}
                      title="حذف واریزی"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
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
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>بستن پرونده این ماه و بایگانی</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Deposit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-[32px] sm:rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                {editingDeposit ? (
                  <>
                    <Edit2 className="w-4 h-4 text-teal-400" />
                    <span>ویرایش واریزی</span>
                  </>
                ) : depositType === 'fixed' ? (
                  <span>افزودن واریزی ثابت</span>
                ) : (
                  <span>ثبت واریزی موردی</span>
                )}
              </h3>
              <div className="w-6" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDepositType('fixed')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    depositType === 'adhoc'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  واریزی موردی / متفرقه
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان واریزی</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={depositType === 'fixed' ? 'مثال: حقوق شرکت' : 'مثال: پاداش پایان سال'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  مبلغ واریزی ({currencyUnit})
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formAmountStr ? toPersianDigits(Number(formAmountStr).toLocaleString('en-US')) : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setFormAmountStr(raw);
                  }}
                  placeholder="مثال: ۲۵,۰۰۰,۰۰۰"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-left dir-ltr"
                />
              </div>

              {/* زمان واریزی (Expected Deposit Time) */}
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-teal-400" />
                    <span>زمان واریزی (روز مورد انتظار برای واریز)</span>
                  </label>
                  {formExpectedDay && (
                    <span className="text-[11px] font-bold text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
                      روز {toPersianDigits(formExpectedDay)} ماه
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">
                  مشخص کنید این واریزی انتظار می‌رود در چه روزی از ماه انجام شود تا بتوانید بر اساس آن مرتب‌سازی کنید.
                </p>

                {/* Quick Presets for Days */}
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_DAYS.map((day) => {
                    const isSelected = formExpectedDay === day && !formCustomDateText;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setFormExpectedDay(day);
                          setFormCustomDateText('');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        روز {toPersianDigits(day)}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Day Input / Free Text */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">شماره روز دلخواه (۱ تا ۳۱)</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={formExpectedDay || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= 31) {
                          setFormExpectedDay(val);
                        } else if (!e.target.value) {
                          setFormExpectedDay(undefined);
                        }
                      }}
                      placeholder="مثال: ۲۵"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-center text-teal-300 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">یا عنوان سفارشی زمان</label>
                    <input
                      type="text"
                      value={formCustomDateText}
                      onChange={(e) => setFormCustomDateText(e.target.value)}
                      placeholder="مثال: آخر ماه / هفته دوم"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-right text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Mark as Received Toggle */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoMarkReceived}
                    onChange={(e) => setAutoMarkReceived(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300">
                    هم‌اکنون واریز شده و تیک خورده ثبت شود
                  </span>
                </label>
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {editingDeposit ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>ذخیره تغییرات و زمان واریزی</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>افزودن و ثبت واریزی</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
