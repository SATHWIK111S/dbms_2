-- ============================================================================
-- Community Disaster Relief & Resource Allocation System
-- Real-Time Analytical SQL Views
-- ============================================================================

-- 7.1 Request Fulfillment Calculation (v_request_fulfillment)
-- This view aggregates delivery and in-transit tallies per request and calculates
-- outstanding and unallocated units using dynamic SQL formulas.

CREATE OR REPLACE VIEW public.v_request_fulfillment
WITH (security_invoker = true) AS
WITH dispatch_totals AS (
    SELECT request_id,
           SUM(dispatch_qty) FILTER (WHERE status = 'DELIVERED') AS delivered_qty,
           SUM(dispatch_qty) FILTER (WHERE status = 'IN_TRANSIT') AS in_transit_qty
    FROM public.dispatched_aid
    GROUP BY request_id
)
SELECT r.request_id,
       r.zone_id,
       r.supply_id,
       r.priority,
       r.requested_at,
       r.requested_qty,
       COALESCE(d.delivered_qty, 0)::INT AS delivered_qty,
       COALESCE(d.in_transit_qty, 0)::INT AS in_transit_qty,
       GREATEST(r.requested_qty - COALESCE(d.delivered_qty, 0), 0)::INT AS outstanding_qty,
       GREATEST(r.requested_qty - COALESCE(d.delivered_qty, 0) - COALESCE(d.in_transit_qty, 0), 0)::INT AS unallocated_qty
FROM public.aid_requests AS r
LEFT JOIN dispatch_totals AS d USING (request_id);


-- 7.2 Critical Zone Supply Shortages (v_zone_supply_shortages)
-- Aggregates across affected zones, joining incidents and supplies to highlight
-- immediate humanitarian deficits where SUM(unallocated_qty) > 0.

CREATE OR REPLACE VIEW public.v_zone_supply_shortages
WITH (security_invoker = true) AS
SELECT z.zone_id,
       z.zone_name,
       z.severity,
       i.incident_name,
       s.supply_id,
       s.item_name,
       s.unit,
       SUM(f.requested_qty)::INT AS requested_qty,
       SUM(f.delivered_qty)::INT AS delivered_qty,
       SUM(f.in_transit_qty)::INT AS in_transit_qty,
       SUM(f.unallocated_qty)::INT AS unallocated_qty
FROM public.v_request_fulfillment AS f
JOIN public.affected_zones AS z ON z.zone_id = f.zone_id
JOIN public.incidents AS i ON i.incident_id = z.incident_id
JOIN public.relief_supplies AS s ON s.supply_id = f.supply_id
GROUP BY z.zone_id, z.zone_name, z.severity, i.incident_name, s.supply_id, s.item_name, s.unit
HAVING SUM(f.unallocated_qty) > 0;
