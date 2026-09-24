import { AppState, MonthlyFile, MonthSummary, Budget, Deposit, Expense } from '../types/finance';
import { getCurrentShamsiDate, getShamsiMonthTitle, getNextShamsiMonth } from '../utils/shamsi';
import { getStoredSupabaseConfig, pushStateToSupabase, fetchStateFromSupabase } from './supabase';

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

// --- IndexedDB Deep Local Storage Layer ---
const IDB_NAME = 'shamsi_finance_db_v1';
const IDB_STORE = 'app_state_store';
const IDB_KEY = 'latest_state';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported'));
    }
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToIndexedDB(state: AppState): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(state, IDB_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Non-fatal, just a warning
    console.warn('Could not save to IndexedDB:', err);
  }
}

export async function loadFromIndexedDB(): Promise<AppState | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not load from IndexedDB:', err);
    return null;
  }
}

export const DATABASE_TIMEOUT_MS = 3000;

export type DatabaseProvider = 'server' | 'supabase' | 'local';

export interface DatabaseSaveResult {
  success: boolean;
  durationMs: number;
  provider: DatabaseProvider;
  error?: string;
  isTimeout?: boolean;
  isStaticHostWithoutCloud?: boolean;
}

// Cached server probe result to avoid repeated network probes
let serverProbeResult: boolean | null = null;
let lastProbeTime = 0;

/**
 * Checks what database backend is active:
 * 1. Node.js backend (/api/state) if running on Node / dev preview
 * 2. Supabase Cloud Database if configured (ideal for static hosts like Cloudflare Pages)
 * 3. Local IndexedDB + LocalStorage (when on static host without Supabase)
 */
export async function probeDatabaseBackend(forceRefresh = false): Promise<{
  isServer: boolean;
  isSupabase: boolean;
  activeProvider: DatabaseProvider;
  isStaticHost: boolean;
}> {
  const now = Date.now();
  const supabaseConfig = getStoredSupabaseConfig();
  const isSupabase = supabaseConfig.isConfigured;

  // Probe server if not probed recently (cache for 15 seconds unless forced)
  if (forceRefresh || serverProbeResult === null || now - lastProbeTime > 15000) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('/api/ping', { signal: controller.signal });
      clearTimeout(timer);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        serverProbeResult = Boolean(data && data.ok);
      } else {
        // If content-type is text/html or 404, it's a static host!
        serverProbeResult = false;
      }
    } catch {
      serverProbeResult = false;
    }
    lastProbeTime = now;
  }

  const isServer = Boolean(serverProbeResult);
  const isStaticHost = !isServer;

  let activeProvider: DatabaseProvider = 'local';
  if (isServer) {
    activeProvider = 'server';
  } else if (isSupabase) {
    activeProvider = 'supabase';
  }

  return { isServer, isSupabase, activeProvider, isStaticHost };
}

/**
 * Saves app state to the database with strict 3-second timeout constraint:
 * - If server is active (Node.js server), saves to server with 3s timeout.
 * - If Supabase is configured (Static host or Cloud), saves to Supabase with 3s timeout.
 * - If on static host without cloud database, saves safely to LocalStorage + IndexedDB
 *   and reports provider: 'local', WITHOUT spamming false "database failure" alarms.
 */
