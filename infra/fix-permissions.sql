-- ==============================================================================
-- SCRIPT DE MANTENIMIENTO: PERMISOS Y SEGURIDAD (FIX COMPLETO)
-- ==============================================================================
-- Ejecuta este script en el SQL Editor de Supabase para reparar todos los permisos
-- necesarios para que la aplicación funcione en modo Servidor Directo.
-- ==============================================================================

-- 1. PUBLICACIÓN DE SORTEOS
DROP POLICY IF EXISTS "Allow authenticated insert results" ON public.draw_results;
CREATE POLICY "Allow authenticated insert results" ON public.draw_results FOR INSERT TO authenticated WITH CHECK (true);

-- 2. GESTIÓN DE USUARIOS (Eliminar/Bloquear)
DROP POLICY IF EXISTS "Allow authenticated delete users" ON public.app_users;
CREATE POLICY "Allow authenticated delete users" ON public.app_users FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated update users" ON public.app_users;
CREATE POLICY "Allow authenticated update users" ON public.app_users FOR UPDATE TO authenticated USING (true);

-- 3. BITÁCORA FORENSE (Logs de Auditoría)
-- Permite que la app registre eventos de seguridad
DROP POLICY IF EXISTS "Allow authenticated insert audit" ON public.audit_trail;
CREATE POLICY "Allow authenticated insert audit" ON public.audit_trail FOR INSERT TO authenticated WITH CHECK (true);

-- 4. LIBRO MAYOR (Transacciones)
-- Permite registrar depósitos, retiros y premios
DROP POLICY IF EXISTS "Allow authenticated insert ledger" ON public.ledger_transactions;
CREATE POLICY "Allow authenticated insert ledger" ON public.ledger_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- 5. APUESTAS (Garantizar Registro)
DROP POLICY IF EXISTS "Allow authenticated insert bets" ON public.bets;
CREATE POLICY "Allow authenticated insert bets" ON public.bets FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update bets" ON public.bets;
CREATE POLICY "Allow authenticated update bets" ON public.bets FOR UPDATE TO authenticated USING (true);

-- 6. SYSTEM SETTINGS (Global Config)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Policies for system_settings
DROP POLICY IF EXISTS "Allow authenticated select settings" ON public.system_settings;
CREATE POLICY "Allow authenticated select settings" ON public.system_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated update settings" ON public.system_settings;
CREATE POLICY "Allow authenticated update settings" ON public.system_settings FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert settings" ON public.system_settings;
CREATE POLICY "Allow authenticated insert settings" ON public.system_settings FOR INSERT TO authenticated WITH CHECK (true);

-- 7. MAINTENANCE (Purge)
-- Allow deleting old records
DROP POLICY IF EXISTS "Allow authenticated delete bets" ON public.bets;
CREATE POLICY "Allow authenticated delete bets" ON public.bets FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete results" ON public.draw_results;
CREATE POLICY "Allow authenticated delete results" ON public.draw_results FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete ledger" ON public.ledger_transactions;
CREATE POLICY "Allow authenticated delete ledger" ON public.ledger_transactions FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete audit" ON public.audit_trail;
CREATE POLICY "Allow authenticated delete audit" ON public.audit_trail FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated select audit" ON public.audit_trail;
CREATE POLICY "Allow authenticated select audit" ON public.audit_trail FOR SELECT TO authenticated USING (true);

-- ==============================================================================
-- INSTRUCCIONES:
-- 1. Copia todo este código.
-- 2. Ve a https://supabase.com/dashboard/project/wlchcilkfyfcnvsamvyn/sql
-- 3. Pega y ejecuta (RUN).
-- 4. Vuelve a la App y prueba de nuevo.
-- ==============================================================================
