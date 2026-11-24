const http = require('http');
const app = require('../app');
const db = require('../db');

function makeRequest(server, options, bodyData) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const reqOptions = {
      hostname: '127.0.0.1',
      port: address.port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);

    if (bodyData) {
      req.write(JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runEndToEndTests() {
  console.log('================================================================');
  console.log('COMMUNITY DISASTER RELIEF SYSTEM - REST API INTEGRATION TEST');
  console.log('================================================================\n');

  await db.initDb();
  await db.bootstrapDatabase();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`[Test Harness] Ephemeral test server active on port ${port}`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    console.log('\n[Suite 1] Health & System Info:');
    const health = await makeRequest(server, { path: '/api/v1/health' });
    assert(health.status === 200, 'GET /api/v1/health returns 200 OK');
    assert(health.body.status === 'healthy', 'System status reported as healthy');

    // 2. Incident fetch & RBAC creation
    console.log('\n[Suite 2] Incidents & RBAC Permissions:');
    const incidents = await makeRequest(server, { path: '/api/v1/incidents' });
    assert(incidents.status === 200 && incidents.body.count >= 4, 'GET /api/v1/incidents returns seeded incidents');

    // Attempt creation with wrong role (expect 403 Forbidden)
    const unauthorizedIncident = await makeRequest(
      server,
      {
        path: '/api/v1/incidents',
        method: 'POST',
        headers: { 'x-user-role': 'Zone Field Responder' }
      },
      { incident_name: 'Unauthorized Fire', incident_type: 'Wildfire', status: 'ACTIVE' }
    );
    assert(unauthorizedIncident.status === 403, 'POST /api/v1/incidents rejects unauthorized role with 403 Forbidden');

    // Create with authorized role (Disaster Coordinator)
    const createdIncident = await makeRequest(
      server,
      {
        path: '/api/v1/incidents',
        method: 'POST',
        headers: { 'x-user-role': 'Disaster Coordinator' }
      },
      { incident_name: 'Test Mudslide Delta', incident_type: 'Mudslide', status: 'ACTIVE' }
    );
    assert(createdIncident.status === 201, 'POST /api/v1/incidents accepts Disaster Coordinator and creates record');

    // 3. Shelter Inventory & Audit Trigger (trg_inventory_touch)
    console.log('\n[Suite 3] Shelter Inventory & Audit Trigger:');
    const invBefore = await makeRequest(server, { path: '/api/v1/shelters/1/inventory' });
    assert(invBefore.status === 200 && invBefore.body.data.length > 0, 'GET /api/v1/shelters/1/inventory returns stock');

    const originalItem = invBefore.body.data[0];
    const updateInv = await makeRequest(
      server,
      {
        path: '/api/v1/shelters/1/inventory',
        method: 'PATCH',
        headers: { 'x-user-role': 'Shelter Logistics Manager' }
      },
      { supply_id: originalItem.supply_id, available_qty: originalItem.available_qty + 50 }
    );
    assert(updateInv.status === 200, 'PATCH /api/v1/shelters/1/inventory updates stock level');
    assert(updateInv.body.data.available_qty === originalItem.available_qty + 50, 'Updated stock reflects incremented count');

    // 4. Aid Requests & Fulfillment Calculations (v_request_fulfillment)
    console.log('\n[Suite 4] Aid Requests & Dynamic View:');
    const newReq = await makeRequest(
      server,
      {
        path: '/api/v1/requests',
        method: 'POST',
        headers: { 'x-user-role': 'Zone Field Responder' }
      },
      { zone_id: 1, supply_id: 1, requested_qty: 100, priority: 'CRITICAL' }
    );
    assert(newReq.status === 201, 'POST /api/v1/requests creates new aid demand');
    const reqId = newReq.body.data.request_id;
    assert(newReq.body.data.unallocated_qty === 100, 'View dynamically reports 100 unallocated units');

    // 5. Shortages View (v_zone_supply_shortages)
    console.log('\n[Suite 5] Analytical View v_zone_supply_shortages:');
    const shortages = await makeRequest(server, { path: '/api/v1/analytics/shortages' });
    assert(shortages.status === 200 && shortages.body.count > 0, 'GET /api/v1/analytics/shortages returns active shortfalls');
    assert(shortages.body.source_view === 'public.v_zone_supply_shortages', 'Query directly sourced from view');

    // 6. Transactional Dispatch Deductions & State Machine Trigger (trg_dispatch_status)
    console.log('\n[Suite 6] Transactional Dispatch Deductions & trg_dispatch_status:');
    // Get Shelter 1 stock of supply 1
    const s1Inv = await makeRequest(server, { path: '/api/v1/shelters/1/inventory' });
    const s1Water = s1Inv.body.data.find(x => x.supply_id === 1);
    const stockBefore = s1Water.available_qty;

    // Issue dispatch of 40 units
    const dispatchRes = await makeRequest(
      server,
      {
        path: '/api/v1/dispatches',
        method: 'POST',
        headers: { 'x-user-role': 'Central Command Dispatcher' }
      },
      { request_id: reqId, shelter_id: 1, dispatch_qty: 40 }
    );
    assert(dispatchRes.status === 201, 'POST /api/v1/dispatches creates dispatch inside ACID transaction');
    assert(dispatchRes.body.data.status === 'IN_TRANSIT', 'DB trigger trg_dispatch_status enforced status IN_TRANSIT');
    const newDispatchId = dispatchRes.body.data.dispatch_id;

    // Verify shelter stock was decremented atomically
    const s1InvAfter = await makeRequest(server, { path: '/api/v1/shelters/1/inventory' });
    const stockAfter = s1InvAfter.body.data.find(x => x.supply_id === 1).available_qty;
    assert(stockAfter === stockBefore - 40, `Shelter inventory atomical deduction verified: ${stockBefore} -> ${stockAfter}`);

    // Transition dispatch status to DELIVERED
    const deliverRes = await makeRequest(
      server,
      {
        path: `/api/v1/dispatches/${newDispatchId}/status`,
        method: 'PATCH',
        headers: { 'x-user-role': 'Shelter Logistics Manager' }
      },
      { status: 'DELIVERED', received_at: new Date().toISOString() }
    );
    assert(deliverRes.status === 200 && deliverRes.body.data.status === 'DELIVERED', 'Dispatched shipment transitioned to DELIVERED with received_at');

    // Verify trg_dispatch_status blocks transition out of DELIVERED
    const illegalTransition = await makeRequest(
      server,
      {
        path: `/api/v1/dispatches/${newDispatchId}/status`,
        method: 'PATCH',
        headers: { 'x-user-role': 'Central Command Dispatcher' }
      },
      { status: 'CANCELLED' }
    );
    assert(illegalTransition.status === 400, 'trg_dispatch_status rejects illegal transition out of terminal state DELIVERED with 400 Bad Request');

    console.log(`\n================================================================`);
    console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log(`================================================================\n`);

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    server.close();
    process.exit(1);
  }
}

runEndToEndTests();
