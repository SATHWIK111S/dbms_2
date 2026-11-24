import React, { useState } from 'react';
import { Send, FileText, CheckCircle2, Truck, Plus } from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';

export default function AidRequestTracker({ requests, zones, supplies, activeRole, showToast, onRefresh, onFulfillRequest }) {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [newRequest, setNewRequest] = useState({
    zone_id: '',
    supply_id: '',
    requested_qty: '',
    priority: 'HIGH'
  });
  const [submitting, setSubmitting] = useState(false);

  const canSubmitRequests = activeRole === 'Zone Field Responder' || activeRole === 'Disaster Coordinator';

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!canSubmitRequests) {
      showToast('Only Field Responders or Coordinators can submit aid requests.', 'error');
      return;
    }

    const qty = parseInt(newRequest.requested_qty, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a quantity greater than zero.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.createRequest({
        zone_id: parseInt(newRequest.zone_id, 10),
        supply_id: parseInt(newRequest.supply_id, 10),
        requested_qty: qty,
        priority: newRequest.priority
      });
      showToast('Aid request submitted successfully.', 'success');
      setShowRequestModal(false);
      setNewRequest({ zone_id: '', supply_id: '', requested_qty: '', priority: 'HIGH' });
      onRefresh();
    } catch (err) {
      showToast(err.message || 'Failed to submit aid request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Zone Aid Requests
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Emergency supply needs raised by teams in impacted zones.
          </p>
        </div>

        <button
          onClick={() => {
            if (zones.length > 0) setNewRequest(prev => ({ ...prev, zone_id: zones[0].zone_id }));
            if (supplies.length > 0) setNewRequest(prev => ({ ...prev, supply_id: supplies[0].supply_id }));
            setShowRequestModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Request aid</span>
        </button>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Request #</th>
                <th className="py-3 px-4">Affected zone & incident</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Supply requested</th>
                <th className="py-3 px-4 text-center">Fulfillment status</th>
                <th className="py-3 px-4 text-right">Still needed</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState
                      icon={FileText}
                      title="No aid requests yet"
                      description="No requests have been submitted by field teams yet."
                      actionLabel="Submit request"
                      onAction={() => setShowRequestModal(true)}
                    />
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const deliveredPct = Math.min(100, Math.round((req.delivered_qty / req.requested_qty) * 100));
                  const transitPct = Math.min(100 - deliveredPct, Math.round((req.in_transit_qty / req.requested_qty) * 100));
                  const unallocPct = Math.max(0, 100 - deliveredPct - transitPct);

                  return (
                    <tr key={req.request_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                        #{req.request_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{req.zone_name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{req.incident_name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={req.priority} type="priority" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{req.item_name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Total needed: {req.requested_qty} {req.unit}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {/* Multi-stage fulfillment progress bar */}
                        <div className="w-48 mx-auto">
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                            <div style={{ width: `${deliveredPct}%` }} className="bg-emerald-500" title={`Delivered: ${req.delivered_qty}`} />
                            <div style={{ width: `${transitPct}%` }} className="bg-blue-500" title={`In transit: ${req.in_transit_qty}`} />
                            <div style={{ width: `${unallocPct}%` }} className="bg-amber-400" title={`Still needed: ${req.unallocated_qty}`} />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            <span className="text-emerald-700 dark:text-emerald-400">{req.delivered_qty} delivered</span>
                            <span className="text-blue-700 dark:text-blue-400">{req.in_transit_qty} in transit</span>
                            <span className="text-amber-700 dark:text-amber-400 font-medium">{req.unallocated_qty} needed</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-semibold ${req.unallocated_qty > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'}`}>
                          {req.unallocated_qty} {req.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {req.unallocated_qty > 0 ? (
                          <button
                            onClick={() => onFulfillRequest(req)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium shadow-sm transition-colors"
                            title="Assign shelter dispatch"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Dispatch</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Fulfilled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Submit Aid Request */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Submit aid request
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Ask for emergency supplies to be sent to an impacted zone.
            </p>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Impacted zone
                </label>
                <select
                  required
                  value={newRequest.zone_id}
                  onChange={(e) => setNewRequest({ ...newRequest, zone_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                >
                  <option value="">-- Select zone --</option>
                  {zones.map((z) => (
                    <option key={z.zone_id} value={z.zone_id}>
                      {z.zone_name} ({z.incident_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Required supply
                </label>
                <select
                  required
                  value={newRequest.supply_id}
                  onChange={(e) => setNewRequest({ ...newRequest, supply_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                >
                  <option value="">-- Choose item --</option>
                  {supplies.map((s) => (
                    <option key={s.supply_id} value={s.supply_id}>
                      {s.item_name} ({s.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Quantity needed
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 500"
                    value={newRequest.requested_qty}
                    onChange={(e) => setNewRequest({ ...newRequest, requested_qty: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priority level
                  </label>
                  <select
                    value={newRequest.priority}
                    onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-xs font-medium text-white shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
