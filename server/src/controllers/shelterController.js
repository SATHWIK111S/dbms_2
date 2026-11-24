const db = require('../db');

// GET /api/v1/shelters
// List all registered shelters with total inventory types count
async function getShelters(req, res, next) {
  try {
    const sql = `
      SELECT
        s.shelter_id,
        s.shelter_name,
        s.address,
        COALESCE(SUM(si.available_qty), 0)::INT AS total_items_stocked,
        COUNT(si.supply_id)::INT AS distinct_supplies_stocked
      FROM public.shelters s
      LEFT JOIN public.shelter_inventory si ON si.shelter_id = s.shelter_id
      GROUP BY s.shelter_id, s.shelter_name, s.address
      ORDER BY s.shelter_name ASC;
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

// POST /api/v1/shelters
async function createShelter(req, res, next) {
  try {
    const { shelter_name, address } = req.body;
    if (!shelter_name || !address) {
      return res.status(400).json({ status: 'error', message: 'Shelter name and address are required' });
    }
    const sql = `
      INSERT INTO public.shelters (shelter_name, address)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const result = await db.query(sql, [shelter_name, address]);
    res.status(201).json({
      status: 'success',
      message: 'Shelter created successfully',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/shelters/:id/inventory
// Retrieve stock on hand, item units, and last_updated timestamps
async function getShelterInventory(req, res, next) {
  try {
    const shelterId = parseInt(req.params.id, 10);
    const sql = `
      SELECT
        si.shelter_id,
        s.shelter_name,
        si.supply_id,
        rs.item_name,
        rs.unit,
        si.available_qty,
        si.last_updated
      FROM public.shelter_inventory si
      JOIN public.shelters s ON s.shelter_id = si.shelter_id
      JOIN public.relief_supplies rs ON rs.supply_id = si.supply_id
      WHERE si.shelter_id = $1
      ORDER BY rs.item_name ASC;
    `;
    const result = await db.query(sql, [shelterId]);
    res.json({
      status: 'success',
      shelter_id: shelterId,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/shelters/:id/inventory
// Update stock levels. Body: { supply_id, available_qty }. Fires audit trigger trg_inventory_touch.
async function updateShelterInventory(req, res, next) {
  try {
    const shelterId = parseInt(req.params.id, 10);
    const { supply_id, available_qty } = req.body;

    const sql = `
      INSERT INTO public.shelter_inventory (shelter_id, supply_id, available_qty, last_updated)
      VALUES ($1, $2, $3, statement_timestamp())
      ON CONFLICT (shelter_id, supply_id)
      DO UPDATE SET
        available_qty = EXCLUDED.available_qty
      RETURNING shelter_id, supply_id, available_qty, last_updated;
    `;
    const result = await db.query(sql, [shelterId, supply_id, available_qty]);

    // Fetch joined item details for UI response
    const detailSql = `
      SELECT
        si.shelter_id,
        s.shelter_name,
        si.supply_id,
        rs.item_name,
        rs.unit,
        si.available_qty,
        si.last_updated
      FROM public.shelter_inventory si
      JOIN public.shelters s ON s.shelter_id = si.shelter_id
      JOIN public.relief_supplies rs ON rs.supply_id = si.supply_id
      WHERE si.shelter_id = $1 AND si.supply_id = $2;
    `;
    const detail = await db.query(detailSql, [shelterId, supply_id]);

    res.json({
      status: 'success',
      message: 'Shelter inventory updated; audit trigger executed',
      data: detail.rows[0] || result.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/supplies
async function getSupplies(req, res, next) {
  try {
    const sql = `
      SELECT supply_id, item_name, unit
      FROM public.relief_supplies
      ORDER BY item_name ASC;
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

module.exports = {
  getShelters,
  createShelter,
  getShelterInventory,
  updateShelterInventory,
  getSupplies
};
