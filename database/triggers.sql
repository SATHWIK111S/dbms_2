-- ============================================================================
-- Community Disaster Relief & Resource Allocation System
-- Procedural PL/pgSQL Triggers & State Integrity Rules
-- ============================================================================

-- 1. Shelter Inventory Timestamp Audit Trigger (trg_inventory_touch)
-- Ensures that any inventory balance modification automatically timestamps the record
-- at statement runtime without relying on external application code.

CREATE OR REPLACE FUNCTION public.touch_shelter_inventory()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.available_qty IS DISTINCT FROM OLD.available_qty THEN
        NEW.last_updated := statement_timestamp();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_touch ON public.shelter_inventory;

CREATE TRIGGER trg_inventory_touch
BEFORE UPDATE OF available_qty ON public.shelter_inventory
FOR EACH ROW EXECUTE FUNCTION public.touch_shelter_inventory();


-- 2. Dispatch Status Transition Machine (trg_dispatch_status)
-- Enforces a strict lifecycle state machine. All dispatches must initiate in IN_TRANSIT.
-- Only valid state transitions from IN_TRANSIT to DELIVERED or CANCELLED are permitted.
-- Direct invalid jumps or status modifications after delivery are blocked at the database engine level.

CREATE OR REPLACE FUNCTION public.guard_dispatch_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status IS DISTINCT FROM 'IN_TRANSIT' THEN
            RAISE EXCEPTION 'New dispatch must start as IN_TRANSIT';
        END IF;
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.status IS DISTINCT FROM 'IN_TRANSIT'
           OR NEW.status IS NULL
           OR NEW.status NOT IN ('DELIVERED', 'CANCELLED') THEN
            RAISE EXCEPTION 'Invalid dispatch transition from % to %', OLD.status, NEW.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_status ON public.dispatched_aid;

CREATE TRIGGER trg_dispatch_status
BEFORE INSERT OR UPDATE OF status ON public.dispatched_aid
FOR EACH ROW EXECUTE FUNCTION public.guard_dispatch_status();
