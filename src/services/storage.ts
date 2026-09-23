import { AppState, MonthlyFile, MonthSummary, Budget, Deposit, Expense } from '../types/finance';
import { getCurrentShamsiDate, getShamsiMonthTitle, getNextShamsiMonth } from '../utils/shamsi';

const STORAGE_KEY = 'shamsi_finance_pwa_state_v1';

export const DEFAULT_BUDGET_TEMPLATES = [
  { id: 'b-daily', title: 'خرج‌های روزمره', defaultAmount: 8000000, color: '#10b981', icon: 'ShoppingBag' },
  { id: 'b-others', title: 'سایر هزینه‌ها', defaultAmount: 4000000, color: '#3b82f6', icon: 'MoreHorizontal' },
];

export const DEFAULT_FIXED_DEPOSITS = [
  { id: 'fd-invest', title: 'سود سپرده / درآمد دوم', defaultAmount: 4000000, expectedDay: 5, expectedDate: 'روز ۵ ماه' },
  { id: 'fd-subsidy', title: 'یارانه و کمک‌هزینه', defaultAmount: 1600000, expectedDay: 20, expectedDate: 'روز ۲۰ ماه' },
  { id: 'fd-salary', title: 'حقوق و دستمزد ماهانه', defaultAmount: 32000000, expectedDay: 28, expectedDate: 'روز ۲۸ ماه' },
];

export function createInitialMonthFile(year?: number, month?: number): MonthlyFile {
  const now = getCurrentShamsiDate();
  const y = year || now.year;
  const m = month || now.month;
  const monthName = getShamsiMonthTitle(y, m);

  const initialBudgets: Budget[] = DEFAULT_BUDGET_TEMPLATES.map((t) => ({
    id: `budget-${t.id}`,
    title: t.title,
    allocatedAmount: t.defaultAmount,
    color: t.color,
    icon: t.icon,
  }));

  const initialDeposits: Deposit[] = DEFAULT_FIXED_DEPOSITS.map((fd, index) => ({
    id: `deposit-${fd.id}-${Date.now()}-${index}`,
    title: fd.title,
    amount: fd.defaultAmount,
    isFixed: true,
    isReceived: index === 0, // Mark first one as already received for realistic feel
    receivedDate: index === 0 ? now.formatted : undefined,
    receivedTime: index === 0 ? now.timeFormatted : undefined,
    expectedDay: fd.expectedDay,
    expectedDate: fd.expectedDate,
    createdAt: new Date().toISOString(),
  }));

  // Initial demo expenses on the two default budgets
  const dailyBudget = initialBudgets[0];
  const othersBudget = initialBudgets[1];

  const initialExpenses: Expense[] = [
    {
      id: `exp-1-${Date.now()}`,
      title: 'خرید روزمره سوپرمارکت و میوه',
      amount: 650000,
      budgetId: dailyBudget.id,
      budgetName: dailyBudget.title,
      date: now.formatted,
      time: '۱۰:۳۰',
      timestamp: Date.now() - 3600000 * 24,
      note: 'خرید مایحتاج روزمره',
    },
    {
      id: `exp-2-${Date.now()}`,
      title: 'شارژ ساختمان و قبوض',
      amount: 400000,
      budgetId: othersBudget.id,
      budgetName: othersBudget.title,
      date: now.formatted,
      time: '۱۶:۴۵',
      timestamp: Date.now() - 3600000 * 5,
    },
  ];

  return {
    id: `file-${y}-${String(m).padStart(2, '0')}`,
    year: y,
    month: m,
    monthName,
    status: 'active',
    openedAt: new Date().toISOString(),
    deposits: initialDeposits,
    budgets: initialBudgets,
    expenses: initialExpenses,
  };
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.currentFile) {
        // If state has old initial 7 budgets from previous test, migrate to the 2 requested default budgets
        const hasOldSeven = parsed.currentFile.budgets?.some((b: Budget) => b.id.includes('b-food') || b.id.includes('b-housing'));
        if (hasOldSeven && parsed.archives?.length === 0) {
          const fresh = createInitialMonthFile(parsed.currentFile.year, parsed.currentFile.month);
          parsed.currentFile.budgets = fresh.budgets;
          parsed.defaultBudgetTemplates = DEFAULT_BUDGET_TEMPLATES;
          // remap demo expenses if needed
          if (parsed.currentFile.expenses?.length > 0) {
            parsed.currentFile.expenses = fresh.expenses;
          }
          saveAppState(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load state from localStorage', err);
  }

  // Create fresh state
  const initialCurrentFile = createInitialMonthFile();
  const initialState: AppState = {
    currentFile: initialCurrentFile,
    archives: [],
    fixedDepositTemplates: DEFAULT_FIXED_DEPOSITS,
    defaultBudgetTemplates: DEFAULT_BUDGET_TEMPLATES,
    currencyUnit: 'تومان',
  };
  saveAppState(initialState);
  return initialState;
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to localStorage', err);
  }
}

