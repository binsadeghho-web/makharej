import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, MonthlyFile } from '../types/finance';

const SUPABASE_CONFIG_KEY = 'shamsi_finance_supabase_config_v1';

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  secretKey?: string;
  isConfigured: boolean;
  isPlaceholder?: boolean;
}

function isValidHttpUrl(str: string): boolean {
  if (!str) return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Automatically resolve Supabase configuration from environment variables or cache
export function getStoredSupabaseConfig(): SupabaseConfig {
  // 1. Check environment variables first (Cloudflare / build / Vite .env)
  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
    ''
  ).trim();

  const envKey = (
    (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_PUBLISHABLE_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    (typeof process !== 'undefined' && process.env?.SUPABASE_PUBLISHABLE_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
    ''
  ).trim();

  const envSecret = (
    (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_SECRET_KEY) ||
    (typeof process !== 'undefined' && process.env?.SUPABASE_SECRET_KEY) ||
    ''
  ).trim();

  // 2. Check localStorage fallback only if not in env
  let finalUrl = envUrl;
  let finalKey = envKey;
  let finalSecret = envSecret;

  try {
    const local = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed) {
        if (!finalUrl && parsed.url) finalUrl = parsed.url;
        if (!finalKey && parsed.publishableKey) finalKey = parsed.publishableKey;
        if (!finalSecret && parsed.secretKey) finalSecret = parsed.secretKey;
      }
    }
  } catch (e) {
    console.error('Error reading supabase config from storage', e);
  }

  const isPlaceholder =
    finalUrl === 'your-project-url' ||
    finalKey === 'your-publishable-key' ||
    (!isValidHttpUrl(finalUrl) && Boolean(finalUrl));

  const isConfigured = Boolean(finalUrl && finalKey && isValidHttpUrl(finalUrl));

  return {
    url: finalUrl,
    publishableKey: finalKey,
    secretKey: finalSecret,
    isConfigured,
    isPlaceholder,
  };
}

let cachedClient: SupabaseClient | null = null;
let currentClientKey = '';

export function saveStoredSupabaseConfig(config: Partial<SupabaseConfig>): void {
  try {
    const current = getStoredSupabaseConfig();
    const updated = {
      url: (config.url ?? current.url).trim(),
      publishableKey: (config.publishableKey ?? current.publishableKey).trim(),
      secretKey: (config.secretKey ?? current.secretKey ?? '').trim(),
    };
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(updated));
    // Clear cached client to instantiate new credentials immediately
    cachedClient = null;
    currentClientKey = '';
  } catch (e) {
    console.error('Error saving supabase config', e);
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.isConfigured || !config.url || !config.publishableKey) {
    return null;
  }

  const keySignature = `${config.url}_${config.publishableKey}`;
  if (cachedClient && currentClientKey === keySignature) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    currentClientKey = keySignature;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client', err);
    return null;
  }
}

/**
 * Test connectivity with Supabase (both reading and writing)
 */
