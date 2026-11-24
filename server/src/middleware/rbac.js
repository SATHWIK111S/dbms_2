/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Implements the 4 distinct operational roles specified in Section 10:
 * 1. Disaster Coordinator: Creates incidents and registers affected zones.
 * 2. Zone Field Responder: Submits and tracks aid requests for assigned zones.
 * 3. Shelter Logistics Manager: Updates inventory balances and confirms dispatched shipments.
 * 4. Central Command Dispatcher: Assigns dispatches to unallocated shortages.
 */

const ROLES = {
  DISASTER_COORDINATOR: 'Disaster Coordinator',
  ZONE_RESPONDER: 'Zone Field Responder',
  SHELTER_MANAGER: 'Shelter Logistics Manager',
  CENTRAL_DISPATCHER: 'Central Command Dispatcher'
};

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    // Current role passed via x-user-role header or fallback to query param
    const currentRole = req.headers['x-user-role'] || req.query.role || ROLES.CENTRAL_DISPATCHER;

    // Attach role to request
    req.userRole = currentRole;

    // If allowedRoles is empty, any authenticated/recognized role can access
    if (!allowedRoles || allowedRoles.length === 0) {
      return next();
    }

    if (!allowedRoles.includes(currentRole)) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: `Access denied. Role "${currentRole}" is not authorized for this operation. Required role(s): ${allowedRoles.join(', ')}.`,
        currentRole,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}

module.exports = {
  ROLES,
  requireRole
};
