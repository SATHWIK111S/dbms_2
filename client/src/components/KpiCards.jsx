import React from 'react';
import { AlertCircle, AlertTriangle, Home, Package, Truck } from 'lucide-react';

export default function KpiCards({ overview }) {
  const kpis = overview?.kpis || {};

  const cards = [
    {
      id: 'incidents',
      title: 'Active incidents',
      value: kpis.active_incidents ?? '-',
      sub: 'Open response operations',
      icon: AlertCircle,
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
      accentBorder: 'border-l-4 border-l-rose-500',
    },
    {
      id: 'high-priority',
      title: 'High priority zones',
      value: kpis.high_severity_zones ?? '-',
      sub: 'Critical and high severity areas',
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
      accentBorder: 'border-l-4 border-l-amber-500',
    },
    {
      id: 'stock',
      title: 'Supplies in stock',
      value: (kpis.total_stock_on_hand ?? 0).toLocaleString(),
      sub: `Available across ${kpis.operational_shelters ?? 0} shelters`,
      icon: Home,
      iconBg: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
      accentBorder: 'border-l-4 border-l-teal-600',
    },
    {
      id: 'needed',
      title: 'Units still needed',
      value: (kpis.total_unallocated_shortage ?? 0).toLocaleString(),
      sub: 'Awaiting shelter dispatch',
      icon: Package,
      iconBg: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
      accentBorder: 'border-l-4 border-l-orange-500',
    },
    {
      id: 'transit',
      title: 'In transit',
      value: kpis.active_in_transit_shipments ?? 0,
      sub: `${kpis.total_delivered_shipments ?? 0} delivered so far`,
      icon: Truck,
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
      accentBorder: 'border-l-4 border-l-blue-500',
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between ${c.accentBorder}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.title}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                {c.value}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {c.sub}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
