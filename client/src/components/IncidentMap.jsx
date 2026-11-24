import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Calendar,
  Layers,
  Truck,
  ChevronRight,
  Package,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';

// Stylized visual coordinates on regional area grid
const ZONE_MAP_COORDINATES = {
  1: { x: 32, y: 34 },
  2: { x: 55, y: 28 },
  3: { x: 76, y: 42 },
  4: { x: 26, y: 64 },
  5: { x: 48, y: 72 },
  6: { x: 68, y: 68 },
  7: { x: 80, y: 30 },
};

export default function IncidentMap({
  incidents,
  zones,
  shortages,
  onRefresh,
  activeRole,
  showToast,
  onDispatchShortcut
}) {
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'cards'
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.zone_id || 1);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);

  // Form states
  const [newIncident, setNewIncident] = useState({ incident_name: '', incident_type: '', status: 'ACTIVE' });
  const [newZone, setNewZone] = useState({ incident_id: '', zone_name: '', severity: 'HIGH' });
  const [submitting, setSubmitting] = useState(false);

  const canManageIncidents = activeRole === 'Disaster Coordinator';

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!canManageIncidents) {
      showToast('Only Disaster Coordinators can register new disaster incidents.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.createIncident(newIncident);
      showToast('New disaster incident created successfully.', 'success');
      setShowIncidentModal(false);
      setNewIncident({ incident_name: '', incident_type: '', status: 'ACTIVE' });
      onRefresh();
    } catch (err) {
      showToast(err.message || 'Failed to create incident', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateZone = async (e) => {
    e.preventDefault();
    if (!canManageIncidents) {
      showToast('Only Disaster Coordinators can declare new affected zones.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.createZone({
        ...newZone,
        incident_id: parseInt(newZone.incident_id, 10)
      });
      showToast(`Affected zone "${newZone.zone_name}" registered successfully.`, 'success');
      setShowZoneModal(false);
      setNewZone({ incident_id: '', zone_name: '', severity: 'HIGH' });
      onRefresh();
    } catch (err) {
      showToast(err.message || 'Failed to add zone', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedZone = zones.find(z => z.zone_id === selectedZoneId) || zones[0];
  const selectedZoneShortages = shortages.filter(s => s.zone_id === selectedZone?.zone_id);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Incidents & Affected Zones
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {incidents.length} incidents
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Geographic view of active disaster areas and their priority levels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Map view</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Incident list</span>
            </button>
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setShowIncidentModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add incident</span>
          </button>
          <button
            onClick={() => {
              if (incidents.length > 0) {
                setNewZone(prev => ({ ...prev, incident_id: incidents[0].incident_id }));
              }
              setShowZoneModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Add zone</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Map View */}
      {viewMode === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Regional Visual Map Canvas (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[460px]">
            {/* Soft map background texture */}
            <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-950/40 pointer-events-none">
              <svg className="w-full h-full opacity-30 dark:opacity-20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-slate-300 dark:text-slate-700" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Map Header */}
            <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                <span className="font-medium text-slate-700 dark:text-slate-300">Regional impact overview</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {zones.length} active zones mapped
              </span>
            </div>

            {/* Interactive zone pins on regional canvas */}
            <div className="relative z-20 my-auto h-72 w-full">
              {zones.map((zone) => {
                const coords = ZONE_MAP_COORDINATES[zone.zone_id] || {
                  x: 20 + ((zone.zone_id * 18) % 65),
                  y: 25 + ((zone.zone_id * 22) % 55)
                };
                const isSelected = selectedZone?.zone_id === zone.zone_id;
                const isCritical = zone.severity === 'CRITICAL';
                const isHigh = zone.severity === 'HIGH';

                return (
                  <button
                    key={zone.zone_id}
                    onClick={() => setSelectedZoneId(zone.zone_id)}
                    style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform ${
                      isSelected ? 'scale-110 z-30' : 'hover:scale-105 z-20'
                    }`}
                  >
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
                          isSelected
                            ? 'bg-teal-700 text-white ring-4 ring-teal-100 dark:ring-teal-900/60'
                            : isCritical
                            ? 'bg-rose-600 text-white'
                            : isHigh
                            ? 'bg-amber-500 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                      </div>

                      {/* Pin label */}
                      <span
                        className={`mt-1 px-2 py-0.5 rounded text-[11px] font-medium shadow-sm border whitespace-nowrap transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 font-semibold'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {zone.zone_name.split(' - ')[0]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Map Legend */}
            <div className="relative z-10 flex flex-wrap items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Critical
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> High
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Medium
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Low
                </span>
              </div>
              <span className="text-[11px]">Select any pin for zone details</span>
            </div>
          </div>

          {/* Zone Detail Panel (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            {selectedZone ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Selected zone
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedZone.zone_name}
                    </h3>
                    <p className="text-xs text-teal-700 dark:text-teal-400 mt-0.5">
                      {selectedZone.incident_name}
                    </p>
                  </div>
                  <StatusBadge status={selectedZone.severity} type="priority" />
                </div>

                {/* Needed items in this zone */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    <span>Units still needed in this zone</span>
                    <span className="text-slate-500 font-normal">
                      {selectedZoneShortages.length} {selectedZoneShortages.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {selectedZoneShortages.length === 0 ? (
                    <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                      All aid requests for this zone have been dispatched or delivered.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {selectedZoneShortages.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {item.item_name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Requested: {item.requested_qty} {item.unit}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              {item.unallocated_qty} {item.unit} needed
                            </span>
                            <div>
                              <button
                                onClick={() => onDispatchShortcut(item)}
                                className="text-[11px] font-medium text-teal-700 dark:text-teal-400 hover:underline mt-0.5 inline-flex items-center gap-0.5"
                              >
                                <span>Send dispatch</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={MapPin}
                title="No zone selected"
                description="Select a pin on the map to inspect supplies needed."
              />
            )}

            {selectedZoneShortages.length > 0 && (
              <button
                onClick={() => onDispatchShortcut(selectedZoneShortages[0])}
                className="mt-4 w-full py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Truck className="w-4 h-4" />
                <span>Send supplies to {selectedZone?.zone_name.split(' - ')[0]}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Incident List View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incidents.length === 0 ? (
            <div className="col-span-2">
              <EmptyState
                icon={AlertCircle}
                title="No disaster incidents registered"
                description="Use the button above to register a new incident."
                actionLabel="Add incident"
                onAction={() => setShowIncidentModal(true)}
              />
            </div>
          ) : (
            incidents.map((incident) => {
              const incidentZones = zones.filter(z => z.incident_id === incident.incident_id);

              return (
                <div
                  key={incident.incident_id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-medium text-teal-700 dark:text-teal-400">
                          {incident.incident_type}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                          {incident.incident_name}
                        </h3>
                      </div>
                      <StatusBadge status={incident.status} type="incident" />
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Reported {new Date(incident.reported_at).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>{incidentZones.length} affected zones</span>
                    </div>

                    {/* Zone badges */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                        Impacted zones:
                      </div>
                      {incidentZones.length === 0 ? (
                        <div className="text-xs text-slate-400 italic">No zones declared yet.</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {incidentZones.map((z) => (
                            <div
                              key={z.zone_id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                            >
                              <span className="font-medium text-slate-800 dark:text-slate-200">{z.zone_name}</span>
                              <StatusBadge status={z.severity} type="priority" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal: Add Incident */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Register disaster incident
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Create a new operational emergency event for tracking and coordination.
            </p>

            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Incident name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. South Coast Flood Tidal Wave"
                  value={newIncident.incident_name}
                  onChange={(e) => setNewIncident({ ...newIncident, incident_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Incident type
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flash flood, Wildfire, Earthquake"
                  value={newIncident.incident_type}
                  onChange={(e) => setNewIncident({ ...newIncident, incident_type: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Initial status
                </label>
                <select
                  value={newIncident.status}
                  onChange={(e) => setNewIncident({ ...newIncident, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="OPEN">Open</option>
                  <option value="UNDER_CONTROL">Under control</option>
                  <option value="MONITORING">Monitoring</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-xs font-medium text-white shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Zone */}
      {showZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Add affected zone
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Declare a geographic area experiencing impact under an incident.
            </p>

            <form onSubmit={handleCreateZone} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Incident
                </label>
                <select
                  required
                  value={newZone.incident_id}
                  onChange={(e) => setNewZone({ ...newZone, incident_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                >
                  <option value="">-- Select incident --</option>
                  {incidents.map((inc) => (
                    <option key={inc.incident_id} value={inc.incident_id}>
                      #{inc.incident_id} - {inc.incident_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Zone name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zone H - East River Basin"
                  value={newZone.zone_name}
                  onChange={(e) => setNewZone({ ...newZone, zone_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priority level
                </label>
                <select
                  value={newZone.severity}
                  onChange={(e) => setNewZone({ ...newZone, severity: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowZoneModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-xs font-medium text-white shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
