import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { getCurrentShamsiDate } from '../utils/shamsi';
import { Wallet, RefreshCw, Cloud, Check } from 'lucide-react';

interface HeaderProps {
  currentMonthName: string;
  syncStatus?: 'synced' | 'syncing' | 'error' | 'not_configured';
}

export const Header: React.FC<HeaderProps> = ({
  currentMonthName,
  syncStatus = 'not_configured',
}) => {
  const today = getCurrentShamsiDate();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-3.5 py-2.5">
      <div className="flex items-center justify-between">
        {/* Left: Background Sync Indicator (only if active) & PWA Install */}
        <div className="flex items-center gap-1.5">
          {syncStatus === 'synced' && (
            <div
              title="اطلاعات به صورت خودکار در فضای ابری ذخیره است"
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
            >
              <Cloud className="w-3 h-3 text-emerald-400" />
              <span>ابری</span>
            </div>
          )}

          {syncStatus === 'syncing' && (
            <div
              title="در حال همگام‌سازی خودکار با سرور"
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-teal-500/15 border border-teal-500/30 text-teal-400"
            >
              <RefreshCw className="w-3 h-3 animate-spin text-teal-400" />
              <span>ذخیره...</span>
            </div>
          )}

          <PWAInstallButton variant="compact" />
        </div>

        {/* Center: Month Active Badge */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold">{currentMonthName}</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
            {today.dayOfWeekName} {today.fullFormatted}
          </span>
        </div>

        {/* Right: Brand Title */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <h1 className="text-xs font-extrabold text-white tracking-tight">مدیریت مخارج</h1>
            <span className="text-[9px] text-slate-400 block -mt-0.5 font-medium">بودجه‌بندی هوشمند</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
};
