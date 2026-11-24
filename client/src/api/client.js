/**
 * Centralized API Client with Role-Based Access Control header injection
 */
const BASE_URL = '/api/v1';

let currentRole = 'Central Command Dispatcher';

export function setApiRole(role) {
  currentRole = role;
}

export function getApiRole() {
  return currentRole;
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-role': currentRole,
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with HTTP ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Incidents & Zones
  getIncidents: () => request('/incidents'),
  createIncident: (body) => request('/incidents', { method: 'POST', body: JSON.stringify(body) }),
  getZones: () => request('/zones'),
  createZone: (body) => request('/zones', { method: 'POST', body: JSON.stringify(body) }),

  // Shelters & Inventory
  getShelters: () => request('/shelters'),
  createShelter: (body) => request('/shelters', { method: 'POST', body: JSON.stringify(body) }),
  getShelterInventory: (shelterId) => request(`/shelters/${shelterId}/inventory`),
  updateShelterInventory: (shelterId, body) => request(`/shelters/${shelterId}/inventory`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),

  // Supplies Catalog
  getSupplies: () => request('/supplies'),

  // Aid Requests
  getRequests: () => request('/requests'),
  createRequest: (body) => request('/requests', { method: 'POST', body: JSON.stringify(body) }),

  // Dispatches
  getDispatches: () => request('/dispatches'),
  createDispatch: (body) => request('/dispatches', { method: 'POST', body: JSON.stringify(body) }),
  updateDispatchStatus: (dispatchId, body) => request(`/dispatches/${dispatchId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),

  // Analytics
  getShortages: () => request('/analytics/shortages'),
  getOverview: () => request('/analytics/overview'),

  // System
  resetDatabase: () => request('/database/reset', { method: 'POST' }),
  getHealth: () => request('/health'),
};
