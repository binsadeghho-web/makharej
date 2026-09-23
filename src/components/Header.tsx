import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { getCurrentShamsiDate } from '../utils/shamsi';
import { Wallet, Sparkles, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentMonthName: string;
}

export const Header: React.FC<HeaderProps> = ({ currentMonthName }) => {
  const today = getCurrentShamsiDate();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: PWA Install & status */}
        <div className="flex items-center gap-2">
          <PWAInstallButton variant="compact" />
        </div>

        {/* Center: Month Active Badge */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold">{currentMonthName}</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">
            امروز: {today.dayOfWeekName} {today.fullFormatted}
          </span>
        </div>

        {/* Right: Brand Title */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <h1 className="text-xs font-extrabold text-white tracking-tight">مدیر مالی</h1>
            <span className="text-[9px] text-slate-400 block -mt-0.5">بودجه و مخارج</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
};
