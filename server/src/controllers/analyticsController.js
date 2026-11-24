const db = require('../db');

// GET /api/v1/analytics/shortages
// Query critical shortages directly from public.v_zone_supply_shortages
async function getShortages(req, res, next) {
  try {
    const sql = `
      SELECT
        zone_id,
        zone_name,
        severity,
        incident_name,
        supply_id,
        item_name,
        unit,
        requested_qty,
        delivered_qty,
        in_transit_qty,
        unallocated_qty
      FROM public.v_zone_supply_shortages
      ORDER BY
        CASE severity
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
          ELSE 5
        END,
        unallocated_qty DESC;
    `;
    const result = await db.query(sql);
    res.json({
      status: 'success',
      source_view: 'public.v_zone_supply_shortages',
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/analytics/overview
// Real-time KPI aggregation for operations room dashboard
async function getOverview(req, res, next) {
  try {
    const kpiSql = `
      SELECT
        (SELECT COUNT(*)::INT FROM public.incidents WHERE status IN ('OPEN', 'ACTIVE')) AS active_incidents,
        (SELECT COUNT(*)::INT FROM public.affected_zones WHERE severity IN ('CRITICAL', 'HIGH')) AS high_severity_zones,
        (SELECT COUNT(*)::INT FROM public.shelters) AS operational_shelters,
        (SELECT COALESCE(SUM(available_qty), 0)::INT FROM public.shelter_inventory) AS total_stock_on_hand,
        (SELECT COUNT(*)::INT FROM public.aid_requests) AS total_requests,
        (SELECT COALESCE(SUM(unallocated_qty), 0)::INT FROM public.v_zone_supply_shortages) AS total_unallocated_shortage,
        (SELECT COUNT(*)::INT FROM public.dispatched_aid WHERE status = 'IN_TRANSIT') AS active_in_transit_shipments,
        (SELECT COUNT(*)::INT FROM public.dispatched_aid WHERE status = 'DELIVERED') AS total_delivered_shipments;
    `;
    const kpiRes = await db.query(kpiSql);

    // Distribution by severity
    const severitySql = `
      SELECT severity, COUNT(*)::INT AS count
      FROM public.affected_zones
      GROUP BY severity;
    `;
    const severityRes = await db.query(severitySql);

    // Top shortfall items
    const shortfallItemsSql = `
      SELECT item_name, unit, SUM(unallocated_qty)::INT AS total_shortage
      FROM public.v_zone_supply_shortages
      GROUP BY item_name, unit
      ORDER BY total_shortage DESC
      LIMIT 5;
    `;
    const shortfallRes = await db.query(shortfallItemsSql);

    res.json({
      status: 'success',
      kpis: kpiRes.rows[0],
      severityDistribution: severityRes.rows,
      topShortages: shortfallRes.rows
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getShortages,
  getOverview
};
