const db = require('../db');

// GET /api/v1/requests
// Fetch all aid requests with calculated real-time fulfillment figures from v_request_fulfillment
async function getRequests(req, res, next) {
  try {
    const sql = `
      SELECT
        r.request_id,
        r.zone_id,
        z.zone_name,
        z.severity AS zone_severity,
        i.incident_id,
        i.incident_name,
        r.supply_id,
        s.item_name,
        s.unit,
        r.requested_qty,
        f.delivered_qty,
        f.in_transit_qty,
        f.outstanding_qty,
        f.unallocated_qty,
        r.priority,
        r.requested_at
      FROM public.aid_requests r
      JOIN public.v_request_fulfillment f ON f.request_id = r.request_id
      JOIN public.affected_zones z ON z.zone_id = r.zone_id
      JOIN public.incidents i ON i.incident_id = z.incident_id
      JOIN public.relief_supplies s ON s.supply_id = r.supply_id
      ORDER BY
        CASE r.priority
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
          ELSE 5
        END,
        r.requested_at DESC;
    `;
    const result = await db.query(sql);
    res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/requests
// Submit emergency request from zone. Body: { zone_id, supply_id, requested_qty, priority }
async function createRequest(req, res, next) {
  try {
    const { zone_id, supply_id, requested_qty, priority = 'MEDIUM' } = req.body;
    const sql = `
      INSERT INTO public.aid_requests (zone_id, supply_id, requested_qty, priority)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await db.query(sql, [zone_id, supply_id, requested_qty, priority]);

    // Fetch the newly inserted request joined with views for immediate UI feedback
    const joinedSql = `
      SELECT
        r.request_id,
        r.zone_id,
        z.zone_name,
        z.severity AS zone_severity,
        i.incident_id,
        i.incident_name,
        r.supply_id,
        s.item_name,
        s.unit,
        r.requested_qty,
        f.delivered_qty,
        f.in_transit_qty,
        f.outstanding_qty,
        f.unallocated_qty,
        r.priority,
        r.requested_at
      FROM public.aid_requests r
      JOIN public.v_request_fulfillment f ON f.request_id = r.request_id
      JOIN public.affected_zones z ON z.zone_id = r.zone_id
      JOIN public.incidents i ON i.incident_id = z.incident_id
      JOIN public.relief_supplies s ON s.supply_id = r.supply_id
      WHERE r.request_id = $1;
    `;
    const joinedResult = await db.query(joinedSql, [result.rows[0].request_id]);

    res.status(201).json({
      status: 'success',
      message: 'Emergency aid request submitted successfully',
      data: joinedResult.rows[0] || result.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRequests,
  createRequest
};