export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!isValidHttpUrl(url)) {
      return {
        success: false,
        message: 'آدرس URL وارد شده نامعتبر است. نمونه صحیح: https://xyzcompany.supabase.co',
      };
    }

    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Test connection and table existence
    const { error: selectError } = await client.from('finance_app_state').select('id').limit(1);

    if (selectError) {
      if (selectError.code === '42P01') {
        return {
          success: false,
          message: 'ارتباط با سرور Supabase برقرار شد، اما جدول finance_app_state در دیتابیس ساخته نشده است. لطفاً اسکریپت SQL پایین را در بخش SQL Editor داشبورد Supabase اجرا فرمایید.',
        };
      }
      if (selectError.code === '42501' || selectError.message?.includes('row-level security') || selectError.message?.includes('policy')) {
        return {
          success: false,
          message: 'دسترسی خواندن جدول توسط امنیت سطح سطر (RLS) مسدود شده است. لطفاً کد SQL زیر را در SQL Editor اجرا کنید.',
        };
      }
      return {
        success: false,
        message: `پاسخ از سرور: ${selectError.message} (کد: ${selectError.code || 'نامشخص'})`,
      };
    }

    // 2. Test write access
    const { error: writeError } = await client.from('finance_app_state').upsert(
      {
        id: 'connection_test_probe',
        data: { test: true, time: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (writeError) {
      return {
        success: false,
        message: `اتصال خواندن برقرار است اما ثبت داده مسدود است: ${writeError.message}. اسکریپت SQL پایین را در Supabase اجرا نمایید.`,
      };
    }

    // Clean up probe record
    await client.from('finance_app_state').delete().eq('id', 'connection_test_probe');

    return {
      success: true,
      message: 'اتصال، خواندن و ثبت اطلاعات در دیتابیس Supabase با موفقیت ۱۰۰٪ تأیید شد!',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `خطا در برقراری ارتباط: ${errorMsg}`,
    };
  }
}

/**
 * Sync entire AppState to Supabase database
 */
export async function pushStateToSupabase(state: AppState): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'دیتابیس Supabase پیکربندی نشده است' };
  }

  try {
    // 1. Save global state snapshot
    const { error: stateError } = await client.from('finance_app_state').upsert(
      {
        id: 'primary_state',
        data: state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (stateError) {
      console.warn('Supabase state upsert error:', stateError);
      if (stateError.code === '42P01') {
        return {
          success: false,
          error: 'جدول finance_app_state در دیتابیس وجود ندارد. لطفاً اسکریپت SQL را در SQL Editor سوپابیس اجرا فرمایید.',
        };
      }
      if (stateError.code === '42501' || stateError.message?.includes('row-level security')) {
        return {
          success: false,
          error: 'ثبت اطلاعات توسط RLS مسدود است. لطفاً اسکریپت SQL را در داشبورد سوپابیس اجرا نمایید.',
        };
      }
      return { success: false, error: stateError.message };
    }

    // 2. Also save current active file to monthly_files table if table exists
    const currentFile = state.currentFile;
    if (currentFile) {
      const { error: fileError } = await client.from('monthly_files').upsert(
        {
          id: currentFile.id,
          month_name: currentFile.monthName,
          year: currentFile.year,
          month: currentFile.month,
          status: currentFile.status,
          data: currentFile,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (fileError) {
        console.warn('Supabase monthly_files upsert warning:', fileError.message);
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Failed to sync to Supabase', err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Fetch latest AppState snapshot with timestamp from Supabase
 */
export async function fetchLatestSupabaseSnapshot(): Promise<{ state: AppState; updatedAt: string } | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('finance_app_state')
      .select('data, updated_at')
      .eq('id', 'primary_state')
      .single();

    if (error || !data || !data.data) {
      return null;
    }

    return {
      state: data.data as AppState,
      updatedAt: data.updated_at || '',
    };
  } catch (err) {
    console.warn('Failed to load snapshot from Supabase', err);
    return null;
  }
}

/**
 * Fetch latest AppState from Supabase
 */
export async function fetchStateFromSupabase(): Promise<AppState | null> {
  const snapshot = await fetchLatestSupabaseSnapshot();
  return snapshot ? snapshot.state : null;
}

/**
 * Subscribe to realtime changes broadcast by Supabase from other devices
 */
export function subscribeToSupabaseChanges(
  onRemoteUpdate: (remoteState: AppState, updatedAt: string) => void
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channelName = `realtime_sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'finance_app_state',
        },
        (payload: any) => {
          if (payload?.new && payload.new.data) {
            onRemoteUpdate(payload.new.data as AppState, payload.new.updated_at || new Date().toISOString());
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime websocket connected to Supabase');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime channel error notice:', err);
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Failed to subscribe to Supabase realtime:', err);
    return null;
  }
}

export const SUPABASE_SETUP_SQL = `-- دستور ساخت جدول و دسترسی کامل در بخش SQL Editor داشبورد Supabase:

-- ۱. ساخت جدول اطلاعات سراسری برنامه (finance_app_state)
create table if not exists public.finance_app_state (
  id text primary key default 'primary_state',
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ۲. ساخت جدول ماه‌های آرشیو و جاری (monthly_files)
create table if not exists public.monthly_files (
  id text primary key,
  month_name text not null,
  year integer not null,
  month integer not null,
  status text not null,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ۳. غیرفعال‌سازی RLS برای عملکرد بدون مانع با کلید ناشناس (anon)
alter table public.finance_app_state disable row level security;
alter table public.monthly_files disable row level security;

-- ۴. اعطای دسترسی مستقیم به کاربر عمومی (anon) و احراز هویت شده (authenticated)
grant all on table public.finance_app_state to anon, authenticated, service_role;
grant all on table public.monthly_files to anon, authenticated, service_role;

-- ۵. تعریف مجوزهای تکمیلی (در صورتی که RLS در پروژه اجباری باشد)
drop policy if exists "allow_anon_all_finance_app_state" on public.finance_app_state;
create policy "allow_anon_all_finance_app_state" on public.finance_app_state for all using (true) with check (true);

drop policy if exists "allow_anon_all_monthly_files" on public.monthly_files;
create policy "allow_anon_all_monthly_files" on public.monthly_files for all using (true) with check (true);

-- ۶. فعال‌سازی همگام‌سازی زنده و لحظه‌ای (Realtime) بین تمام دستگاه‌ها:
alter publication supabase_realtime add table public.finance_app_state;
alter publication supabase_realtime add table public.monthly_files;
`;
