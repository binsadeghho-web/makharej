import React, { useState } from 'react';
import { Budget, Expense } from '../types/finance';
import { getBudgetCalculations } from '../services/storage';
import { formatMoney, toPersianDigits } from '../utils/shamsi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import { BarChart3, TrendingDown, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

interface BudgetSummaryChartProps {
  budgets: Budget[];
  expenses: Expense[];
  currencyUnit?: string;
}

interface ChartCategoryItem {
  id: string;
  name: string;
  budgetLimit: number; // سقف بودجه
  spending: number; // مخارج کسر شده
  remaining: number; // مانده بودجه (یا کسری)
  percentage: number;
  color: string;
  isOverBudget: boolean;
}

export const BudgetSummaryChart: React.FC<BudgetSummaryChartProps> = ({
  budgets,
  expenses,
  currencyUnit = 'تومان',
}) => {
  const [viewMode, setViewMode] = useState<'horizontal' | 'vertical'>('horizontal');

  // Prepare chart data per budget category
  const chartData: ChartCategoryItem[] = budgets.map((b) => {
    const { spent, remaining, percentage, isOverBudget } = getBudgetCalculations(b, expenses);
    return {
      id: b.id,
      name: b.title,
      budgetLimit: b.allocatedAmount,
      spending: spent,
      remaining,
      percentage: Math.round(percentage),
      color: b.color,
      isOverBudget,
    };
  });

  const totalBudget = chartData.reduce((sum, item) => sum + item.budgetLimit, 0);
  const totalSpent = chartData.reduce((sum, item) => sum + item.spending, 0);
  const totalPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const overBudgetCategoriesCount = chartData.filter((i) => i.isOverBudget).length;

  if (budgets.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl text-center space-y-2">
        <BarChart3 className="w-10 h-10 text-slate-600 mx-auto" />
        <p className="text-xs font-semibold text-slate-300">سرفصل بودجه‌ای تعریف نشده است</p>
        <p className="text-[11px] text-slate-500">
          برای مشاهده نمودار مقایسه مخارج با سقف بودجه، ابتدا سرفصل‌های خود را اضافه کنید.
        </p>
      </div>
    );
  }

  // Custom Tooltip component in Persian
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ChartCategoryItem = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl text-right text-xs dir-rtl min-w-[210px] backdrop-blur-md">
          <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-slate-800">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-bold text-white text-sm">{data.name}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" />
                سقف بودجه:
              </span>
              <span className="font-extrabold text-indigo-300">
                {formatMoney(data.budgetLimit, currencyUnit)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                مخارج کسرشده:
              </span>
              <span className="font-extrabold text-rose-400">
                {formatMoney(data.spending, currencyUnit)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
              <span className="text-slate-400">
                {data.isOverBudget ? 'کسری سقف:' : 'مانده بودجه:'}
              </span>
              <span
                className={`font-bold ${
                  data.isOverBudget ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {formatMoney(Math.abs(data.remaining), currencyUnit)}
                {data.isOverBudget && ' -'}
              </span>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">درصد مصرف:</span>
              <span
                className={`font-black px-2 py-0.5 rounded-md ${
                  data.isOverBudget
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : data.percentage > 85
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {toPersianDigits(data.percentage)}٪
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const dynamicHeight = viewMode === 'horizontal' ? Math.max(260, chartData.length * 60) : 300;

  return (
    <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-4 text-right">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">مقایسه مخارج با سقف بودجه</h3>
            <p className="text-[10px] text-slate-400">تفکیک هر سرفصل بر اساس Recharts</p>
          </div>
        </div>

        {/* Layout Toggle */}
        <div className="flex p-0.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
          <button
            onClick={() => setViewMode('horizontal')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              viewMode === 'horizontal'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            افقی
          </button>
          <button
            onClick={() => setViewMode('vertical')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              viewMode === 'vertical'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            عمودی
          </button>
        </div>
      </div>

      {/* Mini KPI summary pill */}
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">جذب کل بودجه:</span>
          <span className="font-extrabold text-white">{toPersianDigits(totalPercentage)}٪</span>
        </div>

        {overBudgetCategoriesCount > 0 ? (
          <div className="flex items-center gap-1 text-rose-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{toPersianDigits(overBudgetCategoriesCount)} سرفصل بیش از سقف</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تمام سرفصل‌ها در محدوده مجاز</span>
          </div>
        )}
      </div>

      {/* Recharts Container */}
      <div style={{ width: '100%', height: dynamicHeight }} className="dir-ltr select-none">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'horizontal' ? (
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 5, right: 15, left: 20, bottom: 5 }}
              barGap={3}
              barCategoryGap={12}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1000000
                    ? `${(v / 1000000).toFixed(0)}M`
                    : v >= 1000
                    ? `${(v / 1000).toFixed(0)}k`
                    : String(v)
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
              <Bar
                dataKey="budgetLimit"
                name="سقف بودجه"
                fill="#4f46e5"
                radius={[0, 6, 6, 0]}
                barSize={10}
              />
              <Bar
                dataKey="spending"
                name="مخارج کسرشده"
                fill="#f43f5e"
                radius={[0, 6, 6, 0]}
                barSize={10}
              />
            </BarChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
              barGap={4}
              barCategoryGap={14}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1000000
                    ? `${(v / 1000000).toFixed(0)}M`
                    : v >= 1000
                    ? `${(v / 1000).toFixed(0)}k`
                    : String(v)
                }
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
              <Bar
                dataKey="budgetLimit"
                name="سقف بودجه"
                fill="#4f46e5"
                radius={[6, 6, 0, 0]}
                barSize={12}
              />
              <Bar
                dataKey="spending"
                name="مخارج کسرشده"
                fill="#f43f5e"
                radius={[6, 6, 0, 0]}
                barSize={12}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="w-3 h-3 rounded-md bg-indigo-600 shrink-0" />
          <span className="font-semibold text-slate-300">سقف مصوب بودجه</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="w-3 h-3 rounded-md bg-rose-500 shrink-0" />
          <span className="font-semibold text-slate-300">مخارج مصرف‌شده</span>
        </div>
      </div>
    </div>
  );
};
