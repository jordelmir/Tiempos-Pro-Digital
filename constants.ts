
// Supabase Configuration
// Supports Vite (import.meta.env) and Vercel System Env (process.env replacement)

// @ts-ignore
const viteEnv = import.meta.env;
// @ts-ignore
const processEnv = typeof process !== 'undefined' ? process.env : {};

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
export const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0
  }).format(cents / 100);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  AUDIT: '/admin/audit',
  LEDGER: '/ledger',
  VENDEDOR: '/vendedor',
  CLIENTE: '/cliente'
};
