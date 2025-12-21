import { supabase } from './supabaseClient';

// Types mirror the Kotlin backend enums
export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  FORENSIC = 'FORENSIC'
}

export enum AuditCategory {
  AUTH = 'AUTH',
  DATA = 'DATA',
  SYSTEM = 'SYSTEM',
  FINANCIAL = 'FINANCIAL',
  ADMIN = 'ADMIN'
}

interface AuditPayload {
  action: string;
  category: AuditCategory;
  severity: AuditSeverity;
  target?: string; // Resource ID
  details?: any;
}

export const auditLogger = {
  /**
   * Registra un evento de auditoría. 
   * Intenta enviar al backend Kotlin si existe, o inserta directo en Supabase 'audit_secure.logs'.
   */
  log: async (payload: AuditPayload) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: session } = await supabase.auth.getSession();

      // En un entorno real, esto iría a una API Route (/api/audit) que a su vez llama al servicio Kotlin.
      // Para esta arquitectura serverless, escribimos en Supabase que tiene el Trigger de Hashing.
      
      const logEntry = {
        actor_id: user?.id, // Puede ser null para acciones del sistema
        session_id: session?.session?.access_token?.slice(-10), // Short hash of session
        category: payload.category,
        action_type: payload.action,
        severity: payload.severity,
        resource_id: payload.target,
        metadata: payload.details,
        // integrity_hash es calculado por el Trigger DB
      };

      // Usamos RPC o Insert directo si la policy lo permite
      // Nota: Idealmente 'audit_secure' es solo insertable por Server Role.
      const { error } = await supabase
        .from('audit_trail') // Usamos la tabla pública mapeada o la segura vía Edge Function
        .insert([
             {
                 actor_app_user: user?.id, // Mapping legacy field for now
                 action: payload.action,
                 object_type: payload.category,
                 object_id: payload.target,
                 payload: payload.details
                 // El sistema legacy se actualiza al nuevo esquema vía trigger o migración
             }
        ]);

      if (error) console.error("Audit Log Error:", error);

    } catch (e) {
      console.error("Critical Audit Failure:", e);
    }
  },

  logCritical: async (action: string, details: any) => {
    await auditLogger.log({
        action,
        category: AuditCategory.SYSTEM,
        severity: AuditSeverity.CRITICAL,
        details
    });
  }
};
