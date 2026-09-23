import React, { useState } from 'react';
import { toPersianDigits, formatMoney } from '../utils/shamsi';

interface SliceData {
  id: string;
  title: string;
  amount: number;
  color: string;
  percentage: number;
}

interface BudgetDonutChartProps {
  data: SliceData[];
  totalAmount: number;
  centerSubtitle?: string;
  unit?: string;
}

export const BudgetDonutChart: React.FC<BudgetDonutChartProps> = ({
  data,
  totalAmount,
  centerSubtitle = 'مجموع',
  unit = 'تومان',
}) => {
  const [activeSlice, setActiveSlice] = useState<SliceData | null>(null);

  // Filter out zero amount slices for chart drawing
  const validData = data.filter((d) => d.amount > 0);

  if (validData.length === 0 || totalAmount <= 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 rounded-3xl border border-slate-800 text-center">
        <div className="w-16 h-16 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center mb-3">
          <span className="text-xl text-slate-500">٪</span>
        </div>
        <p className="text-sm font-medium text-slate-400">هنوز داده‌ای برای نمایش در نمودار ثبت نشده است</p>
        <span className="text-xs text-slate-600 mt-1">با ثبت اولین خرج یا بودجه، نمودار اینجا ترسیم می‌شود</span>
      </div>
    );
  }

  // Calculate SVG donut paths
  const size = 260;
  const strokeWidth = 38;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedAngle = -90; // Start at top (12 o'clock)

  const slices = validData.map((item) => {
    const ratio = item.amount / totalAmount;
    const strokeDasharray = `${ratio * circumference} ${circumference}`;
    const rotation = accumulatedAngle;
    accumulatedAngle += ratio * 360;

    return {
      ...item,
      ratio,
      strokeDasharray,
      rotation,
    };
  });

  const displayItem = activeSlice || null;

  return (
    <div className="flex flex-col items-center">
      {/* SVG Donut */}
      <div className="relative w-[240px] h-[240px] flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full transform -rotate-0 transition-transform duration-300"
        >
          {/* Subtle background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />

          {slices.map((slice) => {
            const isSelected = activeSlice?.id === slice.id;
            return (
              <circle
                key={slice.id}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isSelected ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={0}
                style={{
                  transformOrigin: `${center}px ${center}px`,
                  transform: `rotate(${slice.rotation}deg)`,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  opacity: activeSlice && !isSelected ? 0.45 : 1,
                }}
                onClick={() => setActiveSlice(isSelected ? null : slice)}
                onTouchStart={() => setActiveSlice(isSelected ? null : slice)}
              />
            );
          })}
        </svg>

        {/* Center content */}
        <div
          className="absolute inset-0 m-auto flex flex-col items-center justify-center text-center px-4 pointer-events-none"
          style={{ width: radius * 2 - strokeWidth, height: radius * 2 - strokeWidth }}
        >
          {displayItem ? (
            <div className="animate-in fade-in zoom-in-95 duration-150">
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full mb-1 inline-block"
                style={{ backgroundColor: `${displayItem.color}25`, color: displayItem.color }}
              >
                {displayItem.title}
              </span>
              <p className="text-base font-extrabold text-white tracking-tight leading-tight">
                {formatMoney(displayItem.amount, '')}
              </p>
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mt-0.5">
                <span>{unit}</span>
                <span className="font-bold text-emerald-400">({toPersianDigits(displayItem.percentage.toFixed(1))}٪)</span>
              </div>
            </div>
          ) : (
            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-0.5">{centerSubtitle}</span>
              <p className="text-base font-extrabold text-white tracking-tight leading-tight">
                {formatMoney(totalAmount, '')}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">{unit}</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend list */}
      <div className="w-full mt-4 grid grid-cols-2 gap-2 text-right">
        {validData.map((item) => {
          const isSelected = activeSlice?.id === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSlice(isSelected ? null : item)}
              className={`flex items-center justify-between p-2 rounded-xl transition-all border ${
                isSelected
                  ? 'bg-slate-800 border-slate-600 shadow-sm'
                  : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium text-slate-200 truncate">{item.title}</span>
              </div>
              <span className="text-xs font-bold text-slate-300 mr-1 shrink-0">
                {toPersianDigits(item.percentage.toFixed(0))}٪
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
