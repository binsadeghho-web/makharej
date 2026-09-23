/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AppState, MonthlyFile, Budget, Deposit, Expense } from './types/finance';
import {
  loadAppState,
  saveAppState,
  calculateMonthSummary,
  closeAndArchiveCurrentMonth,
} from './services/storage';
import {
  getStoredSupabaseConfig,
  pushStateToSupabase,
  fetchStateFromSupabase,
} from './services/supabase';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { DepositsSection } from './components/DepositsSection';
import { BudgetsSection } from './components/BudgetsSection';
import { ExpensesSection } from './components/ExpensesSection';
import { ArchiveSection } from './components/ArchiveSection';
import { AddExpenseModal } from './components/AddExpenseModal';
import { CloseMonthModal } from './components/CloseMonthModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { getCurrentShamsiDate } from './utils/shamsi';
import { Check, CheckCircle } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<TabType>('deposits');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCloseMonthOpen, setIsCloseMonthOpen] = useState(false);
  const [targetBudgetIdForExpense, setTargetBudgetIdForExpense] = useState<string | undefined>(
    undefined
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'not_configured'>('not_configured');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Initial Supabase Sync on App Load
  useEffect(() => {
    const config = getStoredSupabaseConfig();
    if (!config.isConfigured) {
      setSyncStatus('not_configured');
      return;
    }

    setSyncStatus('syncing');
    fetchStateFromSupabase()
      .then((remote) => {
        if (remote && remote.currentFile) {
          setState(remote);
          setSyncStatus('synced');
          showToast('اطلاعات با دیتابیس Supabase همگام شد');
        } else {
          // If remote is empty, push local state to initialize it
          pushStateToSupabase(state).then((ok) => {
            setSyncStatus(ok ? 'synced' : 'error');
          });
        }
      })
      .catch((err) => {
        console.error('Supabase init error:', err);
        setSyncStatus('error');
      });
  }, [showToast]);

  // Sync state to LocalStorage and Supabase whenever state changes
  useEffect(() => {
    saveAppState(state);
    const config = getStoredSupabaseConfig();
    if (config.isConfigured) {
      setSyncStatus('syncing');
      pushStateToSupabase(state).then((ok) => {
        setSyncStatus(ok ? 'synced' : 'error');
      });
    }
  }, [state]);

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
        />

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
