# Community Disaster Relief & Resource Allocation System

> **Initial Technical Development & Architecture Implementation**  
> High-integrity relational database backbone, transactional Express.js REST API, and modern React (Vite) Emergency Operations Center dashboard.

---

## 1. Project Overview & Architecture

During major natural or human-made disasters (e.g., floods, earthquakes, wildfires, industrial accidents), immediate coordination between disaster incident coordinators and centralized supply hubs is paramount to saving lives.

This project implements the full specification outlined in the **Community Disaster Relief & Resource Allocation System Architecture Report**:
- **3rd Normal Form (3NF) Relational Database** in PostgreSQL 15+ / pgAdmin 4.
- **ACID Transactional Dispatch Deductions** preventing over-allocation and race conditions.
- **Database Engine State Machine Triggers (PL/pgSQL)** enforcing lifecycle constraints.
- **Materialized Analytical Views** dynamically calculating fulfillment pipelines and shortages.
- **RESTful API Backend** built with Node.js, Express, connection pooling (`pg.Pool`), and Zod validation.
- **Emergency Operations Dashboard** built with React, Vite, and Tailwind CSS with role-based access control (RBAC).

---

## 2. Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons | Responsive Emergency Operations Center (EOC) SPA. Incident command map, shortages monitor, inventory tables, and dispatch manager. |
| **Backend** | Node.js, Express.js, Zod, Morgan, CORS | RESTful API server managing routing, payload validation, ACID transactions, and error handling. |
| **Database** | PostgreSQL 15+ & pgAdmin 4 *(+ Embedded PGlite WASM)* | ACID-compliant primary data store. Executes custom procedural triggers (`PL/pgSQL`), constraints, and dynamic shortfall views. |
| **Containerization** | Docker, Docker Compose | Multi-container setup with PostgreSQL, pgAdmin 4, Express API, and Nginx. |

---

## 3. Database Schema (3NF) & Conceptual Design

```
+-----------------------------------------------------------------------------------------+
|                                    INCIDENTS                                            |
| incident_id (PK) | incident_name | incident_type | reported_at | status                |
+-----------------------------------------------------------------------------------------+
                                          | 1:N
                                          v
+-----------------------------------------------------------------------------------------+
|                                 AFFECTED_ZONES                                          |
| zone_id (PK) | incident_id (FK) | zone_name | severity                                  |
| CONSTRAINT: UNIQUE(incident_id, zone_name)                                              |
+-----------------------------------------------------------------------------------------+
                                          | 1:N
                                          v
+-----------------------------------------------------------------------------------------+
|                                  AID_REQUESTS                                           |
| request_id (PK) | zone_id (FK) | supply_id (FK) | requested_qty | priority | req_at   |
+-----------------------------------------------------------------------------------------+
                    | 1:N                                     ^
                    v                                         | M:N (Stocks)
+-----------------------------------+             +---------------------------------------+
|          DISPATCHED_AID           |             |           SHELTER_INVENTORY           |
| dispatch_id (PK) | request_id(FK) |             | shelter_id (PK, FK) | supply_id (PK,FK)|
| shelter_id (FK)  | dispatch_qty   |             | available_qty | last_updated          |
| status           | dispatched_at  |             +---------------------------------------+
| received_at                       |                                 ^ 1:N
+-----------------------------------+                                 |
         ^ 1:N                                                        |
         |                                                 +------------------------------+
+-----------------------------------+                      |           SHELTERS           |
|          RELIEF_SUPPLIES          |                      | shelter_id (PK)              |
| supply_id (PK) | item_name (UQ)   |                      | shelter_name | address       |
| unit                              |                      +------------------------------+
+-----------------------------------+
```

### Table Definitions & Integrity Constraints

1. **`incidents`**: Top-level registry for disasters.
   - `chk_incident_status`: `status IN ('OPEN', 'ACTIVE', 'UNDER_CONTROL', 'CLOSED', 'MONITORING')`
2. **`affected_zones`**: Hazard areas.
   - `uq_incident_zone`: `UNIQUE(incident_id, zone_name)`
   - `chk_zone_severity`: `severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`
