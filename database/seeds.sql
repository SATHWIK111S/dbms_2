-- ============================================================================
-- Community Disaster Relief & Resource Allocation System
-- Realistic Seed Dataset (Phase 1 Verification)
-- ============================================================================

-- Clean prior records
TRUNCATE TABLE public.dispatched_aid, public.aid_requests, public.shelter_inventory,
               public.relief_supplies, public.shelters, public.affected_zones,
               public.incidents RESTART IDENTITY CASCADE;

-- 1. INCIDENTS
INSERT INTO public.incidents (incident_name, incident_type, status, reported_at) VALUES
('Coastal Cyclone ' || 'Vardah Surge', 'Cyclone / Flash Flood', 'ACTIVE', NOW() - INTERVAL '2 days'),
('Sierra Madre Forest Firestorm', 'Wildfire', 'ACTIVE', NOW() - INTERVAL '1 day'),
('North Valley Chemical Depot Leak', 'Industrial Accident', 'UNDER_CONTROL', NOW() - INTERVAL '12 hours'),
('Metropolitan Earth Tremor 6.4M', 'Earthquake', 'MONITORING', NOW() - INTERVAL '3 days');

-- 2. AFFECTED ZONES
INSERT INTO public.affected_zones (incident_id, zone_name, severity) VALUES
-- Coastal Cyclone
(1, 'Zone A - Harbor Lowlands', 'CRITICAL'),
(1, 'Zone B - Riverside Encampment', 'HIGH'),
(1, 'Zone C - Coastal Highway Corridor', 'MEDIUM'),
-- Sierra Wildfire
(2, 'Zone D - Pine Ridge Suburb', 'CRITICAL'),
(2, 'Zone E - Valley Creek Outskirts', 'HIGH'),
-- Chemical Depot
(3, 'Zone F - Industrial Park Perimeter', 'MEDIUM'),
-- Earth Tremor
(4, 'Zone G - Old Downtown Sector 4', 'LOW');

-- 3. RELIEF SUPPLIES CATALOG
INSERT INTO public.relief_supplies (item_name, unit) VALUES
('Drinking Water 10L Canisters', 'Canisters'),
('Emergency Trauma Medical Kits', 'Kits'),
('Ready-to-Eat Survival Meals (MRE)', 'Boxes (12 meals)'),
('Thermal Wool Blankets', 'Pieces'),
('Sanitation & Hygiene Packs', 'Packs'),
('Infant Nutrition & Formula', 'Cans'),
('Mobile Solar Generators (1kW)', 'Units'),
('Water Purification Tablets (100x)', 'Bottles');

-- 4. EMERGENCY RELIEF SHELTERS
INSERT INTO public.shelters (shelter_name, address) VALUES
('Central Civic Gymnasium Hub', '101 Independence Blvd, Downtown Core'),
('Red Cross Northern Logistics Depot', '450 Northside Industrial Way'),
('South Bay Memorial Community Center', '88 Pelican Bay Road, South Harbor'),
('Highland Emergency Medical Staging', '720 Mountain View Crest');

-- 5. SHELTER INVENTORY BALANCES
INSERT INTO public.shelter_inventory (shelter_id, supply_id, available_qty) VALUES
-- Central Civic Gym Hub (Shelter 1)
(1, 1, 1200), -- Water
(1, 2, 250),  -- Trauma Kits
(1, 3, 1800), -- Meals
(1, 4, 600),  -- Blankets
(1, 5, 400),  -- Hygiene
(1, 6, 150),  -- Infant Formula

-- Red Cross Northern Logistics Depot (Shelter 2)
(2, 1, 3000), -- Water
(2, 2, 800),  -- Trauma Kits
(2, 3, 4500), -- Meals
(2, 4, 1500), -- Blankets
(2, 5, 1200), -- Hygiene
(2, 7, 45),   -- Generators
(2, 8, 2500), -- Tablets

