-- infra/sql/01_rls_policies.sql
-- Row Level Security for Tiempos Pro Digital
-- Author: Software Architect

-- Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_limits ENABLE ROW LEVEL SECURITY;

-- Helper Function for Role checking
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. PROFILES POLICIES
-- Everyone can read their own profile
CREATE POLICY "profiles_read_own" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- SuperAdmin can read all profiles
CREATE POLICY "profiles_admin_all" ON public.profiles
FOR SELECT USING (public.get_auth_role() = 'SuperAdmin');

-- Vendors can read their clients
CREATE POLICY "profiles_vendor_clients" ON public.profiles
FOR SELECT USING (issuer_id = auth.uid());

-- 2. DRAWS POLICIES
-- Everyone can read draws
CREATE POLICY "draws_read_all" ON public.draws
FOR SELECT TO authenticated USING (true);

-- Only Admin can modify draws
CREATE POLICY "draws_admin_modify" ON public.draws
FOR ALL USING (public.get_auth_role() = 'SuperAdmin');

-- 3. BETS POLICIES
-- Clients see their own bets
CREATE POLICY "bets_read_own" ON public.bets
FOR SELECT USING (user_id = auth.uid());

-- Vendors see their own bets and their clients' bets
CREATE POLICY "bets_read_vendor" ON public.bets
FOR SELECT USING (
    vendor_id = auth.uid() OR
    user_id IN (SELECT id FROM public.profiles WHERE issuer_id = auth.uid())
);

-- Admins see everything
CREATE POLICY "bets_read_admin" ON public.bets
FOR SELECT USING (public.get_auth_role() = 'SuperAdmin');

-- 4. DRAW_RESULTS POLICIES
-- Everyone reads results
CREATE POLICY "results_read_all" ON public.draw_results
FOR SELECT TO authenticated USING (true);

-- Only Admin adds results
CREATE POLICY "results_admin_insert" ON public.draw_results
FOR INSERT WITH CHECK (public.get_auth_role() = 'SuperAdmin');

-- 5. LEDGER POLICIES (Strict)
ALTER TABLE ledger.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ledger_read_own" ON ledger.transactions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ledger_read_admin" ON ledger.transactions
FOR SELECT USING (public.get_auth_role() = 'SuperAdmin');

-- 6. AUDIT POLICIES (Append-only)
ALTER TABLE audit.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_read_admin" ON audit.logs
FOR SELECT USING (public.get_auth_role() = 'SuperAdmin');

-- Note: We generally don't allow users to see audit logs except for admins
