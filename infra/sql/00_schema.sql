-- infra/sql/00_schema.sql
-- Database Schema for Tiempos Pro Digital (v4.0 Standard)
-- Author: Software Architect

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SCHEMAS
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS ledger;

-- 3. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('SuperAdmin', 'Vendedor', 'Cliente');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bet_status AS ENUM ('PENDING', 'WON', 'LOST', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tx_type AS ENUM ('CREDIT', 'DEBIT', 'FEE', 'ADJUSTMENT', 'COMMISSION_PAYOUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. TABLES
-- profiles: Extends auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cedula TEXT UNIQUE NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'Cliente',
    balance_bigint BIGINT NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'CRC',
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Deleted')),
    issuer_id UUID REFERENCES public.profiles(id),
    pin_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- draws: Draw configuration
CREATE TABLE IF NOT EXISTS public.draws (
    id TEXT PRIMARY KEY, -- e.g. 'Mediodía (12:55)'
    display_name TEXT NOT NULL,
    draw_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- draw_results: Final numbers
CREATE TABLE IF NOT EXISTS public.draw_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_id TEXT REFERENCES public.draws(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    winning_number TEXT NOT NULL,
    is_reventado BOOLEAN DEFAULT FALSE,
    reventado_number TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'VERIFYING')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(draw_id, date)
);

-- bets: Player tickets
CREATE TABLE IF NOT EXISTS public.bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id),
    vendor_id UUID REFERENCES public.profiles(id),
    draw_id TEXT REFERENCES public.draws(id),
    draw_date DATE NOT NULL,
    amount_bigint BIGINT NOT NULL,
    numbers TEXT NOT NULL,
    mode TEXT NOT NULL, -- e.g. 'Nuevos Tiempos (90x)'
    status bet_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ledger: Atomic transaction log
CREATE TABLE IF NOT EXISTS ledger.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    amount_bigint BIGINT NOT NULL,
    balance_before BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    type tx_type NOT NULL,
    reference_id TEXT, -- e.g. ticket_code or external ref
    actor_id UUID REFERENCES public.profiles(id),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- audit_trail: Security log with chained hashing
CREATE TABLE IF NOT EXISTS audit.logs (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id UUID REFERENCES public.profiles(id),
    type TEXT NOT NULL,
    action TEXT NOT NULL,
    severity TEXT NOT NULL,
    target_resource TEXT,
    payload JSONB,
    ip_address INET,
    device_fingerprint TEXT,
    hash TEXT NOT NULL,
    previous_hash TEXT
);

-- system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    group_name TEXT DEFAULT 'CORE',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id),
    is_locked BOOLEAN DEFAULT FALSE
);

-- risk_limits
CREATE TABLE IF NOT EXISTS public.risk_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_id TEXT REFERENCES public.draws(id),
    number TEXT NOT NULL,
    max_amount BIGINT NOT NULL,
    UNIQUE(draw_id, number)
);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_bets_user ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_draw ON public.bets(draw_id, draw_date);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit.logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit.logs(actor_id);