import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Download,
  Upload,
  Server,
  Zap,
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  testSupabaseConnection,
  pushStateToSupabase,
  SUPABASE_SETUP_SQL,
} from '../services/supabase';
import { probeDatabaseBackend, DatabaseProvider } from '../services/storage';
import { AppState } from '../types/finance';

interface DatabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: AppState;
  onRestoreState: (state: AppState) => void;
  onRefreshSync: () => void;
  showToast: (msg: string) => void;
}

export const DatabaseSettingsModal: React.FC<DatabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  currentState,
  onRestoreState,
  onRefreshSync,
  showToast,
}) => {
  const [activeProvider, setActiveProvider] = useState<DatabaseProvider>('local');
  const [isServerAvailable, setIsServerAvailable] = useState(false);
  const [isStaticHost, setIsStaticHost] = useState(false);

  // Form states for Supabase
  const [url, setUrl] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);

  // Load current configuration when modal opens
  useEffect(() => {
    if (isOpen) {
      const config = getStoredSupabaseConfig();
      setUrl(config.url || '');
      setPublishableKey(config.publishableKey || '');
      setTestResult(null);

      probeDatabaseBackend(true).then((res) => {
        setActiveProvider(res.activeProvider);
        setIsServerAvailable(res.isServer);
        setIsStaticHost(res.isStaticHost);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url.trim() || !publishableKey.trim()) {
      setTestResult({
        success: false,
        message: 'لطفاً آدرس Project URL و کلید Anon Key سوپابیس را وارد فرمایید.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await testSupabaseConnection(url.trim(), publishableKey.trim());
    setIsTesting(false);
    setTestResult(result);
  };

  const handleSaveConfig = async () => {
    if (!url.trim() || !publishableKey.trim()) {
      showToast('لطفاً آدرس و کلید دیتابیس را تکمیل فرمایید');
      return;
    }

    setIsSavingCloud(true);
    saveStoredSupabaseConfig({
      url: url.trim(),
      publishableKey: publishableKey.trim(),
    });

    // Push current data immediately to Supabase
    const pushResult = await pushStateToSupabase(currentState);
    setIsSavingCloud(false);

    if (pushResult.success) {
      showToast('دیتابیس ابری با موفقیت متصل و داده‌ها همگام شدند');
      onRefreshSync();
      onClose();
    } else {
      showToast('تنظیمات ذخیره شد، اما در ذخیره اطلاعات خطایی رخ داد');
      setTestResult({
        success: false,
        message:
          pushResult.error ||
          'جدول finance_app_state ساخته نشده یا دسترسی RLS مسدود است. لطفاً اسکریپت SQL پایین را در بخش SQL Editor داشبورد Supabase اجرا فرمایید.',
      });
    }
  };

  const handleDisconnect = () => {
    saveStoredSupabaseConfig({ url: '', publishableKey: '' });
    setUrl('');
    setPublishableKey('');
    setTestResult(null);
    showToast('اتصال دیتابیس ابری قطع شد');
    onRefreshSync();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    showToast('دستور ساخت جدول در کلیپ‌بورد کپی شد');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentState, null, 2));
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
            onRestoreState(parsed);
            showToast('اطلاعات با موفقیت از فایل پشتیبان بازیابی شد');
            onClose();
          } else {
            showToast('فرمت فایل نامعتبر است');
          }
        } catch {
          showToast('خطا در خواندن فایل پشتیبان');
        }
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-t-[32px] sm:rounded-3xl bg-slate-900 border border-slate-800 text-right overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h3 className="text-base font-extrabold text-white flex items-center justify-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>تنظیمات پایگاه داده و ذخیره‌سازی</span>
            </h3>
            <span className="text-[11px] text-slate-400">ماندگاری داده‌ها در تمامی شرایط و هاست‌ها</span>
          </div>
          <div className="w-7" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Active Status Badge */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              وضعیت فعلی مخزن داده‌ها:
            </span>

            {isServerAvailable ? (
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                <Server className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-emerald-300">دیتابیس سرور Node.js فعال است</div>
                  <p className="text-[11px] text-emerald-400/80 mt-0.5 leading-relaxed">
                    شما در محیط سرور متصل هستید و داده‌ها به شکل دائمی در فایل دیتابیس سرور ذخیره می‌شوند (با مهلت ثبت ۳ ثانیه).
                  </p>
                </div>
              </div>
            ) : activeProvider === 'supabase' ? (
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                <Cloud className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-emerald-300">دیتابیس ابری Supabase متصل است</div>
                  <p className="text-[11px] text-emerald-400/80 mt-0.5 leading-relaxed">
                    داده‌ها مستقیماً در دیتابیس ابری شما ذخیره می‌شوند و حتی در صورت پاک کردن تاریخچه مرورگر کاملاً محفوظ می‌مانند.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <HardDrive className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-300">پایگاه داده محلی (IndexedDB + مرورگر)</div>
                  <p className="text-[11px] text-amber-400/80 mt-0.5 leading-relaxed">
                    {isStaticHost
                      ? 'هاست شما استاتیک است (مانند Cloudflare Pages). برای حفظ داده‌ها در صورت پاک کردن تاریخچه مرورگر، دیتابیس رایگان Supabase را در پایین متصل نمایید.'
                      : 'داده‌ها در حافظه پایدار مرورگر شما ذخیره شده‌اند.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Cloud Database (Supabase) Setup Section */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-white text-xs">اتصال به دیتابیس ابری Supabase</span>
              </div>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-medium">
                رایگان و پایدار
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              با اتصال به دیتابیس رایگان ابری، اطلاعات مالی شما در سرور امن نگهداری شده و با رفرش یا پاک کردن تاریخچه مرورگر، از بین نخواهد رفت.
            </p>

            <div className="space-y-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  آدرس پروژه (Project URL)
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-left dir-ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  کلید عمومی (anon / public key)
                </label>
                <input
                  type="password"
                  value={publishableKey}
                  onChange={(e) => setPublishableKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-left dir-ltr"
                />
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>تست اتصال</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isSavingCloud}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingCloud ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>ذخیره و فعال‌سازی</span>
                </button>
              </div>

              {getStoredSupabaseConfig().isConfigured && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="w-full py-1.5 text-center text-[11px] text-rose-400 hover:underline cursor-pointer"
                >
                  قطع ارتباط با این دیتابیس ابری
                </button>
              )}
            </div>

            {/* SQL Table Creation Helper */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-400">کد SQL ساخت جدول در Supabase:</span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-1 text-[10px] text-teal-400 hover:underline cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSql ? 'کپی شد!' : 'کپی دستور SQL'}</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-400 font-mono text-left dir-ltr overflow-x-auto max-h-24">
                {SUPABASE_SETUP_SQL}
              </pre>
            </div>

            {/* Cloudflare Pages Guidance */}
            <div className="p-3 rounded-xl bg-slate-950/90 border border-sky-800/40 text-[11px] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-sky-400 text-xs">
                <Cloud className="w-3.5 h-3.5" />
                <span>راهنمای ویژه هاست کلادفلر (Cloudflare Pages):</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed">
                روی هاست‌های استاتیک نظیر Cloudflare Pages سرور بک‌اند نودجی‌اس وجود ندارد، اما اتصال به دیتابیس Supabase مستقیماً و با امنیت کامل از طریق مرورگر انجام می‌شود:
              </p>
              <div className="space-y-1 text-[10px] text-slate-400 pr-1">
                <p>
                  • <strong className="text-white">روش ۱ (آنی و بدون نیاز به بیلد مجدد):</strong> کافی است Project URL و Anon Key سوپابیس را در همین پنجره وارد کرده و دکمه «ذخیره و فعال‌سازی» را بزنید.
                </p>
                <p>
                  • <strong className="text-white">روش ۲ (از طریق داشبورد کلادفلر):</strong> در منوی Cloudflare Pages &gt; Settings &gt; Environment variables متغیرهای <code className="text-teal-300 font-mono">VITE_SUPABASE_URL</code> و <code className="text-teal-300 font-mono">VITE_SUPABASE_ANON_KEY</code> را وارد نمایید.
                </p>
                <p>
                  • <strong className="text-amber-300">مرحله حیاتی:</strong> حتماً کد SQL بالا را در SQL Editor داشبورد Supabase اجرا کنید تا جدول‌ها، مجوزهای دسترسی و انتشار زنده (Realtime) فعال گردند.
                </p>
              </div>
            </div>

            {/* Multi-Device Sync Guide */}
            <div className="p-3 rounded-xl bg-slate-950/90 border border-emerald-800/40 text-[11px] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>چک‌لیست همگام‌سازی بین دو دستگاه (موبایل و لپ‌تاپ):</span>
              </div>
              <div className="space-y-1 text-[10px] text-slate-300 leading-relaxed pr-1">
                <p>
                  ۱. <strong className="text-white">بررسی نشان بالای صفحه در هر دو دستگاه:</strong> در بالای صفحه هر دو دستگاه باید نشان سبز رنگ <strong>«دیتابیس ابری»</strong> دیده شود. اگر در یکی از دستگاه‌ها نشان زرد <strong>«دیتابیس محلی»</strong> است، یعنی URL و Key سوپابیس هنوز در آن دستگاه وارد نشده است.
                </p>
                <p>
                  ۲. <strong className="text-white">همگام‌سازی زنده (Realtime):</strong> برنامه به محض ثبت داده در یک دستگاه، تغییرات را به‌صورت زنده به دستگاه دیگر می‌فرستد. همچنین با باز کردن دوباره تب یا زدن آیکون رفرش کنار نشان دیتابیس، سریعاً آخرین تغییرات فراخوانی می‌شوند.
                </p>
              </div>
            </div>
          </div>

          {/* Backup & Restore Section */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white text-xs">پشتیبان‌گیری دستی (آفلاین)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              در هر لحظه می‌توانید یک نسخه کامل از تمامی ماه‌ها، بودجه‌ها و واریزی‌ها را به شکل فایل JSON در گوشی یا کامپیوتر خود ذخیره کنید.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>دانلود پشتیبان</span>
              </button>

              <label className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 text-center">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>بازیابی فایل</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
