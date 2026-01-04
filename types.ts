

export enum UserRole {
  SuperAdmin = 'SuperAdmin',
  Vendedor = 'Vendedor',
  Cliente = 'Cliente'
}

export enum LotteryRegion {
  TICA = 'CR',
  NICA = 'NI',
  DOMINICANA = 'DO',
  PANAMENA = 'PA'
}

export enum DrawTime {
  MEDIODIA = 'Mediodía (12:55)',
  TARDE = 'Tarde (16:30)',
  NOCHE = 'Noche (19:30)'
}

export enum GameMode {
  TIEMPOS = 'Nuevos Tiempos (90x)',
  REVENTADOS = 'Reventados (200x)'
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
  loyalty_points: number; 
  currency: string;
  status: 'Active' | 'Suspended' | 'Deleted';
  pin_hash?: string;
  failed_attempts?: number;
  locked_until?: string;
  issuer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RiskAnalysisSIPR {
    number: string;
    exposure_percent: number; 
    current_sold_bigint: number;
    max_allowed_bigint: number;
    risk_status: 'CYAN' | 'AMBAR' | 'BLOOD_RED';
    is_blocked: boolean;
    is_recommended: boolean;
    has_manual_limit: boolean;
    points_multiplier: number;
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

export interface DrawResult {
    id: string;
    region: LotteryRegion;
    date: string;
    drawTime: DrawTime;
    winningNumber: string;
    isReventado: boolean;
    reventadoNumber?: string;
    status: 'OPEN' | 'CLOSED' | 'VERIFYING';
    created_at: string;
}

export interface DrawResultPayload {
    date: string;
    drawTime: DrawTime;
    region: LotteryRegion;
    winningNumber: string;
    isReventado: boolean;
    actor_id: string;
}

export interface LedgerTransaction {
  id: string;
  user_id: string;
  amount_bigint: number;
  balance_before: number;
  balance_after: number;
  type: 'CREDIT' | 'DEBIT' | 'FEE' | 'ADJUSTMENT' | 'COMMISSION_PAYOUT' | 'LOYALTY_REDEEM';
  reference_id?: string;
  meta?: any;
  created_at: string;
}

export enum AuditSeverity {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  FORENSIC = 'FORENSIC'
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
  SIPR_LOCKDOWN = 'SIPR_LOCKDOWN',
  RISK_LIMIT_UPDATE = 'RISK_LIMIT_UPDATE'
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

export type PurgeTarget = 'BETS_HISTORY' | 'AUDIT_LOGS' | 'RESULTS_HISTORY' | 'LEDGER_OLD' | 'DEEP_CLEAN';

export interface PurgeAnalysis {
    target: PurgeTarget;
    cutoffDate: string;
    recordCount: number;
    estimatedSizeKB: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    canProceed: boolean;
    description: string;
}

export interface TransactionResponse {
  new_balance: number;
  tx_id: string;
}

export interface RiskLimitPayload {
    drawTime: string;
    number?: string; // If null, it's a global/collective limit for that draw
    limit_bigint: number;
    actor_id: string;
}

// Added missing maintenance interfaces
export interface SystemSetting {
  key: string;
  value: any;
  description?: string;
  category?: string;
}

export interface MasterCatalogItem {
  id: string;
  category: string;
  code: string;
  name: string;
  description?: string;
  metadata?: any;
  status: 'Active' | 'Deleted';
}
