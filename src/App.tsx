/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, MonthlyFile, Budget, Deposit, Expense } from './types/finance';
import {
  loadAppState,
  saveAppState,
  saveStateToDatabase,
  loadStateFromDatabase,
  calculateMonthSummary,
  closeAndArchiveCurrentMonth,
  fetchLatestRemoteState,
  saveToIndexedDB,
  DatabaseProvider,
} from './services/storage';
import {
  getStoredSupabaseConfig,
  pushStateToSupabase,
  fetchStateFromSupabase,
  subscribeToSupabaseChanges,
} from './services/supabase';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { DepositsSection } from './components/DepositsSection';
import { BudgetsSection } from './components/BudgetsSection';
import { ExpensesSection } from './components/ExpensesSection';
import { ArchiveSection } from './components/ArchiveSection';
import { AddExpenseModal } from './components/AddExpenseModal';
import { CloseMonthModal } from './components/CloseMonthModal';
import { DatabaseSettingsModal } from './components/DatabaseSettingsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { getCurrentShamsiDate } from './utils/shamsi';
import { Check, CheckCircle, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('deposits');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCloseMonthOpen, setIsCloseMonthOpen] = useState(false);
  const [targetBudgetIdForExpense, setTargetBudgetIdForExpense] = useState<string | undefined>(
    undefined
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local_storage'>('synced');
  const [activeProvider, setActiveProvider] = useState<DatabaseProvider>('local');
  const [isStaticHost, setIsStaticHost] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Guards to prevent infinite sync loops between devices
  const isRemoteUpdateRef = useRef(false);
  const lastRemoteTimestampRef = useRef<string>('');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // 1. Initial Load from Multi-Source Database (Server -> Supabase -> IndexedDB -> LocalStorage)
  // Survives browser history / cache / localStorage clear!
  useEffect(() => {
    let isMounted = true;
    loadStateFromDatabase()
      .then((res) => {
        if (!isMounted) return;
        if (res.state && res.state.currentFile) {
          setState(res.state);
        }
        setActiveProvider(res.provider);
        setIsStaticHost(res.isStaticHost);

        if (res.provider === 'local') {
          setSyncStatus('local_storage');
        } else {
          setSyncStatus('synced');
        }
        setDbError(null);
        setIsInitialLoadDone(true);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error during initial database load:', err);
        setIsInitialLoadDone(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Pull latest state from cloud database (for cross-device synchronization)
  const handlePullRemoteState = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setSyncStatus('syncing');
      }
      const remote = await fetchLatestRemoteState();
      if (remote && remote.state && remote.state.currentFile) {
        // Compare with current local state
        const isDifferent = JSON.stringify(remote.state) !== JSON.stringify(state);

        if (isDifferent) {
          isRemoteUpdateRef.current = true;
          lastRemoteTimestampRef.current = remote.updatedAt;
          setState(remote.state);
          saveAppState(remote.state);
          saveToIndexedDB(remote.state).catch(() => {});
          setActiveProvider(remote.provider);
          setSyncStatus('synced');
          setDbError(null);
          showToast('🔄 اطلاعات از دستگاه دیگر همگام‌سازی شد');
        } else {
          setSyncStatus('synced');
          if (!silent) {
            showToast('اطلاعات با سایر دستگاه‌ها کاملاً همگام است');
          }
        }
      } else if (!silent) {
        setSyncStatus('synced');
        showToast('ارتباط با دیتابیس پایدار است');
      }
    } catch (e) {
      console.warn('Error pulling remote state:', e);
      if (!silent) {
        showToast('خطا در دریافت اطلاعات جدید از سرور');
      }
    }
  }, [state, showToast]);

  // 3. Multi-device Realtime Sync (WebSocket Subscription)
  useEffect(() => {
    if (!isInitialLoadDone) return;
    if (activeProvider !== 'supabase') return;

    const unsubscribe = subscribeToSupabaseChanges((remoteState, updatedAt) => {
      if (updatedAt && lastRemoteTimestampRef.current && updatedAt <= lastRemoteTimestampRef.current) {
        return; // Already processed
      }

      isRemoteUpdateRef.current = true;
      lastRemoteTimestampRef.current = updatedAt;
      setState(remoteState);
      saveAppState(remoteState);
      saveToIndexedDB(remoteState).catch(() => {});
      setSyncStatus('synced');
      setDbError(null);
      showToast('🔄 تغییرات ثبت‌شده در دستگاه دیگر همگام‌سازی شد');
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isInitialLoadDone, activeProvider, showToast]);

  // 4. Tab Visibility & Window Focus Sync (When user switches between devices / phone lock)
  useEffect(() => {
    if (!isInitialLoadDone) return;
    if (activeProvider !== 'supabase' && activeProvider !== 'server') return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handlePullRemoteState(true);
      }
    };

    const onFocus = () => {
      handlePullRemoteState(true);
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    // Periodic gentle check every 12 seconds when active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handlePullRemoteState(true);
      }
    }, 12000);

    return () => {
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [isInitialLoadDone, activeProvider, handlePullRemoteState]);

  // 5. Strict Save to Database on State Changes (with infinite loop protection)
  useEffect(() => {
    if (!isInitialLoadDone) return;

    // Guard: Do not re-save if this change came from a remote device
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    setSyncStatus('syncing');
    let isCancelled = false;

    saveStateToDatabase(state).then((res) => {
      if (isCancelled) return;

      setActiveProvider(res.provider);

      if (res.success) {
        if (res.isStaticHostWithoutCloud) {
          setSyncStatus('local_storage');
          setIsStaticHost(true);
        } else {
          setSyncStatus('synced');
        }
        setDbError(null);
      } else {
        // Real database save failure
        setSyncStatus('error');
        const errorMsg = res.error || 'ثبت نشد: خطا در ذخیره اطلاعات در دیتابیس';
        setDbError(errorMsg);
        showToast(`⚠️ ${errorMsg}`);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [state, isInitialLoadDone, showToast]);

  // Retry save manually
  const handleRetrySave = () => {
    setSyncStatus('syncing');
    setDbError(null);
    showToast('در حال تلاش مجدد برای ثبت در دیتابیس...');

    saveStateToDatabase(state).then((res) => {
      setActiveProvider(res.provider);
      if (res.success) {
        if (res.isStaticHostWithoutCloud) {
          setSyncStatus('local_storage');
          setIsStaticHost(true);
        } else {
          setSyncStatus('synced');
        }
        setDbError(null);
        showToast('اطلاعات با موفقیت در دیتابیس ثبت شد');
      } else {
        setSyncStatus('error');
        const errorMsg = res.error || 'ثبت نشد: خطا در ذخیره اطلاعات در دیتابیس';
        setDbError(errorMsg);
        showToast(`⚠️ ${errorMsg}`);
      }
    });
  };

  const currentFile = state.currentFile;
  const summary = calculateMonthSummary(currentFile);

  // 1. Deposits Handlers
  const handleToggleDepositReceived = (depositId: string) => {
    const now = getCurrentShamsiDate();
    const updatedDeposits = currentFile.deposits.map((d) => {
      if (d.id === depositId) {
        const nextState = !d.isReceived;
        return {
          ...d,
          isReceived: nextState,
          receivedDate: nextState ? now.formatted : undefined,
          receivedTime: nextState ? now.timeFormatted : undefined,
        };
      }
      return d;
    });

    setState((prev) => ({
      ...prev,
      currentFile: {
        ...prev.currentFile,
        deposits: updatedDeposits,
      },
    }));
  };

  const handleAddDeposit = (depositData: Omit<Deposit, 'id' | 'createdAt'>) => {
    const newDeposit: Deposit = {
      ...depositData,
      id: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      currentFile: {
        ...prev.currentFile,
        deposits: [newDeposit, ...prev.currentFile.deposits],
      },
    }));
    showToast('واریزی با موفقیت به لیست اضافه شد');
  };

  const handleUpdateDeposit = (updatedDeposit: Deposit) => {
    setState((prev) => ({
      ...prev,
      currentFile: {
        ...prev.currentFile,
        deposits: prev.currentFile.deposits.map((d) =>
          d.id === updatedDeposit.id ? updatedDeposit : d
        ),
      },
    }));
    showToast(`واریزی «${updatedDeposit.title}» با موفقیت ویرایش شد`);
  };

  const handleDeleteDeposit = (depositId: string) => {
    setState((prev) => ({
      ...prev,
      currentFile: {
        ...prev.currentFile,
        deposits: prev.currentFile.deposits.filter((d) => d.id !== depositId),
      },
    }));
    showToast('واریزی حذف شد');
  };

  // 2. Budgets Handlers
  const handleAddBudget = (budgetData: Omit<Budget, 'id'>) => {
    const newBudget: Budget = {
      ...budgetData,
      id: `budget-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    setState((prev) => ({
      ...prev,
      currentFile: {
        ...prev.currentFile,
        budgets: [...prev.currentFile.budgets, newBudget],
      },
    }));
    showToast('سرفصل بودجه جدید اضافه شد');
  };

  const handleUpdateBudget = (updatedBudget: Budget) => {
    setState((prev) => ({
      ...prev,
      currentFile: {
        ...prev.currentFile,
        budgets: prev.currentFile.budgets.map((b) =>
          b.id === updatedBudget.id ? updatedBudget : b
        ),
      },
    }));
    showToast('بودجه با موفقیت ویرایش گردید');
  };

  const handleDeleteBudget = (budgetId: string) => {
    setState((prev) => ({
      ...prev,
      currentFile: {
        ...prev.currentFile,
        budgets: prev.currentFile.budgets.filter((b) => b.id !== budgetId),
      },
    }));
    showToast('سرفصل بودجه حذف شد');
  };

  const handleQuickAddExpenseForBudget = (budgetId: string) => {
    setTargetBudgetIdForExpense(budgetId);
    setIsAddExpenseOpen(true);
  };

  // 3. Expenses Handlers
  const handleAddExpense = (expenseData: Omit<Expense, 'id' | 'timestamp'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      currentFile: {
        ...prev.currentFile,
        expenses: [newExpense, ...prev.currentFile.expenses],
      },
    }));
    showToast(`خرج «${expenseData.title}» ثبت و از سرفصل کسر گردید`);
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    setState((prev) => ({
      ...prev,
      currentFile: {
        ...prev.currentFile,
        expenses: prev.currentFile.expenses.map((e) =>
          e.id === updatedExpense.id ? updatedExpense : e
        ),
      },
    }));
    showToast(`خرج «${updatedExpense.title}» با موفقیت ویرایش شد`);
  };

  const handleDeleteExpense = (expenseId: string) => {
    setState((prev) => ({
      ...prev,
      currentFile: {
        ...prev.currentFile,
        expenses: prev.currentFile.expenses.filter((e) => e.id !== expenseId),
      },
    }));
    showToast('خرج حذف شد و مبلغ به مانده بودجه بازگردانده شد');
  };

  // 4. Archiving & Close Month Handler
  const handleConfirmCloseMonth = (options: { carryOverBudgets: boolean }) => {
    const { updatedState, archivedFile, newFile } = closeAndArchiveCurrentMonth(state, {
      carryOverBudgets: options.carryOverBudgets,
    });
    setState(updatedState);
    setIsCloseMonthOpen(false);
    setActiveTab('deposits');
    showToast(
      `پرونده ${archivedFile.monthName} در آرشیو قفل شد و پرونده ${newFile.monthName} باز شد!`
    );
  };

  // 5. Backup Export / Import
  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `shamsi-finance-backup-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('فایل پشتیبان با موفقیت دانلود شد');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.currentFile) {
            setState(parsed);
            showToast('اطلاعات پشتیبان با موفقیت بازیابی شد');
          } else {
            showToast('فرمت فایل پشتیبان نامعتبر است');
          }
        } catch (err) {
          showToast('خطا در خواندن فایل پشتیبان');
        }
      };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center selection:bg-emerald-500/30 selection:text-emerald-200">
      <OfflineIndicator />

      {/* Mobile-portrait framed container */}
      <div className="w-full max-w-md min-h-screen bg-slate-950 flex flex-col relative border-x border-slate-900 shadow-2xl pb-24">
        {/* Top Header */}
        <Header
          currentMonthName={currentFile.monthName}
          syncStatus={syncStatus}
          activeProvider={activeProvider}
          isStaticHost={isStaticHost}
          onRetrySync={handleRetrySave}
          onOpenDatabaseModal={() => setIsDbModalOpen(true)}
          onRefreshRemote={() => handlePullRemoteState(false)}
        />

        {/* Prominent Database Save Error Banner (Explicit User Requirement) */}
        {dbError && (
          <div className="mx-3 my-2 p-3 rounded-2xl bg-rose-950/90 border border-rose-500/80 shadow-lg text-right text-xs text-rose-100 flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-150">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <div className="font-black text-rose-200 text-xs">
                ⚠️ ثبت نشد! اطلاعات تا ۳ ثانیه در دیتابیس ثبت نشد.
              </div>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                {dbError}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleRetrySave}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>تلاش مجدد برای ثبت</span>
                </button>
                <button
                  onClick={() => setIsDbModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-medium text-[11px] border border-slate-700 cursor-pointer"
                >
                  تنظیمات دیتابیس
                </button>
                <button
                  onClick={() => setDbError(null)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white font-medium text-[11px] cursor-pointer"
                >
                  بستن پیام
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content View based on activeTab */}
        <main className="flex-1 p-4 overflow-y-auto">
          {activeTab === 'deposits' && (
            <DepositsSection
              currentFile={currentFile}
              summary={summary}
              onToggleDepositReceived={handleToggleDepositReceived}
              onAddDeposit={handleAddDeposit}
              onUpdateDeposit={handleUpdateDeposit}
              onDeleteDeposit={handleDeleteDeposit}
              onOpenCloseMonthModal={() => setIsCloseMonthOpen(true)}
              currencyUnit={state.currencyUnit}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetsSection
              budgets={currentFile.budgets}
              expenses={currentFile.expenses}
              summary={summary}
              monthName={currentFile.monthName}
              onAddBudget={handleAddBudget}
              onUpdateBudget={handleUpdateBudget}
              onDeleteBudget={handleDeleteBudget}
              onQuickAddExpenseForBudget={handleQuickAddExpenseForBudget}
              onEditExpense={(exp) => {
                setEditingExpense(exp);
                setIsAddExpenseOpen(true);
              }}
              onDeleteExpense={handleDeleteExpense}
              currencyUnit={state.currencyUnit}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesSection
              expenses={currentFile.expenses}
              budgets={currentFile.budgets}
              monthName={currentFile.monthName}
              totalExpenses={summary.totalExpenses}
              onOpenAddModal={(budgetId) => {
                setEditingExpense(null);
                setTargetBudgetIdForExpense(budgetId);
                setIsAddExpenseOpen(true);
              }}
              onEditExpense={(exp) => {
                setEditingExpense(exp);
                setIsAddExpenseOpen(true);
              }}
              onDeleteExpense={handleDeleteExpense}
              currencyUnit={state.currencyUnit}
            />
          )}

          {activeTab === 'archive' && (
            <ArchiveSection
              archives={state.archives}
              currentFile={currentFile}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              currencyUnit={state.currencyUnit}
            />
          )}
        </main>

        {/* Bottom Mobile Navigation */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onOpenQuickAddExpense={() => {
            setEditingExpense(null);
            setTargetBudgetIdForExpense(undefined);
            setIsAddExpenseOpen(true);
          }}
          expensesCount={currentFile.expenses.length}
        />

        {/* Add / Edit Expense Modal */}
        <AddExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => {
            setIsAddExpenseOpen(false);
            setEditingExpense(null);
            setTargetBudgetIdForExpense(undefined);
          }}
          budgets={currentFile.budgets}
          allExpenses={currentFile.expenses}
          onAddExpense={handleAddExpense}
          onUpdateExpense={handleUpdateExpense}
          editingExpense={editingExpense}
          defaultBudgetId={targetBudgetIdForExpense}
          currencyUnit={state.currencyUnit}
        />

        {/* Close Month Modal */}
        <CloseMonthModal
          isOpen={isCloseMonthOpen}
          onClose={() => setIsCloseMonthOpen(false)}
          currentFile={currentFile}
          summary={summary}
          onConfirmClose={handleConfirmCloseMonth}
          currencyUnit={state.currencyUnit}
        />

        {/* Database Settings Modal */}
        <DatabaseSettingsModal
          isOpen={isDbModalOpen}
          onClose={() => setIsDbModalOpen(false)}
          currentState={state}
          onRestoreState={(restored) => setState(restored)}
          onRefreshSync={handleRetrySave}
          showToast={showToast}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-22 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-xl shadow-emerald-500/20 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <CheckCircle className="w-4 h-4 text-slate-950 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
