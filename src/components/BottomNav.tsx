import React from 'react';
import { ArrowDownLeft, PieChart, Receipt, Archive, Plus } from 'lucide-react';

export type TabType = 'deposits' | 'budgets' | 'expenses' | 'archive';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenQuickAddExpense: () => void;
  expensesCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenQuickAddExpense,
  expensesCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 pb-safe">
      <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-around relative">
        {/* Tab 1: واریزی‌ها */}
        <button
          onClick={() => onChangeTab('deposits')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === 'deposits'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'deposits' ? 'bg-emerald-500/15' : 'bg-transparent'
            }`}
          >
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <span className="text-[11px] leading-tight">واریزی‌ها</span>
        </button>

        {/* Tab 2: بودجه‌ها */}
        <button
          onClick={() => onChangeTab('budgets')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === 'budgets'
              ? 'text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'budgets' ? 'bg-teal-500/15' : 'bg-transparent'
            }`}
          >
            <PieChart className="w-5 h-5" />
          </div>
          <span className="text-[11px] leading-tight">بودجه‌ها</span>
        </button>

        {/* Floating Add Expense Button in Center */}
        <div className="relative -top-5">
          <button
            onClick={onOpenQuickAddExpense}
            className="w-13 h-13 rounded-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/35 border-4 border-slate-950 active:scale-95 transition-transform hover:brightness-110"
            title="ثبت سریع خرج"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Tab 3: مخارج */}
        <button
          onClick={() => onChangeTab('expenses')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all relative ${
            activeTab === 'expenses'
              ? 'text-rose-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'expenses' ? 'bg-rose-500/15' : 'bg-transparent'
            }`}
          >
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-[11px] leading-tight">مخارج</span>
        </button>

        {/* Tab 4: آرشیو */}
        <button
          onClick={() => onChangeTab('archive')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === 'archive'
              ? 'text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'archive' ? 'bg-indigo-500/15' : 'bg-transparent'
            }`}
          >
            <Archive className="w-5 h-5" />
          </div>
          <span className="text-[11px] leading-tight">آرشیو</span>
        </button>
      </div>
    </nav>
  );
};
