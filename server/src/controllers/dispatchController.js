const db = require('../db');

// GET /api/v1/dispatches
// List all dispatches with related shelter, request, zone, incident, and supply details
async function getDispatches(req, res, next) {
  try {
    const sql = `
      SELECT
        d.dispatch_id,
        d.request_id,
        d.shelter_id,
        sh.shelter_name,
        sh.address AS shelter_address,
        d.dispatch_qty,
        d.status,
        d.dispatched_at,
        d.received_at,
        s.item_name,
        s.unit,
        z.zone_name,
        i.incident_name,
        r.priority AS request_priority
      FROM public.dispatched_aid d
      JOIN public.shelters sh ON sh.shelter_id = d.shelter_id
      JOIN public.aid_requests r ON r.request_id = d.request_id
      JOIN public.relief_supplies s ON s.supply_id = r.supply_id
      JOIN public.affected_zones z ON z.zone_id = r.zone_id
      JOIN public.incidents i ON i.incident_id = z.incident_id
      ORDER BY
        CASE d.status
          WHEN 'IN_TRANSIT' THEN 1
          WHEN 'DELIVERED' THEN 2
          WHEN 'CANCELLED' THEN 3
          ELSE 4
        END,
        d.dispatched_at DESC;
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

// POST /api/v1/dispatches
// Issue dispatch with Transactional Dispatch Deductions:
// Wraps creation of dispatched_aid and the decrement of shelter_inventory.available_qty
// in a single database transaction (BEGIN ... COMMIT) to prevent race conditions and over-allocation.
// Enforces initial status IN_TRANSIT via DB trigger trg_dispatch_status.
async function createDispatch(req, res, next) {
  const client = await db.getTransactionClient();
  try {
    const { request_id, shelter_id, dispatch_qty } = req.body;

    await client.query('BEGIN');

    // 1. Fetch request supply_id and verify request exists
    const reqRes = await client.query(
      `SELECT r.request_id, r.supply_id, r.requested_qty, s.item_name, s.unit,
              f.unallocated_qty
       FROM public.aid_requests r
       JOIN public.relief_supplies s ON s.supply_id = r.supply_id
       JOIN public.v_request_fulfillment f ON f.request_id = r.request_id
       WHERE r.request_id = $1`,
      [request_id]
    );

    if (reqRes.rows.length === 0) {
      throw new Error(`Aid request ID ${request_id} does not exist`);
    }

    const { supply_id, item_name, unit, unallocated_qty } = reqRes.rows[0];

    // Optional business check: dispatch shouldn't exceed unallocated requirement unless intended
    if (dispatch_qty > unallocated_qty) {
      throw new Error(`Dispatch quantity (${dispatch_qty} ${unit}) exceeds outstanding unallocated demand (${unallocated_qty} ${unit})`);
    }

    // 2. Lock shelter inventory row and verify sufficient stock
    const invRes = await client.query(
      `SELECT available_qty
       FROM public.shelter_inventory
       WHERE shelter_id = $1 AND supply_id = $2
       FOR UPDATE`,
      [shelter_id, supply_id]
    );

    if (invRes.rows.length === 0) {
      throw new Error(`Shelter ID ${shelter_id} does not stock item "${item_name}"`);
    }

    const currentStock = invRes.rows[0].available_qty;
    if (currentStock < dispatch_qty) {
      throw new Error(`Insufficient inventory in shelter for "${item_name}". Available: ${currentStock} ${unit}, Requested: ${dispatch_qty} ${unit}`);
    }

    // 3. Insert dispatch record with initial status 'IN_TRANSIT' (guarded by trg_dispatch_status)
    const dispatchInsert = await client.query(
      `INSERT INTO public.dispatched_aid (request_id, shelter_id, dispatch_qty, status)
       VALUES ($1, $2, $3, 'IN_TRANSIT')
       RETURNING *`,
      [request_id, shelter_id, dispatch_qty]
    );
    const newDispatch = dispatchInsert.rows[0];

    // 4. Decrement shelter inventory atomically (triggers trg_inventory_touch automatically)
    await client.query(
      `UPDATE public.shelter_inventory
       SET available_qty = available_qty - $1
       WHERE shelter_id = $2 AND supply_id = $3`,
      [dispatch_qty, shelter_id, supply_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Dispatch authorized and inventory decremented within ACID transaction',
      data: newDispatch
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error('[Transaction Rollback Error]', rbErr);
    }
    next(err);
  } finally {
    client.release();
  }
}

// PATCH /api/v1/dispatches/:id/status
// Transition status to DELIVERED (with received_at) or CANCELLED.
// State machine enforced by DB trigger trg_dispatch_status.
// If CANCELLED, restores deducted shelter stock atomically in a transaction.
async function updateDispatchStatus(req, res, next) {
  const client = await db.getTransactionClient();
  try {
    const dispatchId = parseInt(req.params.id, 10);
    const { status, received_at } = req.body;

    await client.query('BEGIN');

    // 1. Fetch current dispatch record
    const currRes = await client.query(
      `SELECT d.*, r.supply_id
       FROM public.dispatched_aid d
       JOIN public.aid_requests r ON r.request_id = d.request_id
       WHERE d.dispatch_id = $1`,
      [dispatchId]
    );

    if (currRes.rows.length === 0) {
      throw new Error(`Dispatch record ID ${dispatchId} not found`);
    }

    const currentDispatch = currRes.rows[0];

    // Set received_at timestamp when DELIVERED
    const finalReceivedAt = status === 'DELIVERED'
      ? (received_at || new Date().toISOString())
      : null;

    // 2. Update status (DB trigger trg_dispatch_status enforces state machine)
    const updateRes = await client.query(
      `UPDATE public.dispatched_aid
       SET status = $1, received_at = $2
       WHERE dispatch_id = $3
       RETURNING *`,
      [status, finalReceivedAt, dispatchId]
    );

    // 3. If CANCELLED from IN_TRANSIT, restore inventory back to origin shelter
    if (status === 'CANCELLED' && currentDispatch.status === 'IN_TRANSIT') {
      await client.query(
        `UPDATE public.shelter_inventory
         SET available_qty = available_qty + $1
         WHERE shelter_id = $2 AND supply_id = $3`,
        [currentDispatch.dispatch_qty, currentDispatch.shelter_id, currentDispatch.supply_id]
      );
    }

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: `Dispatch ${dispatchId} status transitioned to ${status}`,
      data: updateRes.rows[0]
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error('[Transaction Rollback Error]', rbErr);
    }
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  getDispatches,
  createDispatch,
  updateDispatchStatus
};
