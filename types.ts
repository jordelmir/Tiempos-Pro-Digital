export enum UserRole {
  SuperAdmin = 'SuperAdmin',
  Vendedor = 'Vendedor',
  Cliente = 'Cliente',
}

export enum DrawTime {
  MEDIODIA = 'Mediodía (12:55)',
  TARDE = 'Tarde (16:30)',
  NOCHE = 'Noche (19:30)',
}

export enum GameMode {
  TIEMPOS = 'Nuevos Tiempos (90x)',
  REVENTADOS = 'Reventados (200x)',
}

export interface AppUser {
  id: string;
  auth_uid: string;
  name: string;
  cedula: string;
  email?: string;
  phone: string;
  role: UserRole;
  balance_bigint: number;
  currency: string;
  status: 'Active' | 'Suspended' | 'Deleted';
  pin_hash?: string;
  failed_attempts?: number;
  locked_until?: string;
  issuer_id?: string;
  created_at: string;
  updated_at: string;
  active_numbers?: string[];
  recent_sale?: {
    target: string;
    amount: number;
  };
}

export interface Bet {
  id: string;
  ticket_code: string;
  user_id: string;
  vendor_id?: string;
  draw_id?: string;
  amount_bigint: number;
  numbers: string;
  mode: string;
  status: 'PENDING' | 'WON' | 'LOST' | 'REFUNDED';
  created_at: string;
}

export interface LedgerTransaction {
  id: string;
  ticket_code?: string;
  user_id: string;
  amount_bigint: number;
  balance_before: number;
  balance_after: number;
  type: 'CREDIT' | 'DEBIT' | 'FEE' | 'ADJUSTMENT' | 'COMMISSION_PAYOUT';
  reference_id?: string;
  meta?: any;
  created_at: string;
}

export enum AuditSeverity {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  FORENSIC = 'FORENSIC',
}

export enum AuditEventType {
  IDENTITY_REGISTER = 'IDENTITY_REGISTER',
  IDENTITY_COLLISION = 'IDENTITY_COLLISION',
  IDENTITY_VERIFICATION = 'IDENTITY_VERIFICATION',
  SESSION_LOGIN = 'SESSION_LOGIN',
  SESSION_FAILED = 'SESSION_FAILED',
  TX_DEPOSIT = 'TX_DEPOSIT',
  TX_WITHDRAWAL = 'TX_WITHDRAWAL',
  GAME_BET = 'GAME_BET',
  ADMIN_PURGE = 'ADMIN_PURGE',
  ADMIN_BLOCK = 'ADMIN_BLOCK',
  ADMIN_SETTINGS = 'ADMIN_SETTINGS',
  SYSTEM_INTEGRITY = 'SYSTEM_INTEGRITY',
  AI_OPERATION = 'AI_OPERATION',
  MAINTENANCE_OP = 'MAINTENANCE_OP',
  FINANCIAL_OP = 'FINANCIAL_OP',
}

export interface AuditLog {
  id: number;
  event_id: string;
  timestamp: string;
  actor_id: string;
  actor_role: string;
  actor_name: string;
  ip_address: string;
  device_fingerprint: string;
  type: AuditEventType;
  action: string;
  severity: AuditSeverity;
  target_resource?: string;
  metadata: any;
  hash: string;
  previous_hash?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface TransactionResponse {
  tx_id: string;
  ticket_code: string;
  new_balance: number;
  timestamp: string;
}

export interface DrawResultPayload {
  date: string;
  drawTime: DrawTime;
  winningNumber: string;
  isReventado: boolean;
  reventadoNumber?: string;
  actor_id: string;
}

export interface DrawResult {
  id: string;
  date: string;
  drawTime: DrawTime;
  winningNumber: string;
  isReventado: boolean;
  reventadoNumber?: string;
  status: 'OPEN' | 'CLOSED' | 'VERIFYING';
  created_at: string;
}

export interface WeeklyDataStats {
  year: number;
  weekNumber: number;
  recordCount: number;
  startDate: string;
  endDate: string;
  sizeEstimate: string;
}

export interface SystemSetting {
  key: string;
  value: any;
  description: string;
  group: 'CORE' | 'FINANCE' | 'RISK' | 'UI';
  updated_at: string;
  updated_by: string;
  is_locked?: boolean;
}

export interface MasterCatalogItem {
  id: string;
  category: string;
  code: string;
  label: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  metadata?: any;
  order_index: number;
}

export type PurgeTarget =
  | 'BETS_HISTORY'
  | 'AUDIT_LOGS'
  | 'RESULTS_HISTORY'
  | 'LEDGER_OLD'
  | 'DEEP_CLEAN';

export interface PurgeAnalysis {
  target: PurgeTarget;
  cutoffDate: string;
  recordCount: number;
  estimatedSizeKB: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  canProceed: boolean;
  description: string;
}

// Added missing RiskLimit export
export interface RiskLimit {
  draw_type: string;
  number: string;
  max_amount: number;
}

// Added missing RiskLimitStats export
export interface RiskLimitStats {
  number: string;
  total_sold: number;
  risk_percentage: number;
}

// Added missing RiskAnalysisReport export
export interface RiskAnalysisReport {
  draw: string;
  timestamp: string;
  stats: RiskLimitStats[];
  recommendations: string[];
}
