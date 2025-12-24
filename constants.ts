// Supabase Configuration
// Supports Vite (import.meta.env) and Vercel System Env (process.env replacement)

// @ts-expect-error - import.meta.env might not be available in all environments
const viteEnv = import.meta.env;
const processEnv =
  typeof globalThis !== 'undefined' && 'process' in globalThis
    ? (globalThis as any).process.env
    : {};

export const SUPABASE_URL =
  viteEnv?.VITE_SUPABASE_URL ||
  processEnv?.SUPABASE_URL ||
  processEnv?.REACT_APP_SUPABASE_URL ||
  'https://your-project.supabase.co';

export const SUPABASE_ANON_KEY =
  viteEnv?.VITE_SUPABASE_ANON_KEY ||
  processEnv?.SUPABASE_ANON_KEY ||
  processEnv?.REACT_APP_SUPABASE_ANON_KEY ||
  'your-anon-key';

// Formatters
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
  }).format(amount / 100);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  AUDIT: '/admin/audit',
  LEDGER: '/ledger',
  VENDEDOR: '/vendedor',
  CLIENTE: '/cliente',
};
