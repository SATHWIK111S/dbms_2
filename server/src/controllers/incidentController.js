const db = require('../db');

// GET /api/v1/incidents
// Fetch all disaster incidents with current active status and affected zones count
async function getIncidents(req, res, next) {
  try {
    const sql = `
      SELECT
        i.incident_id,
        i.incident_name,
        i.incident_type,
        i.status,
        i.reported_at,
        COUNT(z.zone_id)::INT AS affected_zones_count
      FROM public.incidents i
      LEFT JOIN public.affected_zones z ON z.incident_id = i.incident_id
      GROUP BY i.incident_id, i.incident_name, i.incident_type, i.status, i.reported_at
      ORDER BY
        CASE i.status
          WHEN 'ACTIVE' THEN 1
          WHEN 'OPEN' THEN 2
          WHEN 'UNDER_CONTROL' THEN 3
          WHEN 'MONITORING' THEN 4
          WHEN 'CLOSED' THEN 5
          ELSE 6
        END,
        i.reported_at DESC;
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

// POST /api/v1/incidents
// Create new incident. Body: { incident_name, incident_type, status }
async function createIncident(req, res, next) {
  try {
    const { incident_name, incident_type, status = 'OPEN' } = req.body;
    const sql = `
      INSERT INTO public.incidents (incident_name, incident_type, status)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await db.query(sql, [incident_name, incident_type, status]);
    res.status(201).json({
      status: 'success',
      message: 'Incident registered successfully',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/zones
// Fetch all affected zones joined with their incident name
async function getZones(req, res, next) {
  try {
    const sql = `
      SELECT
        z.zone_id,
        z.incident_id,
        i.incident_name,
        i.status AS incident_status,
        z.zone_name,
        z.severity
      FROM public.affected_zones z
      JOIN public.incidents i ON i.incident_id = z.incident_id
      ORDER BY
        CASE z.severity
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
          ELSE 5
        END,
        z.zone_name ASC;
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

// POST /api/v1/zones
// Register affected zone under an incident
async function createZone(req, res, next) {
  try {
    const { incident_id, zone_name, severity = 'MEDIUM' } = req.body;
    const sql = `
      INSERT INTO public.affected_zones (incident_id, zone_name, severity)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await db.query(sql, [incident_id, zone_name, severity]);
    res.status(201).json({
      status: 'success',
      message: 'Affected zone registered successfully',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getIncidents,
  createIncident,
  getZones,
  createZone
};