/**
 * Calculates budget item metrics (allocated, spent, remaining, percentage)
 */
export function getBudgetCalculations(budget: Budget, expenses: Expense[]) {
  const spent = expenses
    .filter((e) => e.budgetId === budget.id)
    .reduce((sum, e) => sum + e.amount, 0);

  const remaining = budget.allocatedAmount - spent;
  const percentage = budget.allocatedAmount > 0 ? (spent / budget.allocatedAmount) * 100 : 0;

  return {
    spent,
    remaining,
    percentage: Math.min(percentage, 100),
    isOverBudget: remaining < 0,
    overAmount: remaining < 0 ? Math.abs(remaining) : 0,
  };
}

/**
 * Calculates complete summary of a monthly file
 */
export function calculateMonthSummary(file: MonthlyFile): MonthSummary {
  const totalPlannedDeposits = file.deposits.reduce((sum, d) => sum + d.amount, 0);
  const totalReceivedDeposits = file.deposits
    .filter((d) => d.isReceived)
    .reduce((sum, d) => sum + d.amount, 0);

  const totalFixedExpected = file.deposits
    .filter((d) => d.isFixed)
    .reduce((sum, d) => sum + d.amount, 0);

  const totalAdhocReceived = file.deposits
    .filter((d) => !d.isFixed && d.isReceived)
    .reduce((sum, d) => sum + d.amount, 0);

  const totalBudgetAllocated = file.budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
  const totalExpenses = file.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = totalBudgetAllocated - totalExpenses;
  const netCashflow = totalReceivedDeposits - totalExpenses;

  return {
    totalPlannedDeposits,
    totalReceivedDeposits,
    totalFixedExpected,
    totalAdhocReceived,
    totalBudgetAllocated,
    totalExpenses,
    remainingBudget,
    netCashflow,
  };
}

/**
 * Closes the current month's file, pushes it to archives, and creates the new month's file
 */
export function closeAndArchiveCurrentMonth(
  currentState: AppState,
  options: { carryOverBudgets?: boolean; resetReceivedCheckmarks?: boolean } = {}
): { updatedState: AppState; archivedFile: MonthlyFile; newFile: MonthlyFile } {
  const current = currentState.currentFile;

  // Mark current as closed
  const closedFile: MonthlyFile = {
    ...current,
    status: 'closed',
    closedAt: new Date().toISOString(),
  };

  // Determine next month
  const next = getNextShamsiMonth(current.year, current.month);
  const nextMonthName = getShamsiMonthTitle(next.year, next.month);

  // Setup budgets for new month: copy current budget definitions or use defaults
  const newBudgets: Budget[] = options.carryOverBudgets !== false
    ? current.budgets.map((b) => ({
        id: `budget-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: b.title,
        allocatedAmount: b.allocatedAmount,
        color: b.color,
        icon: b.icon,
      }))
    : currentState.defaultBudgetTemplates.map((t) => ({
        id: `budget-${t.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: t.title,
        allocatedAmount: t.defaultAmount,
        color: t.color,
        icon: t.icon,
      }));

  // Setup fixed deposits for new month: carry over fixed deposits with isReceived reset to false
  const activeFixedDeposits = current.deposits.filter((d) => d.isFixed);
  const newDeposits: Deposit[] = activeFixedDeposits.length > 0
    ? activeFixedDeposits.map((fd) => ({
        id: `deposit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: fd.title,
        amount: fd.amount,
        isFixed: true,
        isReceived: false,
        expectedDay: fd.expectedDay,
        expectedDate: fd.expectedDate,
        createdAt: new Date().toISOString(),
      }))
    : currentState.fixedDepositTemplates.map((fd) => ({
        id: `deposit-${fd.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: fd.title,
        amount: fd.defaultAmount,
        isFixed: true,
        isReceived: false,
        createdAt: new Date().toISOString(),
      }));

  const newMonthFile: MonthlyFile = {
    id: `file-${next.year}-${String(next.month).padStart(2, '0')}`,
    year: next.year,
    month: next.month,
    monthName: nextMonthName,
    status: 'active',
    openedAt: new Date().toISOString(),
    deposits: newDeposits,
    budgets: newBudgets,
    expenses: [], // Fresh empty expenses for the new month
  };

  const updatedArchives = [closedFile, ...currentState.archives.filter((a) => a.id !== closedFile.id)];

  const updatedState: AppState = {
    ...currentState,
    currentFile: newMonthFile,
    archives: updatedArchives,
  };

  saveAppState(updatedState);
  return { updatedState, archivedFile: closedFile, newFile: newMonthFile };
}