export async function saveStateToDatabase(state: AppState): Promise<DatabaseSaveResult> {
  const start = Date.now();

  // 1. Always update local stores immediately (LocalStorage + IndexedDB)
  saveAppState(state);
  saveToIndexedDB(state).catch(() => {});

  const { isServer, isSupabase } = await probeDatabaseBackend();

  // Case A: Server backend (Node.js Express / server.ts)
  if (isServer) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DATABASE_TIMEOUT_MS);

    try {
      const response = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const durationMs = Date.now() - start;

      const ct = response.headers.get('content-type') || '';
      if (!response.ok || !ct.includes('application/json')) {
        serverProbeResult = false; // invalidate probe
        return {
          success: false,
          provider: 'server',
          durationMs,
          error: `پاسخ ناموفق از سرور دیتابیس (کد ${response.status})`,
        };
      }

      const data = await response.json();
      if (data && data.success) {
        if (isSupabase) {
          pushStateToSupabase(state).catch(() => {});
        }
        return { success: true, provider: 'server', durationMs };
      } else {
        return {
          success: false,
          provider: 'server',
          durationMs,
          error: data?.error || 'خطا در ثبت دیتابیس سرور',
        };
      }
    } catch (err: any) {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      const isTimeout = err?.name === 'AbortError' || durationMs >= DATABASE_TIMEOUT_MS;
      return {
        success: false,
        provider: 'server',
        durationMs,
        isTimeout,
        error: isTimeout
          ? 'ثبت نشد: عملیات ذخیره در دیتابیس بیش از ۳ ثانیه طول کشید'
          : (err?.message || 'خطا در اتصال به سرور دیتابیس'),
      };
    }
  }

  // Case B: Supabase Cloud Database is configured
  if (isSupabase) {
    try {
      const timeoutPromise = new Promise<{ success: boolean; isTimeout: boolean }>((resolve) =>
        setTimeout(() => resolve({ success: false, isTimeout: true }), DATABASE_TIMEOUT_MS)
      );
      const pushPromise = pushStateToSupabase(state).then((ok) => ({ success: ok, isTimeout: false }));

      const res = await Promise.race([pushPromise, timeoutPromise]);
      const durationMs = Date.now() - start;

      if (res.isTimeout) {
        return {
          success: false,
          provider: 'supabase',
          durationMs,
          isTimeout: true,
          error: 'ثبت نشد: ذخیره در دیتابیس ابری بیش از ۳ ثانیه طول کشید',
        };
      }

      if (res.success) {
        return { success: true, provider: 'supabase', durationMs };
      } else {
        return {
          success: false,
          provider: 'supabase',
          durationMs,
          error: 'خطا در ثبت اطلاعات در دیتابیس ابری Supabase',
        };
      }
    } catch (err: any) {
      const durationMs = Date.now() - start;
      return {
        success: false,
        provider: 'supabase',
        durationMs,
        error: err?.message || 'خطا در برقراری ارتباط با دیتابیس ابری',
      };
    }
  }

  // Case C: Static Host without Supabase Cloud Database
  // Data is safely stored in LocalStorage + IndexedDB.
  // We report success with isStaticHostWithoutCloud=true so the UI shows that it's stored locally
  // and invites user to connect Supabase if they want cross-device / history-clear-proof persistence.
  const durationMs = Date.now() - start;
  return {
    success: true,
    provider: 'local',
    durationMs,
    isStaticHostWithoutCloud: true,
  };
}

/**
 * Loads app state from database with multi-source fallback:
 * Server Database -> Supabase Cloud -> IndexedDB -> LocalStorage.
 */
export async function loadStateFromDatabase(): Promise<{
  state: AppState;
  source: 'server' | 'supabase' | 'indexeddb' | 'localstorage';
  provider: DatabaseProvider;
  isStaticHost: boolean;
}> {
  const { isServer, isSupabase, isStaticHost, activeProvider } = await probeDatabaseBackend();

  // 1. Try server if available
  if (isServer) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DATABASE_TIMEOUT_MS);
      const res = await fetch('/api/state', { signal: controller.signal });
      clearTimeout(timer);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const json = await res.json();
        if (json.success && json.data && json.data.currentFile) {
          saveAppState(json.data);
          saveToIndexedDB(json.data).catch(() => {});
          return { state: json.data, source: 'server', provider: 'server', isStaticHost: false };
        }
      }
    } catch (err) {
      console.warn('Server load failed, falling back to other sources:', err);
    }
  }

  // 2. Try Supabase if configured
  if (isSupabase) {
    try {
      const cloud = await fetchStateFromSupabase();
      if (cloud && cloud.currentFile) {
        saveAppState(cloud);
        saveToIndexedDB(cloud).catch(() => {});
        return { state: cloud, source: 'supabase', provider: 'supabase', isStaticHost };
      }
    } catch (err) {
      console.warn('Supabase cloud load failed, falling back to local:', err);
    }
  }

  // 3. Try IndexedDB (survives when user clears standard browsing history in many browsers)
  try {
    const idb = await loadFromIndexedDB();
    if (idb && idb.currentFile) {
      saveAppState(idb);
      return { state: idb, source: 'indexeddb', provider: activeProvider, isStaticHost };
    }
  } catch (err) {
    console.warn('IndexedDB load failed:', err);
  }

  // 4. Try LocalStorage
  const local = loadAppState();
  return { state: local, source: 'localstorage', provider: activeProvider, isStaticHost };
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
