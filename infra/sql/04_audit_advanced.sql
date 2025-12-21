-- infra/sql/04_audit_advanced.sql
-- Advanced Security: Chained Hashing Trigger for Audit Logs
-- Author: Software Architect

CREATE OR REPLACE FUNCTION audit.generate_log_hash()
RETURNS TRIGGER AS $$
DECLARE
    v_prev_hash TEXT;
BEGIN
    -- 1. Get the hash of the latest log entry
    SELECT hash INTO v_prev_hash FROM audit.logs ORDER BY id DESC LIMIT 1;
    
    -- 2. Store the previous hash
    NEW.previous_hash := COALESCE(v_prev_hash, 'GENESIS');
    
    -- 3. Generate current hash: HASH(ID + TIMESTAMP + TYPE + ACTION + PAYLOAD + PREVIOUS_HASH)
    NEW.hash := encode(digest(
        NEW.event_id::text || 
        NEW.timestamp::text || 
        NEW.type || 
        NEW.action || 
        COALESCE(NEW.payload::text, '') || 
        NEW.previous_hash, 
        'sha256'
    ), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_hash ON audit.logs;
CREATE TRIGGER trg_audit_hash
BEFORE INSERT ON audit.logs
FOR EACH ROW
EXECUTE FUNCTION audit.generate_log_hash();

-- Prevent updates/deletes on audit.logs (Inmutability)
CREATE OR REPLACE FUNCTION audit.prevent_mod()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'AUDIT_LOGS_ARE_IMMUTABLE';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_immutable
BEFORE UPDATE OR DELETE ON audit.logs
FOR EACH ROW
EXECUTE FUNCTION audit.prevent_mod();