-- South Bay Memorial (Shelter 3)
(3, 1, 800),  -- Water
(3, 3, 1200), -- Meals
(3, 4, 300),  -- Blankets
(3, 6, 200),  -- Infant Formula

-- Highland Staging (Shelter 4)
(4, 2, 600),  -- Trauma Kits
(4, 4, 800),  -- Blankets
(4, 7, 30);   -- Generators

-- 6. AID REQUESTS FROM AFFECTED ZONES
INSERT INTO public.aid_requests (zone_id, supply_id, requested_qty, priority, requested_at) VALUES
-- Zone A (Critical Flash Flood)
(1, 1, 500, 'CRITICAL', NOW() - INTERVAL '8 hours'),  -- 500 Water Canisters
(1, 2, 120, 'CRITICAL', NOW() - INTERVAL '7 hours'),  -- 120 Trauma Kits
(1, 3, 800, 'HIGH',     NOW() - INTERVAL '6 hours'),  -- 800 Meals
(1, 6, 80,  'HIGH',     NOW() - INTERVAL '5 hours'),  -- 80 Infant Formula

-- Zone B (High Severity Flood)
(2, 1, 300, 'HIGH',     NOW() - INTERVAL '6 hours'),  -- 300 Water
(2, 4, 200, 'MEDIUM',   NOW() - INTERVAL '5 hours'),  -- 200 Blankets

-- Zone D (Critical Wildfire)
(4, 2, 150, 'CRITICAL', NOW() - INTERVAL '4 hours'),  -- 150 Trauma Kits
(4, 4, 400, 'CRITICAL', NOW() - INTERVAL '4 hours'),  -- 400 Blankets
(4, 7, 10,  'HIGH',     NOW() - INTERVAL '3 hours'),  -- 10 Generators

-- Zone E (High Severity Wildfire)
(5, 1, 400, 'MEDIUM',   NOW() - INTERVAL '2 hours'),  -- 400 Water
(5, 3, 600, 'MEDIUM',   NOW() - INTERVAL '2 hours'),  -- 600 Meals

-- Zone F (Chemical Depot)
(6, 5, 250, 'MEDIUM',   NOW() - INTERVAL '1 hour');   -- 250 Hygiene Packs

-- 7. INITIAL DISPATCHES
-- Request 1 (Zone A Water 500 units): 200 delivered from Shelter 1, 150 in-transit from Shelter 2 -> unallocated = 150
INSERT INTO public.dispatched_aid (request_id, shelter_id, dispatch_qty, status, dispatched_at, received_at) VALUES
(1, 1, 200, 'IN_TRANSIT', NOW() - INTERVAL '4 hours', NULL);
-- Transition request 1 first batch to DELIVERED
UPDATE public.dispatched_aid SET status = 'DELIVERED', received_at = NOW() - INTERVAL '1 hour' WHERE dispatch_id = 1;

-- Second batch in transit
INSERT INTO public.dispatched_aid (request_id, shelter_id, dispatch_qty, status, dispatched_at, received_at) VALUES
(1, 2, 150, 'IN_TRANSIT', NOW() - INTERVAL '2 hours', NULL);

-- Request 2 (Zone A Trauma kits 120 units): 60 in-transit from Shelter 4
INSERT INTO public.dispatched_aid (request_id, shelter_id, dispatch_qty, status, dispatched_at, received_at) VALUES
(2, 4, 60, 'IN_TRANSIT', NOW() - INTERVAL '3 hours', NULL);

-- Request 7 (Zone D Trauma kits 150 units): 150 delivered from Shelter 2 (fully fulfilled)
INSERT INTO public.dispatched_aid (request_id, shelter_id, dispatch_qty, status, dispatched_at, received_at) VALUES
(7, 2, 150, 'IN_TRANSIT', NOW() - INTERVAL '2 hours', NULL);
UPDATE public.dispatched_aid SET status = 'DELIVERED', received_at = NOW() - INTERVAL '30 minutes' WHERE dispatch_id = 4;