3. **`shelters`**: Logistical bases and distribution hubs.
4. **`relief_supplies`**: Standardized catalog of disaster aid supplies.
5. **`shelter_inventory`**: Live inventory balances per shelter.
   - **Composite Primary Key**: `(shelter_id, supply_id)`
   - `chk_inventory_qty_nonnegative`: `available_qty >= 0`
6. **`aid_requests`**: Demands logged from field teams.
   - `chk_request_priority`: `priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`
   - `chk_aid_requested_qty_positive`: `requested_qty > 0`
7. **`dispatched_aid`**: Shipments moving from shelters to affected zones.
   - `chk_dispatch_status`: `status IN ('IN_TRANSIT', 'DELIVERED', 'CANCELLED')`
   - `chk_delivery_received_at`: `status <> 'DELIVERED' OR received_at IS NOT NULL`

---

## 4. Database Triggers & State Integrity Rules

### 1. Shelter Inventory Timestamp Audit Trigger (`trg_inventory_touch`)
Ensures that any inventory balance update automatically timestamps `last_updated` at statement runtime without relying on application code:
```sql
CREATE OR REPLACE FUNCTION public.touch_shelter_inventory()
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
FOR EACH ROW EXECUTE FUNCTION public.touch_shelter_inventory();
```

### 2. Dispatch Status Transition State Machine (`trg_dispatch_status`)
Guarantees at the database engine level that:
1. Every dispatch must be created as `IN_TRANSIT`.
2. Can only transition from `IN_TRANSIT` to `DELIVERED` or `CANCELLED`.
3. Blocks illegal jumps or alterations after delivery:
```sql
CREATE OR REPLACE FUNCTION public.guard_dispatch_status()
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
FOR EACH ROW EXECUTE FUNCTION public.guard_dispatch_status();
```

---

## 5. Real-Time Analytical SQL Views

### 7.1 Request Fulfillment Calculation (`v_request_fulfillment`)
Aggregates delivered and in-transit shipments to dynamically calculate outstanding and unallocated demand per request:
```sql
CREATE OR REPLACE VIEW public.v_request_fulfillment
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
LEFT JOIN dispatch_totals AS d USING (request_id);
```

### 7.2 Critical Zone Supply Shortages (`v_zone_supply_shortages`)
Aggregates across affected zones, joining incidents and supplies to highlight immediate humanitarian deficits where `SUM(unallocated_qty) > 0`:
```sql
CREATE OR REPLACE VIEW public.v_zone_supply_shortages
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
HAVING SUM(f.unallocated_qty) > 0;
```

---

## 6. RESTful API Contract

