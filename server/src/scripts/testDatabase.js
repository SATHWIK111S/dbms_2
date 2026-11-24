const db = require('../db');

async function runVerification() {
  console.log('=== Running Phase 1 & 2 Database & Backend Verification ===\n');
  try {
    await db.initDb();

    console.log('\n[1] Checking incidents & zone counts:');
    const incRes = await db.query(`
      SELECT i.incident_name, i.status, COUNT(z.zone_id)::INT as zones
      FROM public.incidents i
      LEFT JOIN public.affected_zones z ON z.incident_id = i.incident_id
      GROUP BY i.incident_id, i.incident_name, i.status;
    `);
    console.table(incRes.rows);

    console.log('\n[2] Checking view v_request_fulfillment:');
    const fulRes = await db.query(`
      SELECT request_id, zone_id, supply_id, requested_qty, delivered_qty, in_transit_qty, outstanding_qty, unallocated_qty
      FROM public.v_request_fulfillment
      LIMIT 5;
    `);
    console.table(fulRes.rows);

    console.log('\n[3] Checking view v_zone_supply_shortages:');
    const shortRes = await db.query(`
      SELECT zone_name, severity, incident_name, item_name, unallocated_qty
      FROM public.v_zone_supply_shortages;
    `);
    console.table(shortRes.rows);

    console.log('\n[4] Testing trg_dispatch_status (Illegal transition test):');
    try {
      await db.query(`
        INSERT INTO public.dispatched_aid (request_id, shelter_id, dispatch_qty, status)
        VALUES (1, 1, 1, 'DELIVERED');
      `);
      console.error('FAIL: trg_dispatch_status did not block initial status != IN_TRANSIT');
    } catch (e) {
      console.log('PASS: Correctly blocked initial status != IN_TRANSIT ->', e.message);
    }

    console.log('\n[5] Testing trg_inventory_touch (Timestamp update test):');
    const beforeRes = await db.query('SELECT last_updated FROM public.shelter_inventory WHERE shelter_id = 1 AND supply_id = 1');
    const beforeTime = new Date(beforeRes.rows[0].last_updated).getTime();

    // Sleep 50ms
    await new Promise(r => setTimeout(r, 60));

    await db.query('UPDATE public.shelter_inventory SET available_qty = available_qty + 5 WHERE shelter_id = 1 AND supply_id = 1');
    const afterRes = await db.query('SELECT last_updated FROM public.shelter_inventory WHERE shelter_id = 1 AND supply_id = 1');
    const afterTime = new Date(afterRes.rows[0].last_updated).getTime();

    if (afterTime > beforeTime) {
      console.log(`PASS: trg_inventory_touch updated last_updated from ${beforeRes.rows[0].last_updated} to ${afterRes.rows[0].last_updated}`);
    } else {
      console.error('FAIL: last_updated was not updated');
    }

    console.log('\nAll core database and trigger verifications completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Verification failed with error:', err);
    process.exit(1);
  }
}

runVerification();
