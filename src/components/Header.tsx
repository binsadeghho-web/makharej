import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { getCurrentShamsiDate } from '../utils/shamsi';
import { Wallet, Database, RefreshCw, CloudCheck, CloudAlert } from 'lucide-react';

interface HeaderProps {
  currentMonthName: string;
  onOpenSupabaseSettings: () => void;
  syncStatus: 'synced' | 'syncing' | 'error' | 'not_configured';
}

export const Header: React.FC<HeaderProps> = ({
  currentMonthName,
  onOpenSupabaseSettings,
  syncStatus,
}) => {
  const today = getCurrentShamsiDate();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-3 py-2.5">
      <div className="flex items-center justify-between">
        {/* Left: Supabase status & PWA Install */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSupabaseSettings}
            title="تنظیمات دیتابیس Supabase و کلادفلر"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 border ${
              syncStatus === 'synced'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                : syncStatus === 'syncing'
                ? 'bg-teal-500/15 border-teal-500/30 text-teal-400'
                : syncStatus === 'error'
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
            }`}
          >
            {syncStatus === 'synced' && <Database className="w-3.5 h-3.5 text-emerald-400" />}
            {syncStatus === 'syncing' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />}
            {syncStatus === 'error' && <Database className="w-3.5 h-3.5 text-rose-400" />}
            {syncStatus === 'not_configured' && <Database className="w-3.5 h-3.5 text-amber-400" />}
            <span className="text-[10px]">
              {syncStatus === 'synced'
                ? 'Supabase'
                : syncStatus === 'syncing'
                ? 'ذخیره...'
                : syncStatus === 'error'
                ? 'خطای دیتابیس'
                : 'اتصال Supabase'}
            </span>
          </button>

          <PWAInstallButton variant="compact" />
        </div>

        {/* Center: Month Active Badge */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold">{currentMonthName}</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-0.5">
            {today.dayOfWeekName} {today.fullFormatted}
          </span>
        </div>

        {/* Right: Brand Title */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <h1 className="text-xs font-extrabold text-white tracking-tight">مدیر مالی</h1>
            <span className="text-[9px] text-slate-400 block -mt-0.5">کلادفلر & Supabase</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
};
