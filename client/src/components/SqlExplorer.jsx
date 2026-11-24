import React, { useState } from 'react';
import { Database, Code, Shield, Layers, Copy, Check } from 'lucide-react';

export default function SqlExplorer() {
  const [activeTab, setActiveTab] = useState('schema');
  const [copiedKey, setCopiedKey] = useState(null);

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Database Architecture & SQL Reference
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Relational schema, triggers, and views implemented in PostgreSQL (3NF).
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
        {[
          { id: 'schema', label: '1. Relational tables (3NF)' },
          { id: 'triggers', label: '2. Database triggers' },
          { id: 'views', label: '3. Analytical views' },
          { id: 'constraints', label: '4. Integrity constraints' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-teal-700 text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Schema */}
      {activeTab === 'schema' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              Core normalized entities (3NF)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <span className="font-semibold text-slate-900 dark:text-white">incidents</span> — Top-level natural or human-made disasters.
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <span className="font-semibold text-slate-900 dark:text-white">affected_zones</span> — Geographic subdivisions with severity ratings.
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <span className="font-semibold text-slate-900 dark:text-white">shelters</span> — Central distribution depots stocking aid.
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <span className="font-semibold text-slate-900 dark:text-white">relief_supplies</span> — Master catalog of aid items and units.
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-teal-200 dark:border-teal-800 md:col-span-2">
                <span className="font-semibold text-teal-800 dark:text-teal-300">shelter_inventory</span> — Composite primary key (shelter_id, supply_id) maintaining balances across distribution points.
              </div>
            </div>
          </div>

          <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto shadow-sm">
            <pre className="text-emerald-400">{`-- Shelter Inventory Table with Composite Primary Key
CREATE TABLE public.shelter_inventory (
    shelter_id INT NOT NULL REFERENCES public.shelters(shelter_id) ON DELETE CASCADE,
    supply_id INT NOT NULL REFERENCES public.relief_supplies(supply_id) ON DELETE RESTRICT,
    available_qty INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (shelter_id, supply_id),
    CONSTRAINT chk_inventory_qty_nonnegative CHECK (available_qty >= 0)
);

-- Dispatched Aid Table
CREATE TABLE public.dispatched_aid (
    dispatch_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES public.aid_requests(request_id) ON DELETE CASCADE,
    shelter_id INT NOT NULL REFERENCES public.shelters(shelter_id) ON DELETE RESTRICT,
    dispatch_qty INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'IN_TRANSIT',
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_at TIMESTAMPTZ,
    CONSTRAINT chk_dispatch_status CHECK (status IN ('IN_TRANSIT', 'DELIVERED', 'CANCELLED')),
    CONSTRAINT chk_delivery_received_at CHECK (status <> 'DELIVERED' OR received_at IS NOT NULL)
);`}</pre>
          </div>
        </div>
      )}

      {/* Tab 2: Triggers */}
      {activeTab === 'triggers' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Database-level procedural triggers
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
              <li><strong className="text-slate-900 dark:text-white">trg_inventory_touch:</strong> Automatically updates the <code>last_updated</code> timestamp whenever stock levels change.</li>
              <li><strong className="text-slate-900 dark:text-white">trg_dispatch_status:</strong> Enforces that all dispatches start in "In transit" and can only transition to "Delivered" or "Cancelled".</li>
            </ol>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto space-y-4 shadow-sm">
            <div>
              <div className="text-amber-400 font-semibold mb-1">-- 1. Inventory Timestamp Audit Trigger (trg_inventory_touch)</div>
              <pre className="text-sky-300">{`CREATE OR REPLACE FUNCTION public.touch_shelter_inventory()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.available_qty IS DISTINCT FROM OLD.available_qty THEN
        NEW.last_updated := statement_timestamp();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_touch
BEFORE UPDATE OF available_qty ON public.shelter_inventory
FOR EACH ROW EXECUTE FUNCTION public.touch_shelter_inventory();`}</pre>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <div className="text-amber-400 font-semibold mb-1">-- 2. Dispatch Status Transition Machine (trg_dispatch_status)</div>
              <pre className="text-amber-300">{`CREATE OR REPLACE FUNCTION public.guard_dispatch_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status IS DISTINCT FROM 'IN_TRANSIT' THEN
            RAISE EXCEPTION 'New dispatch must start as IN_TRANSIT';
        END IF;
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.status IS DISTINCT FROM 'IN_TRANSIT'
           OR NEW.status IS NULL
           OR NEW.status NOT IN ('DELIVERED', 'CANCELLED') THEN
            RAISE EXCEPTION 'Invalid dispatch transition from % to %', OLD.status, NEW.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dispatch_status
BEFORE INSERT OR UPDATE OF status ON public.dispatched_aid
FOR EACH ROW EXECUTE FUNCTION public.guard_dispatch_status();`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Views */}
      {activeTab === 'views' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm flex items-center gap-2">
              <Code className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              Dynamic analytical SQL views
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Calculates delivery tallies, in-transit shipments, and remaining unallocated units on demand.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto space-y-4 shadow-sm">
            <div>
              <div className="text-sky-400 font-semibold mb-1">-- 7.1 Request Fulfillment View (public.v_request_fulfillment)</div>
              <pre className="text-slate-300">{`CREATE OR REPLACE VIEW public.v_request_fulfillment
WITH (security_invoker = true) AS
WITH dispatch_totals AS (
    SELECT request_id,
           SUM(dispatch_qty) FILTER (WHERE status = 'DELIVERED') AS delivered_qty,
           SUM(dispatch_qty) FILTER (WHERE status = 'IN_TRANSIT') AS in_transit_qty
    FROM public.dispatched_aid
    GROUP BY request_id
)
SELECT r.request_id, r.zone_id, r.supply_id, r.priority, r.requested_at, r.requested_qty,
       COALESCE(d.delivered_qty, 0)::INT AS delivered_qty,
       COALESCE(d.in_transit_qty, 0)::INT AS in_transit_qty,
       GREATEST(r.requested_qty - COALESCE(d.delivered_qty, 0), 0)::INT AS outstanding_qty,
       GREATEST(r.requested_qty - COALESCE(d.delivered_qty, 0) - COALESCE(d.in_transit_qty, 0), 0)::INT AS unallocated_qty
FROM public.aid_requests AS r
LEFT JOIN dispatch_totals AS d USING (request_id);`}</pre>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <div className="text-sky-400 font-semibold mb-1">-- 7.2 Critical Zone Shortages View (public.v_zone_supply_shortages)</div>
              <pre className="text-slate-300">{`CREATE OR REPLACE VIEW public.v_zone_supply_shortages
WITH (security_invoker = true) AS
SELECT z.zone_id, z.zone_name, z.severity, i.incident_name,
       s.supply_id, s.item_name, s.unit,
       SUM(f.requested_qty)::INT AS requested_qty,
       SUM(f.delivered_qty)::INT AS delivered_qty,
       SUM(f.in_transit_qty)::INT AS in_transit_qty,
       SUM(f.unallocated_qty)::INT AS unallocated_qty
FROM public.v_request_fulfillment AS f
JOIN public.affected_zones AS z ON z.zone_id = f.zone_id
JOIN public.incidents AS i ON i.incident_id = z.incident_id
JOIN public.relief_supplies AS s ON s.supply_id = f.supply_id
GROUP BY z.zone_id, z.zone_name, z.severity, i.incident_name, s.supply_id, s.item_name, s.unit
HAVING SUM(f.unallocated_qty) > 0;`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Constraints */}
      {activeTab === 'constraints' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Constraint name</th>
                <th className="py-3 px-4">Target table</th>
                <th className="py-3 px-4">Rule expression</th>
                <th className="py-3 px-4">Operational purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-2.5 px-4 font-mono font-medium text-amber-700 dark:text-amber-400">chk_incident_status</td>
                <td className="py-2.5 px-4 font-mono">incidents</td>
                <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400">IN ('OPEN', 'ACTIVE', 'UNDER_CONTROL', 'CLOSED', 'MONITORING')</td>
                <td className="py-2.5 px-4">Restricts incident status lifecycle</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono font-medium text-amber-700 dark:text-amber-400">uq_incident_zone</td>
                <td className="py-2.5 px-4 font-mono">affected_zones</td>
                <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400">UNIQUE(incident_id, zone_name)</td>
                <td className="py-2.5 px-4">Prevents duplicated zone declarations for one incident</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono font-medium text-amber-700 dark:text-amber-400">chk_zone_severity</td>
                <td className="py-2.5 px-4 font-mono">affected_zones</td>
                <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400">IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')</td>
                <td className="py-2.5 px-4">Standardized hazard triage scale</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono font-medium text-amber-700 dark:text-amber-400">chk_inventory_qty_nonnegative</td>
                <td className="py-2.5 px-4 font-mono">shelter_inventory</td>
                <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400">available_qty &gt;= 0</td>
                <td className="py-2.5 px-4">Prevents negative warehouse stock</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono font-medium text-amber-700 dark:text-amber-400">chk_aid_requested_qty_positive</td>
                <td className="py-2.5 px-4 font-mono">aid_requests</td>
                <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400">requested_qty &gt; 0</td>
                <td className="py-2.5 px-4">Demands must be positive quantities</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono font-medium text-amber-700 dark:text-amber-400">chk_dispatch_status</td>
                <td className="py-2.5 px-4 font-mono">dispatched_aid</td>
                <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400">IN ('IN_TRANSIT', 'DELIVERED', 'CANCELLED')</td>
                <td className="py-2.5 px-4">Valid lifecycle shipment states</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono font-medium text-amber-700 dark:text-amber-400">chk_delivery_received_at</td>
                <td className="py-2.5 px-4 font-mono">dispatched_aid</td>
                <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400">status &lt;&gt; 'DELIVERED' OR received_at IS NOT NULL</td>
                <td className="py-2.5 px-4">Mandates receipt timestamp when marked delivered</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
