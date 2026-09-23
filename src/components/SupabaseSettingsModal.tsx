import React, { useState, useEffect } from 'react';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SETUP_SQL,
  SupabaseConfig,
} from '../services/supabase';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Cloud,
  ShieldAlert,
} from 'lucide-react';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
  syncStatus: 'synced' | 'syncing' | 'error' | 'not_configured';
  onManualSync: () => void;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
  syncStatus,
  onManualSync,
}) => {
  const [url, setUrl] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredSupabaseConfig();
      setUrl(cfg.url);
      setPublishableKey(cfg.publishableKey);
      setSecretKey(cfg.secretKey || '');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const config: SupabaseConfig = {
      url: url.trim(),
      publishableKey: publishableKey.trim(),
      secretKey: secretKey.trim(),
      isConfigured: Boolean(url.trim() && publishableKey.trim()),
    };

    saveStoredSupabaseConfig(config);
    onConfigSaved();
    onClose();
  };

  const handleTest = async () => {
    if (!url.trim() || !publishableKey.trim()) {
      setTestResult({
        success: false,
        message: 'لطفاً آدرس SUPABASE_URL و کلید PUBLISHABLE_KEY را وارد کنید.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(url.trim(), publishableKey.trim());
    setIsTesting(false);
    setTestResult(res);
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 text-right animate-in fade-in duration-150">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-t-[32px] sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <h3 className="text-sm font-bold text-white">تنظیمات دیتابیس Supabase</h3>
              <p className="text-[10px] text-emerald-400">ذخیره‌سازی ابری روی کلادفلر و Supabase</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">وضعیت فعلی همگام‌سازی:</span>
            {syncStatus === 'synced' && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>متصل و ذخیره در Supabase</span>
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span className="flex items-center gap-1.5 text-teal-400 font-bold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>در حال ارسال به دیتابیس...</span>
              </span>
            )}
            {syncStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>خطا در ارتباط با دیتابیس</span>
              </span>
            )}
            {syncStatus === 'not_configured' && (
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Cloud className="w-3.5 h-3.5" />
                <span>نیاز به تنظیم اطلاعات اتصال</span>
              </span>
            )}
          </div>

          <p className="text-slate-300 leading-5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-[11px]">
            طبق درخواست شما، تمامی پرونده‌ها، واریزی‌ها، بودجه‌ها و مخارج مستقیماً در دیتابیس <strong>Supabase</strong> ذخیره می‌شوند و سیاست‌های RLS نیز جهت دسترسی مستقیم غیرفعال در نظر گرفته شده است.
          </p>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                SUPABASE_URL <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-left dir-ltr font-mono text-[11px] focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                SUPABASE_PUBLISHABLE_KEY (یا Anon Key) <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={2}
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-left dir-ltr font-mono text-[11px] focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-400 mb-1 flex items-center justify-between">
                <span>SUPABASE_SECRET_KEY (اختیاری)</span>
                <span className="text-[10px] text-slate-500">جهت نگهداری تنظیمات</span>
              </label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="sbp_... (اختیاری)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-left dir-ltr font-mono text-[11px] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Test connection result */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* SQL Setup Helper */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300">کد SQL ساخت جدول در Supabase</span>
              <button
                type="button"
                onClick={copySqlToClipboard}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition active:scale-95"
              >
                {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'کپی شد!' : 'کپی دستور SQL'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-4">
              در پنل Supabase به تب <strong>SQL Editor</strong> بروید، این کد را پیست کرده و روی Run بزنید تا جدول داده‌ها ایجاد شود (RLS هم طبق دستور شما غیرفعال شده است).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            {isTesting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Database className="w-3.5 h-3.5 text-teal-400" />
            )}
            <span>تست اتصال</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-md shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>ذخیره و همگام‌سازی</span>
          </button>
        </div>
      </div>
    </div>
  );
};
