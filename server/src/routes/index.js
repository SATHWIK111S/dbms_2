const express = require('express');
const router = express.Router();

const { validate, incidentCreateSchema, zoneCreateSchema, shelterInventoryUpdateSchema, aidRequestCreateSchema, dispatchCreateSchema, dispatchStatusUpdateSchema } = require('../middleware/validate');
const { requireRole, ROLES } = require('../middleware/rbac');
const db = require('../db');

const incidentController = require('../controllers/incidentController');
const shelterController = require('../controllers/shelterController');
const requestController = require('../controllers/requestController');
const dispatchController = require('../controllers/dispatchController');
const analyticsController = require('../controllers/analyticsController');

// 1. Incidents & Zones
router.get('/incidents', incidentController.getIncidents);
router.post(
  '/incidents',
  requireRole([ROLES.DISASTER_COORDINATOR]),
  validate(incidentCreateSchema),
  incidentController.createIncident
);

router.get('/zones', incidentController.getZones);
router.post(
  '/zones',
  requireRole([ROLES.DISASTER_COORDINATOR]),
  validate(zoneCreateSchema),
  incidentController.createZone
);

// 2. Shelters & Inventories
router.get('/shelters', shelterController.getShelters);
router.post(
  '/shelters',
  requireRole([ROLES.DISASTER_COORDINATOR, ROLES.SHELTER_MANAGER]),
  shelterController.createShelter
);
router.get('/shelters/:id/inventory', shelterController.getShelterInventory);
router.patch(
  '/shelters/:id/inventory',
  requireRole([ROLES.SHELTER_MANAGER]),
  validate(shelterInventoryUpdateSchema),
  shelterController.updateShelterInventory
);

// 3. Relief Supplies Catalog
router.get('/supplies', shelterController.getSupplies);

// 4. Aid Requests
router.get('/requests', requestController.getRequests);
router.post(
  '/requests',
  requireRole([ROLES.ZONE_RESPONDER, ROLES.DISASTER_COORDINATOR]),
  validate(aidRequestCreateSchema),
  requestController.createRequest
);

// 5. Dispatches
router.get('/dispatches', dispatchController.getDispatches);
router.post(
  '/dispatches',
  requireRole([ROLES.CENTRAL_DISPATCHER]),
  validate(dispatchCreateSchema),
  dispatchController.createDispatch
);
router.patch(
  '/dispatches/:id/status',
  requireRole([ROLES.CENTRAL_DISPATCHER, ROLES.SHELTER_MANAGER]),
  validate(dispatchStatusUpdateSchema),
  dispatchController.updateDispatchStatus
);

// 6. Real-Time Analytics & Shortage Views
router.get('/analytics/shortages', analyticsController.getShortages);
router.get('/analytics/overview', analyticsController.getOverview);

// 7. System Utilities: Database Re-seed / Reset
router.post('/database/reset', async (req, res, next) => {
  try {
    await db.bootstrapDatabase();
    res.json({
      status: 'success',
      message: 'Database schema, triggers, views, and seeds successfully reset to baseline.'
    });
  } catch (err) {
    next(err);
  }
});

// 8. Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    databaseMode: db.getMode(),
    service: 'Community Disaster Relief & Resource Allocation API'
  });
});

module.exports = router;
