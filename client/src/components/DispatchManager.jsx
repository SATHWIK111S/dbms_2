import React, { useState } from 'react';
import { Truck, CheckCircle2, XCircle, Plus, Search } from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';

export default function DispatchManager({
  dispatches,
  requests,
  shelters,
  activeRole,
  showToast,
  onRefresh,
  prefillRequest
}) {
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [newDispatch, setNewDispatch] = useState({
    request_id: '',
    shelter_id: '',
    dispatch_qty: ''
  });
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (prefillRequest) {
      setNewDispatch({
        request_id: prefillRequest.request_id,
        shelter_id: shelters[0]?.shelter_id || '',
        dispatch_qty: prefillRequest.unallocated_qty || ''
      });
      setShowDispatchModal(true);
    }
  }, [prefillRequest, shelters]);

  const canAuthorizeDispatch = activeRole === 'Central Command Dispatcher';
  const canUpdateStatus = activeRole === 'Central Command Dispatcher' || activeRole === 'Shelter Logistics Manager';

  const handleCreateDispatch = async (e) => {
    e.preventDefault();
    if (!canAuthorizeDispatch) {
      showToast('Only Dispatch Coordinators can authorize new shipments.', 'error');
      return;
    }

    const qty = parseInt(newDispatch.dispatch_qty, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a positive dispatch quantity.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.createDispatch({
        request_id: parseInt(newDispatch.request_id, 10),
        shelter_id: parseInt(newDispatch.shelter_id, 10),
        dispatch_qty: qty
      });
      showToast('New dispatch started (In transit). Inventory deducted from shelter.', 'success');
      setShowDispatchModal(false);
      setNewDispatch({ request_id: '', shelter_id: '', dispatch_qty: '' });
      onRefresh();
    } catch (err) {
      showToast(err.message || 'Failed to issue dispatch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransitionStatus = async (dispatchId, targetStatus) => {
    if (!canUpdateStatus) {
      showToast('Only Dispatch Coordinators or Shelter Managers can update delivery status.', 'error');
      return;
    }

    try {
      const payload = {
        status: targetStatus,
        received_at: targetStatus === 'DELIVERED' ? new Date().toISOString() : undefined
      };
      await api.updateDispatchStatus(dispatchId, payload);
      if (targetStatus === 'DELIVERED') {
        showToast('Dispatch marked as delivered.', 'success');
      } else {
        showToast('Dispatch cancelled and inventory returned to shelter.', 'info');
      }
      onRefresh();
    } catch (err) {
      showToast(err.message || 'Failed to update dispatch status', 'error');
    }
  };

  const filteredDispatches = (dispatches || []).filter((d) => {
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const matchesSearch =
      d.shelter_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.zone_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const selectedReqObj = requests.find(r => r.request_id === parseInt(newDispatch.request_id, 10));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Dispatch Tracking
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor relief supply shipments moving from shelters to affected zones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter dispatches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'IN_TRANSIT', label: 'In transit' },
              { id: 'DELIVERED', label: 'Delivered' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === s.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (requests.length > 0) setNewDispatch(prev => ({ ...prev, request_id: requests[0].request_id }));
              if (shelters.length > 0) setNewDispatch(prev => ({ ...prev, shelter_id: shelters[0].shelter_id }));
              setShowDispatchModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New dispatch</span>
          </button>
        </div>
      </div>

      {/* Dispatches Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Dispatch #</th>
                <th className="py-3 px-4">Origin shelter</th>
                <th className="py-3 px-4">Destination zone</th>
                <th className="py-3 px-4">Items dispatched</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Sent at</th>
                <th className="py-3 px-4">Delivered at</th>
                <th className="py-3 px-4 text-center">Update status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    {dispatches.length === 0 ? (
                      <EmptyState
                        icon={Truck}
                        title="No dispatches yet"
                        description="Open an aid request to create your first relief dispatch."
                      />
                    ) : (
                      <EmptyState
                        icon={Search}
                        title="No matching dispatches"
                        description="No dispatches match these filters."
                        resetLabel="Reset filters"
                        onReset={() => {
                          setSearchTerm('');
                          setStatusFilter('ALL');
                        }}
                      />
                    )}
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((d) => (
                  <tr key={d.dispatch_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                      #{d.dispatch_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{d.shelter_name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">{d.shelter_address}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{d.zone_name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {d.incident_name} (Req #{d.request_id})
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {d.dispatch_qty} {d.unit}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{d.item_name}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={d.status} type="dispatch" />
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(d.dispatched_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {d.received_at ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          {new Date(d.received_at).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">In transit</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {d.status === 'IN_TRANSIT' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleTransitionStatus(d.dispatch_id, 'DELIVERED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium shadow-sm transition-colors"
                            title="Mark shipment as delivered"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Delivered</span>
                          </button>
                          <button
                            onClick={() => handleTransitionStatus(d.dispatch_id, 'CANCELLED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs transition-colors"
                            title="Cancel dispatch and restore stock"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Authorize New Dispatch */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Create relief dispatch
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Authorize a shipment from a shelter to fulfill an aid request.
            </p>

            <form onSubmit={handleCreateDispatch} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target aid request
                </label>
                <select
                  required
                  value={newDispatch.request_id}
                  onChange={(e) => {
                    const reqId = e.target.value;
                    const r = requests.find(req => req.request_id === parseInt(reqId, 10));
                    setNewDispatch({
                      ...newDispatch,
                      request_id: reqId,
                      dispatch_qty: r ? r.unallocated_qty : ''
                    });
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                >
                  <option value="">-- Select aid request --</option>
                  {requests.map((r) => (
                    <option key={r.request_id} value={r.request_id}>
                      Req #{r.request_id} - {r.zone_name}: {r.item_name} ({r.unallocated_qty} needed)
                    </option>
                  ))}
                </select>
              </div>

              {selectedReqObj && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <div>Zone: <span className="font-semibold text-slate-900 dark:text-white">{selectedReqObj.zone_name}</span></div>
                  <div>Supply: <span className="font-semibold text-teal-700 dark:text-teal-400">{selectedReqObj.item_name}</span></div>
                  <div>Still needed: <span className="font-bold text-amber-700 dark:text-amber-400">{selectedReqObj.unallocated_qty} {selectedReqObj.unit}</span></div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Origin shelter
                </label>
                <select
                  required
                  value={newDispatch.shelter_id}
                  onChange={(e) => setNewDispatch({ ...newDispatch, shelter_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                >
                  <option value="">-- Choose supplying shelter --</option>
                  {shelters.map((s) => (
                    <option key={s.shelter_id} value={s.shelter_id}>
                      {s.shelter_name} ({s.address})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Dispatch quantity {selectedReqObj ? `(${selectedReqObj.unit})` : ''}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 150"
                  value={newDispatch.dispatch_qty}
                  onChange={(e) => setNewDispatch({ ...newDispatch, dispatch_qty: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-xs font-medium text-white shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Start dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
