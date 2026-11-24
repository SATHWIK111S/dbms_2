import React, { useState } from 'react';
import { Package, Search, Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';

export default function ShortagesMonitor({ shortages, onDispatchShortcut }) {
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = (shortages || []).filter((item) => {
    const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter;
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.zone_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.incident_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const topShortage = shortages && shortages.length > 0
    ? [...shortages].sort((a, b) => b.unallocated_qty - a.unallocated_qty)[0]
    : null;

  return (
    <div className="space-y-4">
      {/* Top Urgent Need Callout Banner */}
      {topShortage && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Highest priority need
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                <span className="text-amber-700 dark:text-amber-400 font-extrabold">{topShortage.unallocated_qty} {topShortage.unit}</span> of {topShortage.item_name} still needed in {topShortage.zone_name}
              </div>
            </div>
          </div>

          <button
            onClick={() => onDispatchShortcut(topShortage)}
            className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Send supplies</span>
          </button>
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Supplies Still Needed by Zone
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Active requests that have not yet been assigned to a shelter dispatch.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search items or zones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Severity filter pills */}
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => {
              const count = sev === 'ALL'
                ? shortages.length
                : shortages.filter(s => s.severity === sev).length;

              return (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    severityFilter === sev
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{sev === 'ALL' ? 'All' : sev.charAt(0) + sev.slice(1).toLowerCase()}</span>
                  <span className="ml-1 text-[11px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Affected zone & incident</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Supply item</th>
                <th className="py-3 px-4 text-right">Requested</th>
                <th className="py-3 px-4 text-right">Delivered</th>
                <th className="py-3 px-4 text-right">In transit</th>
                <th className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">Units still needed</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    {shortages.length === 0 ? (
                      <EmptyState
                        icon={CheckCircle2}
                        title="All supplies fulfilled"
                        description="All requested supplies have been dispatched or delivered. No shortages right now."
                      />
                    ) : (
                      <EmptyState
                        icon={Search}
                        title="No matching shortages"
                        description="No supply needs match your current search and severity filters."
                        resetLabel="Reset filters"
                        onReset={() => {
                          setSearchTerm('');
                          setSeverityFilter('ALL');
                        }}
                      />
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={`${item.zone_id}-${item.supply_id}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{item.zone_name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.incident_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.severity} type="priority" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{item.item_name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Unit: {item.unit}</div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                      {item.requested_qty.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-700 dark:text-emerald-400">
                      {item.delivered_qty.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-blue-700 dark:text-blue-400">
                      {item.in_transit_qty.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                        {item.unallocated_qty.toLocaleString()} {item.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onDispatchShortcut(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium shadow-sm transition-colors"
                        title="Create dispatch to fulfill this need"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
