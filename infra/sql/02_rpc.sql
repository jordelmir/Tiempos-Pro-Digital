-- infra/sql/02_rpc.sql
-- Business Logic in PL/pgSQL for Tiempos Pro Digital
-- Author: Software Architect

-- 1. Functional Logic for Placing a Bet
-- Ensures atomicity: Balance check -> Risk limit check -> Deduction -> Bet creation -> Ledger entry
CREATE OR REPLACE FUNCTION public.place_bet(
    p_numbers TEXT,
    p_amount BIGINT,
    p_draw_id TEXT,
    p_draw_date DATE,
    p_mode TEXT,
    p_ticket_code TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_balance BIGINT;
    v_risk_limit BIGINT;
    v_current_exposure BIGINT;
    v_bet_id UUID;
BEGIN
    -- 1. Get current balance
    SELECT balance_bigint INTO v_user_balance FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
    
    IF v_user_balance < p_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
    END IF;

    -- 2. Check Risk Limits
    -- Get limit for this number/draw, default to infinity if not set
    SELECT max_amount INTO v_risk_limit FROM public.risk_limits 
    WHERE draw_id = p_draw_id AND number = p_numbers;

    IF v_risk_limit IS NOT NULL THEN
        -- Calculate current exposure (sum of pending bets for this number/draw/date)
        SELECT COALESCE(SUM(amount_bigint), 0) INTO v_current_exposure 
        FROM public.bets 
        WHERE draw_id = p_draw_id AND draw_date = p_draw_date AND numbers = p_numbers AND status = 'PENDING';

        IF (v_current_exposure + p_amount) > v_risk_limit THEN
            RAISE EXCEPTION 'LIMIT_EXCEEDED';
        END IF;
    END IF;

    -- 3. Deduct Balance
    UPDATE public.profiles SET balance_bigint = balance_bigint - p_amount WHERE id = auth.uid();

    -- 4. Create Bet record
    INSERT INTO public.bets (ticket_code, user_id, draw_id, draw_date, amount_bigint, numbers, mode, status)
    VALUES (p_ticket_code, auth.uid(), p_draw_id, p_draw_date, p_amount, p_numbers, p_mode, 'PENDING')
    RETURNING id INTO v_bet_id;

    -- 5. Create Ledger entry
    INSERT INTO ledger.transactions (user_id, amount_bigint, balance_before, balance_after, type, reference_id, actor_id, metadata)
    VALUES (
        auth.uid(), 
        -p_amount, 
        v_user_balance, 
        v_user_balance - p_amount, 
        'DEBIT', 
        p_ticket_code, 
        auth.uid(), 
        jsonb_build_object('bet_id', v_bet_id, 'info', 'Compra de Tiempos')
    );

    RETURN jsonb_build_object('status', 'success', 'bet_id', v_bet_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Payout Logic
-- Called when a result is published to process all bets
CREATE OR REPLACE FUNCTION public.payout_draw(
    p_draw_id TEXT,
    p_draw_date DATE,
    p_winning_number TEXT,
    p_is_reventado BOOLEAN,
    p_multiplier_tiempos INT DEFAULT 90,
    p_multiplier_reventados INT DEFAULT 200
) RETURNS INTEGER AS $$
DECLARE
    v_bet RECORD;
    v_prize BIGINT;
    v_multiplier INT;
    v_count INTEGER := 0;
BEGIN
    FOR v_bet IN 
        SELECT * FROM public.bets 
        WHERE draw_id = p_draw_id AND draw_date = p_draw_date AND status = 'PENDING'
        FOR UPDATE
    LOOP
        IF v_bet.numbers = p_winning_number THEN
            -- Winner
            v_multiplier := p_multiplier_tiempos;
            IF v_bet.mode LIKE '%Reventados%' AND p_is_reventado THEN
                v_multiplier := p_multiplier_reventados;
            END IF;

            v_prize := v_bet.amount_bigint * v_multiplier;

            -- Update Bet
            UPDATE public.bets SET status = 'WON' WHERE id = v_bet.id;

            -- Update User Balance
            UPDATE public.profiles SET balance_bigint = balance_bigint + v_prize WHERE id = v_bet.user_id;

            -- Ledger
            INSERT INTO ledger.transactions (user_id, amount_bigint, balance_before, balance_after, type, reference_id, actor_id, metadata)
            SELECT 
                v_bet.user_id, 
                v_prize, 
                p.balance_bigint - v_prize, 
                p.balance_bigint, 
                'CREDIT', 
                v_bet.ticket_code, 
                auth.uid(), 
                jsonb_build_object('bet_id', v_bet.id, 'info', 'Premio Ganado')
            FROM public.profiles p WHERE p.id = v_bet.user_id;

            v_count := v_count + 1;
        ELSE
            -- Loser
            UPDATE public.bets SET status = 'LOST' WHERE id = v_bet.id;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
