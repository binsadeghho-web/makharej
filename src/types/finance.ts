export interface Deposit {
  id: string;
  title: string;
  amount: number;
  isFixed: boolean; // true = واریزی ثابت ماهیانه, false = واریزی موردی
  isReceived: boolean; // تیک خورده / واریز شده
  receivedDate?: string; // تاریخ واریز شمسی
  receivedTime?: string; // زمان واریز
  expectedDate?: string; // زمان واریزی / تاریخ مورد انتظار واریز (شمسی)
  expectedDay?: number; // روز مورد انتظار واریز در ماه (۱ تا ۳۱)
  expectedTime?: string; // ساعت مورد انتظار
  createdAt: string;
}

export interface Budget {
  id: string;
  title: string;
  allocatedAmount: number; // میزان کل بودجه تعیین شده
  color: string;
  icon?: string;
}

export interface Expense {
  id: string;
  title: string; // عنوان خرج
  amount: number; // مبلغ خرج
  budgetId: string; // از کدام بودجه
  budgetName: string; // نام بودجه در زمان ثبت
  date: string; // تاریخ اتوماتیک شمسی e.g. "۱۴۰۵/۰۱/۰۴"
  time: string; // ساعت اتوماتیک e.g. "۱۴:۳۰"
  timestamp: number;
  note?: string;
}

export interface MonthlyFile {
  id: string;
  year: number;
  month: number;
  monthName: string; // e.g. "فروردین ۱۴۰۵"
  status: 'active' | 'closed';
  openedAt: string;
  closedAt?: string;
  deposits: Deposit[];
  budgets: Budget[];
  expenses: Expense[];
}

export interface MonthSummary {
  totalPlannedDeposits: number; // کل واریزی‌های برنامه‌ریزی شده
  totalReceivedDeposits: number; // واریزی‌های تیک خورده و دریافت شده
  totalFixedExpected: number;
  totalAdhocReceived: number;
  totalBudgetAllocated: number; // جمع سقف بودجه‌ها
  totalExpenses: number; // جمع کل مخارج ثبت شده
  remainingBudget: number; // مانده کل بودجه = کل بودجه - کل مخارج
  netCashflow: number; // تراز نقدینگی = کل واریزی دریافت شده - کل مخارج
}

export interface AppState {
  currentFile: MonthlyFile;
  archives: MonthlyFile[];
  fixedDepositTemplates: Array<{ id: string; title: string; defaultAmount: number }>;
  defaultBudgetTemplates: Array<{ id: string; title: string; defaultAmount: number; color: string; icon: string }>;
  currencyUnit: 'تومان' | 'ریال';
}
