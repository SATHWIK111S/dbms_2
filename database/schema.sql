-- ============================================================================
-- Community Disaster Relief & Resource Allocation System
-- Relational Database Schema DDL (3rd Normal Form - 3NF)
-- Compatible with PostgreSQL 15+ & pgAdmin 4
-- ============================================================================

-- Drop views first to avoid dependency blocks
DROP VIEW IF EXISTS public.v_zone_supply_shortages CASCADE;
DROP VIEW IF EXISTS public.v_request_fulfillment CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.dispatched_aid CASCADE;
DROP TABLE IF EXISTS public.aid_requests CASCADE;
DROP TABLE IF EXISTS public.shelter_inventory CASCADE;
DROP TABLE IF EXISTS public.relief_supplies CASCADE;
DROP TABLE IF EXISTS public.shelters CASCADE;
DROP TABLE IF EXISTS public.affected_zones CASCADE;
DROP TABLE IF EXISTS public.incidents CASCADE;

-- 1. INCIDENTS TABLE
-- Top-level registry for natural or human-made disasters triggering response efforts
CREATE TABLE public.incidents (
    incident_id SERIAL PRIMARY KEY,
    incident_name TEXT NOT NULL,
    incident_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    reported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_incident_status CHECK (
        status IN ('OPEN', 'ACTIVE', 'UNDER_CONTROL', 'CLOSED', 'MONITORING')
    )
);

-- 2. AFFECTED ZONES TABLE
-- Geographic or administrative subdivisions experiencing disaster impact
CREATE TABLE public.affected_zones (
    zone_id SERIAL PRIMARY KEY,
    incident_id INT NOT NULL REFERENCES public.incidents(incident_id) ON DELETE CASCADE,
    zone_name TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'MEDIUM',
    CONSTRAINT uq_incident_zone UNIQUE (incident_id, zone_name),
    CONSTRAINT chk_zone_severity CHECK (
        severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
    )
);

-- 3. SHELTERS TABLE
-- Logistical depots, emergency bases, and community shelters holding supplies
CREATE TABLE public.shelters (
    shelter_id SERIAL PRIMARY KEY,
    shelter_name TEXT NOT NULL,
    address TEXT NOT NULL
);

-- 4. RELIEF SUPPLIES TABLE
-- Master catalog of standardized relief inventory items
CREATE TABLE public.relief_supplies (
    supply_id SERIAL PRIMARY KEY,
    item_name TEXT NOT NULL UNIQUE,
    unit TEXT NOT NULL
);

-- 5. SHELTER INVENTORY TABLE
-- Live inventory balance per shelter. Automated trigger touch updates `last_updated`.
CREATE TABLE public.shelter_inventory (
    shelter_id INT NOT NULL REFERENCES public.shelters(shelter_id) ON DELETE CASCADE,
    supply_id INT NOT NULL REFERENCES public.relief_supplies(supply_id) ON DELETE RESTRICT,
    available_qty INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (shelter_id, supply_id),
    CONSTRAINT chk_inventory_qty_nonnegative CHECK (available_qty >= 0)
);

-- 6. AID REQUESTS TABLE
-- Demands issued by zone field teams requesting specific quantities of supplies
CREATE TABLE public.aid_requests (
    request_id SERIAL PRIMARY KEY,
    zone_id INT NOT NULL REFERENCES public.affected_zones(zone_id) ON DELETE CASCADE,
    supply_id INT NOT NULL REFERENCES public.relief_supplies(supply_id) ON DELETE RESTRICT,
    requested_qty INT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_request_priority CHECK (
        priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
    ),
    CONSTRAINT chk_aid_requested_qty_positive CHECK (requested_qty > 0)
);

-- 7. DISPATCHED AID TABLE
-- Physical shipments moving from a shelter toward an affected zone request
CREATE TABLE public.dispatched_aid (
    dispatch_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES public.aid_requests(request_id) ON DELETE CASCADE,
    shelter_id INT NOT NULL REFERENCES public.shelters(shelter_id) ON DELETE RESTRICT,
    dispatch_qty INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'IN_TRANSIT',
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_at TIMESTAMPTZ,
    CONSTRAINT chk_dispatch_status CHECK (
        status IN ('IN_TRANSIT', 'DELIVERED', 'CANCELLED')
    ),
    CONSTRAINT chk_delivery_received_at CHECK (
        status <> 'DELIVERED' OR received_at IS NOT NULL
    ),
    CONSTRAINT chk_dispatch_qty_positive CHECK (dispatch_qty > 0)
);

-- Indexes for foreign key lookups and queries
CREATE INDEX idx_affected_zones_incident ON public.affected_zones(incident_id);
CREATE INDEX idx_shelter_inv_supply ON public.shelter_inventory(supply_id);
CREATE INDEX idx_aid_requests_zone ON public.aid_requests(zone_id);
CREATE INDEX idx_aid_requests_supply ON public.aid_requests(supply_id);
CREATE INDEX idx_dispatched_aid_request ON public.dispatched_aid(request_id);
CREATE INDEX idx_dispatched_aid_shelter ON public.dispatched_aid(shelter_id);
CREATE INDEX idx_dispatched_aid_status ON public.dispatched_aid(status);
