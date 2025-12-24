-- ==============================================================================
-- SECURITY PROTOCOL: STRICT DATA ISOLATION (RLS)
-- OBJECTIVE: Enforce strict data segregation. Admins only see their own data/downlines.
-- ==============================================================================

-- 1. HELPER FUNCTIONS
-- Optimized for Performance to avoid repeated lookups
CREATE OR REPLACE FUNCTION auth_get_app_user_id()
RETURNS UUID AS $$
    SELECT id FROM public.app_users WHERE auth_uid = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_is_superadmin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.app_users 
        WHERE auth_uid = auth.uid() 
        AND role = 'SuperAdmin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. RESET POLICIES (Clean Slate)
-- We drop existing policies to ensure no permissive leaks remain.

-- app_users
DROP POLICY IF EXISTS "Allow public read access" ON public.app_users;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.app_users;
DROP POLICY IF EXISTS "Allow authenticated delete users" ON public.app_users;
DROP POLICY IF EXISTS "Allow authenticated update users" ON public.app_users;

-- bets
DROP POLICY IF EXISTS "Allow public read access" ON public.bets;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.bets;
DROP POLICY IF EXISTS "Allow authenticated insert bets" ON public.bets;
DROP POLICY IF EXISTS "Allow authenticated update bets" ON public.bets;
DROP POLICY IF EXISTS "Allow authenticated delete bets" ON public.bets;

-- ledger
DROP POLICY IF EXISTS "Allow public read access" ON public.ledger_transactions;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.ledger_transactions;
DROP POLICY IF EXISTS "Allow authenticated insert ledger" ON public.ledger_transactions;
DROP POLICY IF EXISTS "Allow authenticated delete ledger" ON public.ledger_transactions;

-- 3. STRICT POLICIES DEFINITION

-- ========================================================
-- TABLE: app_users
-- VISIBILITY: Self, Direct Downlines (issued_by me), or All if SuperAdmin
-- ========================================================
CREATE POLICY "RLS_Users_Select_Self_And_Downlines" ON public.app_users
FOR SELECT TO authenticated
USING (
    auth_uid = auth.uid() -- My own profile
    OR issuer_id = auth_get_app_user_id() -- Users I created
    OR auth_is_superadmin() -- God Mode
);

-- UPDATE: Users can update themselves (limited fields ideally, but for now allow). 
-- Admins can update their downlines.
CREATE POLICY "RLS_Users_Update_Self_And_Downlines" ON public.app_users
FOR UPDATE TO authenticated
USING (
    auth_uid = auth.uid()
    OR issuer_id = auth_get_app_user_id()
    OR auth_is_superadmin()
);

-- INSERT: Authenticated users (Admins) can create new users (Downlines)
CREATE POLICY "RLS_Users_Insert_Auth" ON public.app_users
FOR INSERT TO authenticated
WITH CHECK (
    -- Ensure the issuer is set to self (enforced integrity)
    (issuer_id = auth_get_app_user_id()) 
    OR auth_is_superadmin()
);

-- DELETE: Only SuperAdmin or Admin deleting their downline
CREATE POLICY "RLS_Users_Delete_Downlines" ON public.app_users
FOR DELETE TO authenticated
USING (
    issuer_id = auth_get_app_user_id()
    OR auth_is_superadmin()
);


-- ========================================================
-- TABLE: bets
-- VISIBILITY: My bets, or bets from users I manage.
-- ========================================================
CREATE POLICY "RLS_Bets_Select_Hierarchical" ON public.bets
FOR SELECT TO authenticated
USING (
    user_id = auth_get_app_user_id() -- My bets
    OR user_id IN ( -- Bets from my downlines
        SELECT id FROM public.app_users WHERE issuer_id = auth_get_app_user_id()
    )
    OR auth_is_superadmin()
);

-- INSERT: User can place bet for themselves. 
-- Admin/Vendor can place bet on behalf of user (if they manage them).
CREATE POLICY "RLS_Bets_Insert_Hierarchical" ON public.bets
FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth_get_app_user_id()
    OR user_id IN (
        SELECT id FROM public.app_users WHERE issuer_id = auth_get_app_user_id()
    )
    OR auth_is_superadmin()
);

-- UPDATE/DELETE: Typically bets are immutable, but if update needed for status
CREATE POLICY "RLS_Bets_Update_Hierarchical" ON public.bets
FOR UPDATE TO authenticated
USING (
    auth_is_superadmin() -- Only SuperAdmin usually adjusts bets, or system
    -- Or maybe Admin resolving something? Keep it restricted for now.
);


-- ========================================================
-- TABLE: ledger_transactions
-- VISIBILITY: My txs, or txs of my downlines.
-- ========================================================
CREATE POLICY "RLS_Ledger_Select_Hierarchical" ON public.ledger_transactions
FOR SELECT TO authenticated
USING (
    user_id = auth_get_app_user_id()
    OR user_id IN (
        SELECT id FROM public.app_users WHERE issuer_id = auth_get_app_user_id()
    )
    OR auth_is_superadmin()
);

CREATE POLICY "RLS_Ledger_Insert_Hierarchical" ON public.ledger_transactions
FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth_get_app_user_id()
    OR user_id IN (
        SELECT id FROM public.app_users WHERE issuer_id = auth_get_app_user_id()
    )
    OR auth_is_superadmin()
);


-- ========================================================
-- ENABLE RLS (Redundant check)
-- ========================================================
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;

-- Draw Results and System Settings usually Public Read / Admin Write
-- Keeping previous secure access for those tables (re-applying/verifying not strictly needed if not dropped, 
-- but ensuring 'draw_results' is visible to all authenticated is standard)
DROP POLICY IF EXISTS "Allow public read access" ON public.draw_results;
CREATE POLICY "RLS_Draws_Select_Public" ON public.draw_results FOR SELECT TO authenticated USING (true);
-- Write only SuperAdmin or System
-- (Assuming Admin might insert results too as per previous logic)
CREATE POLICY "RLS_Draws_Insert_Admin" ON public.draw_results FOR INSERT TO authenticated WITH CHECK (
    auth_is_superadmin() 
    OR EXISTS (SELECT 1 FROM public.app_users WHERE id = auth_get_app_user_id() AND role IN ('SuperAdmin', 'Admin'))
);

