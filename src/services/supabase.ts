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

export function saveStoredSupabaseConfig(config: Partial<SupabaseConfig>): void {
  try {
    const current = getStoredSupabaseConfig();
    const updated = {
      url: (config.url ?? current.url).trim(),
      publishableKey: (config.publishableKey ?? current.publishableKey).trim(),
      secretKey: (config.secretKey ?? current.secretKey ?? '').trim(),
    };
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving supabase config', e);
  }
}

let cachedClient: SupabaseClient | null = null;
let currentClientKey = '';

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
 * Test connectivity with Supabase
 */
export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!isValidHttpUrl(url)) {
      return {
        success: false,
        message: 'آدرس URL وارد شده معتبر نیست. لطفاً آدرس معتبر مانند https://xyz.supabase.co وارد فرمایید.',
      };
    }

    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await client.from('finance_app_state').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'اتصال به Supabase موفقیت‌آمیز است. جدول finance_app_state ساخته شود.',
        };
      }
      return {
        success: false,
        message: `خطای سرور: ${error.message}`,
      };
    }

    return {
      success: true,
      message: 'اتصال موفقیت‌آمیز بود و جدول دیتابیس نیز شناسایی شد.',
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
export async function pushStateToSupabase(state: AppState): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

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
      console.warn('Supabase state upsert error:', stateError.message);
    }

    // 2. Also save current active file to monthly_files table if table exists
    const currentFile = state.currentFile;
    await client.from('monthly_files').upsert(
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

    return true;
  } catch (err) {
    console.error('Failed to sync to Supabase', err);
    return false;
  }
}

/**
 * Fetch latest AppState from Supabase
 */
export async function fetchStateFromSupabase(): Promise<AppState | null> {
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

    return data.data as AppState;
  } catch (err) {
    console.error('Failed to load from Supabase', err);
    return null;
  }
}

export const SUPABASE_SETUP_SQL = `-- دستور ساخت جدول در بخش SQL Editor در داشبورد Supabase:
create table if not exists finance_app_state (
  id text primary key default 'primary_state',
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table finance_app_state disable row level security;

create table if not exists monthly_files (
  id text primary key,
  month_name text not null,
  year integer not null,
  month integer not null,
  status text not null,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table monthly_files disable row level security;
`;