All endpoints are prefixed with `/api/v1`:

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/incidents` | All | Fetch all disaster incidents with active status and affected zones count. |
| `POST` | `/incidents` | Disaster Coordinator | Create new incident (`{ incident_name, incident_type, status }`). |
| `GET` | `/zones` | All | Fetch all registered zones with severity and incident parent. |
| `POST` | `/zones` | Disaster Coordinator | Register affected zone (`{ incident_id, zone_name, severity }`). |
| `GET` | `/shelters` | All | Fetch shelters and inventory counts. |
| `GET` | `/shelters/:id/inventory`| All | Retrieve stock on hand, units, and `last_updated` audit timestamp. |
| `PATCH`| `/shelters/:id/inventory`| Shelter Logistics Manager | Update stock levels (`{ supply_id, available_qty }`). Fires `trg_inventory_touch`. |
| `GET` | `/supplies` | All | Catalog of standardized relief supplies. |
| `GET` | `/requests` | All | Fetch requests joined with dynamic view `v_request_fulfillment`. |
| `POST` | `/requests` | Zone Field Responder, Coordinator | Submit emergency aid demand from zone. |
| `GET` | `/analytics/shortages` | All | Query critical shortages directly from `public.v_zone_supply_shortages`. |
| `GET` | `/dispatches` | All | List all dispatches and delivery statuses. |
| `POST` | `/dispatches` | Central Command Dispatcher | **Issue dispatch with Transactional Deduction**: Atomically inserts dispatch in `IN_TRANSIT` and decrements shelter stock. |
| `PATCH`| `/dispatches/:id/status` | Central Command Dispatcher, Shelter Manager | Transition status to `DELIVERED` (with `received_at`) or `CANCELLED`. Enforced by `trg_dispatch_status`. |
| `POST` | `/database/reset` | All | Reset database schema, triggers, views, and seed datasets to baseline. |
| `GET` | `/health` | All | Service health check and active database engine mode. |

---

## 7. Role-Based Access Control (RBAC)

The system enforces 4 discrete operational roles via the `x-user-role` header (switchable in the UI navbar):
1. **Disaster Coordinator**: Creates disaster incidents and registers affected zones.
2. **Zone Field Responder**: Submits and tracks aid requests for assigned disaster zones.
3. **Shelter Logistics Manager**: Updates shelter inventory balances and confirms deliveries.
4. **Central Command Dispatcher**: Authorizes dispatches to unallocated shortages.

---

## 8. Quick Start & Setup Instructions

### Option A: Local Node.js (Zero-Configuration, Instant Run)

The application supports dual-mode database operation: it automatically connects to a local/remote PostgreSQL instance if running, or falls back to an embedded full PostgreSQL WASM engine (PGlite) so it runs out-of-the-box without setup!

1. **Install backend dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Run backend verification & automated tests:**
   ```bash
   npm run test:db
   node src/scripts/testApiIntegration.js
   ```

3. **Start the API Server:**
   ```bash
   npm start
   # Server runs on http://localhost:5000
   ```

4. **Install and run the Frontend:**
   ```bash
   cd ../client
   npm install
   npm run dev
   # Client runs on http://localhost:3000
   ```

---

### Option B: Docker Compose (Full PostgreSQL 16 + pgAdmin 4 Stack)

To run the complete production containerized stack with pgAdmin 4:

```bash
docker-compose up --build
```

- **Frontend EOC Dashboard**: `http://localhost:3000`
- **Express REST API**: `http://localhost:5000/api/v1`
- **pgAdmin 4 Web GUI**: `http://localhost:5050`
  - **Login Email**: `admin@disasterrelief.org`
  - **Password**: `adminpassword`
  - **Database Host**: `postgres` | **Port**: `5432` | **User**: `postgres` | **Password**: `postgrespassword`

---

## 9. Verification & Automated Test Results

The automated integration test suite (`server/src/scripts/testApiIntegration.js`) validates all 6 operational suites:

```text
================================================================
COMMUNITY DISASTER RELIEF SYSTEM - REST API INTEGRATION TEST
================================================================

[Suite 1] Health & System Info:
  ✓ PASS: GET /api/v1/health returns 200 OK
  ✓ PASS: System status reported as healthy

[Suite 2] Incidents & RBAC Permissions:
  ✓ PASS: GET /api/v1/incidents returns seeded incidents
  ✓ PASS: POST /api/v1/incidents rejects unauthorized role with 403 Forbidden
  ✓ PASS: POST /api/v1/incidents accepts Disaster Coordinator and creates record

[Suite 3] Shelter Inventory & Audit Trigger:
  ✓ PASS: GET /api/v1/shelters/1/inventory returns stock
  ✓ PASS: PATCH /api/v1/shelters/1/inventory updates stock level
  ✓ PASS: Updated stock reflects incremented count

[Suite 4] Aid Requests & Dynamic View:
  ✓ PASS: POST /api/v1/requests creates new aid demand
  ✓ PASS: View dynamically reports 100 unallocated units

[Suite 5] Analytical View v_zone_supply_shortages:
  ✓ PASS: GET /api/v1/analytics/shortages returns active shortfalls
  ✓ PASS: Query directly sourced from view

[Suite 6] Transactional Dispatch Deductions & trg_dispatch_status:
  ✓ PASS: POST /api/v1/dispatches creates dispatch inside ACID transaction
  ✓ PASS: DB trigger trg_dispatch_status enforced status IN_TRANSIT
  ✓ PASS: Shelter inventory atomical deduction verified: 1250 -> 1210
  ✓ PASS: Dispatched shipment transitioned to DELIVERED with received_at
  ✓ PASS: trg_dispatch_status rejects illegal transition out of terminal state DELIVERED with 400 Bad Request

================================================================
TEST RUN COMPLETE: 17 PASSED, 0 FAILED
================================================================
```
