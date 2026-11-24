-- ============================================================================
-- Community Disaster Relief & Resource Allocation System
-- Automated Constraint & Trigger Edge-Case Test Suite
-- ============================================================================

-- Test 1: Verify chk_incident_status constraint
DO $$
BEGIN
    BEGIN
        INSERT INTO public.incidents (incident_name, incident_type, status)
        VALUES ('Test Invalid Incident', 'Flood', 'INVALID_STATUS');
        RAISE EXCEPTION 'TEST FAILED: chk_incident_status did not reject invalid status';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: chk_incident_status correctly rejected invalid status.';
    END;
END $$;

-- Test 2: Verify uq_incident_zone unique constraint
DO $$
BEGIN
    BEGIN
        INSERT INTO public.affected_zones (incident_id, zone_name, severity)
        VALUES (1, 'Zone A - Harbor Lowlands', 'HIGH');
        RAISE EXCEPTION 'TEST FAILED: uq_incident_zone did not reject duplicate zone name for same incident';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'PASS: uq_incident_zone correctly rejected duplicate zone name.';
    END;
END $$;

-- Test 3: Verify chk_zone_severity constraint
DO $$
BEGIN
    BEGIN
        INSERT INTO public.affected_zones (incident_id, zone_name, severity)
        VALUES (1, 'Zone Test Severity', 'SUPER_EXTREME');
        RAISE EXCEPTION 'TEST FAILED: chk_zone_severity did not reject invalid severity';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: chk_zone_severity correctly rejected invalid severity.';
    END;
END $$;

-- Test 4: Verify chk_inventory_qty_nonnegative
DO $$
BEGIN
    BEGIN
        INSERT INTO public.shelter_inventory (shelter_id, supply_id, available_qty)
        VALUES (1, 7, -50);
        RAISE EXCEPTION 'TEST FAILED: chk_inventory_qty_nonnegative did not reject negative stock';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: chk_inventory_qty_nonnegative correctly rejected negative stock.';
    END;
END $$;

-- Test 5: Verify chk_aid_requested_qty_positive
DO $$
BEGIN
    BEGIN
        INSERT INTO public.aid_requests (zone_id, supply_id, requested_qty, priority)
        VALUES (1, 1, 0, 'HIGH');
        RAISE EXCEPTION 'TEST FAILED: chk_aid_requested_qty_positive did not reject zero quantity';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: chk_aid_requested_qty_positive correctly rejected zero quantity.';
    END;
END $$;

-- Test 6: Verify trg_dispatch_status enforces initial IN_TRANSIT
DO $$
BEGIN
    BEGIN
        INSERT INTO public.dispatched_aid (request_id, shelter_id, dispatch_qty, status)
        VALUES (1, 1, 10, 'DELIVERED');
        RAISE EXCEPTION 'TEST FAILED: trg_dispatch_status allowed initial status != IN_TRANSIT';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASS: trg_dispatch_status correctly rejected non-IN_TRANSIT initial status. Error: %', SQLERRM;
    END;
END $$;

-- Test 7: Verify trg_dispatch_status prevents illegal transition from DELIVERED
DO $$
DECLARE
    v_dispatch_id INT;
BEGIN
    INSERT INTO public.dispatched_aid (request_id, shelter_id, dispatch_qty, status)
    VALUES (1, 1, 5, 'IN_TRANSIT') RETURNING dispatch_id INTO v_dispatch_id;

    UPDATE public.dispatched_aid SET status = 'DELIVERED', received_at = NOW() WHERE dispatch_id = v_dispatch_id;

    BEGIN
        UPDATE public.dispatched_aid SET status = 'IN_TRANSIT' WHERE dispatch_id = v_dispatch_id;
        RAISE EXCEPTION 'TEST FAILED: trg_dispatch_status allowed transition out of DELIVERED';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASS: trg_dispatch_status correctly blocked transition out of DELIVERED. Error: %', SQLERRM;
    END;

    -- Cleanup test row
    DELETE FROM public.dispatched_aid WHERE dispatch_id = v_dispatch_id;
END $$;

-- Test 8: Verify trg_inventory_touch updates last_updated
DO $$
DECLARE
    v_before TIMESTAMPTZ;
    v_after TIMESTAMPTZ;
BEGIN
    SELECT last_updated INTO v_before FROM public.shelter_inventory WHERE shelter_id = 1 AND supply_id = 1;
    PERFORM pg_sleep(0.05);
    UPDATE public.shelter_inventory SET available_qty = available_qty + 10 WHERE shelter_id = 1 AND supply_id = 1;
    SELECT last_updated INTO v_after FROM public.shelter_inventory WHERE shelter_id = 1 AND supply_id = 1;

    IF v_after > v_before THEN
        RAISE NOTICE 'PASS: trg_inventory_touch automatically updated last_updated timestamp.';
    ELSE
        RAISE EXCEPTION 'TEST FAILED: last_updated was not incremented by trigger.';
    END IF;
END $$;

-- Query analytical views
SELECT '=== VIEW 1: v_request_fulfillment sample ===' AS section;
SELECT request_id, zone_id, supply_id, priority, requested_qty, delivered_qty, in_transit_qty, outstanding_qty, unallocated_qty
FROM public.v_request_fulfillment LIMIT 5;

SELECT '=== VIEW 2: v_zone_supply_shortages sample ===' AS section;
SELECT zone_id, zone_name, severity, incident_name, item_name, requested_qty, delivered_qty, in_transit_qty, unallocated_qty
FROM public.v_zone_supply_shortages;
