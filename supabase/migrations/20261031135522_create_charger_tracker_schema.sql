/*
# Dodge Charger DIY Tracker Schema (single-tenant, no auth)

1. New Tables
- `vehicle_profile` — vehicle core specs
- `maintenance_logs` — chronological maintenance/service log entries
- `active_upgrades` — installed or in-progress modifications
- `upcoming_services` — upcoming service items with priority
- `projects` — DIY project records with difficulty, costs, status
- `project_steps` — step-by-step checklist items per project
- `parts_inventory` — sourced parts with vendor, price, delivery status
- `tools_checklist` — required tools with owned flag
- `media_tutorials` — video/reference links

2. Security
- RLS enabled on all tables, CRUD granted to anon + authenticated.
- Single-tenant, no auth — data is intentionally shared/public.

3. Notes
- Seed data for 2020 Dodge Charger Scat Pack Widebody included.
*/

-- Vehicle profile
CREATE TABLE IF NOT EXISTS vehicle_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL DEFAULT 2020,
  make text NOT NULL DEFAULT 'Dodge',
  model text NOT NULL DEFAULT 'Charger',
  trim text NOT NULL DEFAULT 'Scat Pack Widebody',
  engine text NOT NULL DEFAULT '6.4L HEMI V8',
  transmission text NOT NULL DEFAULT '8-Speed Automatic (ZF 8HP70)',
  horsepower int NOT NULL DEFAULT 485,
  torque_lbft int NOT NULL DEFAULT 475,
  mileage int NOT NULL DEFAULT 0,
  vin text DEFAULT '',
  color text DEFAULT 'Pitch Black Clear Coat',
  purchase_date date DEFAULT '2020-09-15',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE vehicle_profile ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON vehicle_profile TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_vehicle" ON vehicle_profile;
CREATE POLICY "anon_select_vehicle" ON vehicle_profile FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vehicle" ON vehicle_profile;
CREATE POLICY "anon_insert_vehicle" ON vehicle_profile FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_vehicle" ON vehicle_profile;
CREATE POLICY "anon_update_vehicle" ON vehicle_profile FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vehicle" ON vehicle_profile;
CREATE POLICY "anon_delete_vehicle" ON vehicle_profile FOR DELETE TO anon, authenticated USING (true);

-- Maintenance logs
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  mileage int NOT NULL DEFAULT 0,
  service_type text NOT NULL DEFAULT 'General',
  description text NOT NULL DEFAULT '',
  cost numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_logs TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_mlogs" ON maintenance_logs;
CREATE POLICY "anon_select_mlogs" ON maintenance_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_mlogs" ON maintenance_logs;
CREATE POLICY "anon_insert_mlogs" ON maintenance_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_mlogs" ON maintenance_logs;
CREATE POLICY "anon_update_mlogs" ON maintenance_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_mlogs" ON maintenance_logs;
CREATE POLICY "anon_delete_mlogs" ON maintenance_logs FOR DELETE TO anon, authenticated USING (true);

-- Active upgrades
CREATE TABLE IF NOT EXISTS active_upgrades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Performance',
  status text NOT NULL DEFAULT 'Installed',
  install_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE active_upgrades ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON active_upgrades TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_upgrades" ON active_upgrades;
CREATE POLICY "anon_select_upgrades" ON active_upgrades FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_upgrades" ON active_upgrades;
CREATE POLICY "anon_insert_upgrades" ON active_upgrades FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_upgrades" ON active_upgrades;
CREATE POLICY "anon_update_upgrades" ON active_upgrades FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_upgrades" ON active_upgrades;
CREATE POLICY "anon_delete_upgrades" ON active_upgrades FOR DELETE TO anon, authenticated USING (true);

-- Upcoming services
CREATE TABLE IF NOT EXISTS upcoming_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  due_mileage int,
  due_date date,
  priority text NOT NULL DEFAULT 'Medium',
  notes text DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE upcoming_services ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON upcoming_services TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_upcoming" ON upcoming_services;
CREATE POLICY "anon_select_upcoming" ON upcoming_services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_upcoming" ON upcoming_services;
CREATE POLICY "anon_insert_upcoming" ON upcoming_services FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_upcoming" ON upcoming_services;
CREATE POLICY "anon_update_upcoming" ON upcoming_services FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_upcoming" ON upcoming_services;
CREATE POLICY "anon_delete_upcoming" ON upcoming_services FOR DELETE TO anon, authenticated USING (true);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Performance',
  difficulty int NOT NULL DEFAULT 5,
  est_hours numeric(5,1) NOT NULL DEFAULT 4,
  parts_cost numeric(10,2) NOT NULL DEFAULT 0,
  shop_labor_cost numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Not Started',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE TO anon, authenticated USING (true);

-- Project steps
CREATE TABLE IF NOT EXISTS project_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description text NOT NULL,
  fastener_info text DEFAULT '',
  torque_spec text DEFAULT '',
  tools_required text DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  step_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE project_steps ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_steps TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_steps" ON project_steps;
CREATE POLICY "anon_select_steps" ON project_steps FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_steps" ON project_steps;
CREATE POLICY "anon_insert_steps" ON project_steps FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_steps" ON project_steps;
CREATE POLICY "anon_update_steps" ON project_steps FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_steps" ON project_steps;
CREATE POLICY "anon_delete_steps" ON project_steps FOR DELETE TO anon, authenticated USING (true);

-- Parts inventory
CREATE TABLE IF NOT EXISTS parts_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  part_number text DEFAULT '',
  vendor text DEFAULT '',
  price numeric(10,2) DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  delivery_status text NOT NULL DEFAULT 'Pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE parts_inventory ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON parts_inventory TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_parts" ON parts_inventory;
CREATE POLICY "anon_select_parts" ON parts_inventory FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_parts" ON parts_inventory;
CREATE POLICY "anon_insert_parts" ON parts_inventory FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_parts" ON parts_inventory;
CREATE POLICY "anon_update_parts" ON parts_inventory FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_parts" ON parts_inventory;
CREATE POLICY "anon_delete_parts" ON parts_inventory FOR DELETE TO anon, authenticated USING (true);

-- Tools checklist
CREATE TABLE IF NOT EXISTS tools_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  owned boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tools_checklist ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON tools_checklist TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_tools" ON tools_checklist;
CREATE POLICY "anon_select_tools" ON tools_checklist FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tools" ON tools_checklist;
CREATE POLICY "anon_insert_tools" ON tools_checklist FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tools" ON tools_checklist;
CREATE POLICY "anon_update_tools" ON tools_checklist FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tools" ON tools_checklist;
CREATE POLICY "anon_delete_tools" ON tools_checklist FOR DELETE TO anon, authenticated USING (true);

-- Media tutorials
CREATE TABLE IF NOT EXISTS media_tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'Video',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE media_tutorials ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON media_tutorials TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_media" ON media_tutorials;
CREATE POLICY "anon_select_media" ON media_tutorials FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_media" ON media_tutorials;
CREATE POLICY "anon_insert_media" ON media_tutorials FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_media" ON media_tutorials;
CREATE POLICY "anon_update_media" ON media_tutorials FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_media" ON media_tutorials;
CREATE POLICY "anon_delete_media" ON media_tutorials FOR DELETE TO anon, authenticated USING (true);

-- Seed: vehicle profile
INSERT INTO vehicle_profile (year, make, model, trim, engine, transmission, horsepower, torque_lbft, mileage, vin, color, purchase_date)
VALUES (2020, 'Dodge', 'Charger', 'Scat Pack Widebody', '6.4L HEMI V8', '8-Speed Automatic (ZF 8HP70)', 485, 475, 38500, '2C3CDXFJ8LH100000', 'Pitch Black Clear Coat', '2020-09-15')
ON CONFLICT DO NOTHING;

-- Seed: maintenance logs
INSERT INTO maintenance_logs (log_date, mileage, service_type, description, cost) VALUES
('2024-01-15', 31200, 'Oil Change', 'Full synthetic 5W-20, Mopar filter, 7 qts', 89.99),
('2024-03-02', 33500, 'Tire Rotation', 'Rotated 305/35R20 tires, checked tread depth', 35.00),
('2024-05-20', 35100, 'Brake Inspection', 'Front pads at 60%, rotors fine. Rear pads 80%.', 0.00),
('2024-08-10', 37000, 'Differential Fluid', 'Changed rear diff fluid - 75W-85 synthetic', 65.00)
ON CONFLICT DO NOTHING;

-- Seed: active upgrades
INSERT INTO active_upgrades (name, category, status, install_date, notes) VALUES
('Long Tube Headers', 'Performance', 'In Progress', NULL, 'Awaiting gaskets and hardware kit'),
('AC Refrigerant Recharge', 'Maintenance', 'Planned', NULL, 'System blowing warm, needs R134a recharge'),
('Lighting Controller Module', 'Electrical', 'Installed', '2024-04-10', 'Installed LED fog light controller module'),
('Catback Exhaust', 'Performance', 'Installed', '2023-11-05', 'Flowmaster American Thunder catback system')
ON CONFLICT DO NOTHING;

-- Seed: upcoming services
INSERT INTO upcoming_services (item, due_mileage, priority, notes) VALUES
('Next Oil Change', 40000, 'Medium', 'Due at 40k miles - use 5W-20 full synthetic'),
('Spark Plug Replacement', 45000, 'Low', 'NGK 1430 plugs, gap 0.043 inch'),
('Transmission Fluid Service', 42000, 'High', 'ZF 8HP70 fluid + filter change'),
('Coolant Flush', 50000, 'Low', 'Mopar OAT coolant - 50/50 mix')
ON CONFLICT DO NOTHING;

-- Seed: projects
INSERT INTO projects (title, category, difficulty, est_hours, parts_cost, shop_labor_cost, status, description) VALUES
('Installing Long Tube Headers', 'Performance', 8, 8.0, 950.00, 1200.00, 'In Progress', 'Replace factory exhaust manifolds with 1-7/8 long tube headers. Requires lifting engine slightly for access. Gain ~25-30 hp.'),
('AC System Refrigerant Recharge', 'Maintenance', 4, 2.0, 45.00, 180.00, 'Not Started', 'Recharge R134a AC system. System has been blowing warm air. Check for leaks before recharging.')
ON CONFLICT DO NOTHING;

-- Seed: project steps for Long Tube Headers
INSERT INTO project_steps (project_id, description, fastener_info, torque_spec, tools_required, completed, step_order)
SELECT p.id, s.step_desc, s.fastener, s.torque, s.tools, s.done, s.ord
FROM projects p
CROSS JOIN (VALUES
  ('Disconnect battery and lift front of vehicle', '10mm battery terminal', 'N/A', '10mm socket, floor jack, jack stands', false, 1),
  ('Remove factory heat shields', '8mm hex bolts (x6)', 'N/A', '8mm socket, ratchet', false, 2),
  ('Remove O2 sensors (4 total)', '7/8 O2 sensor socket', 'N/A', '7/8 O2 sensor socket, anti-seize', false, 3),
  ('Unbolt factory exhaust manifolds from heads', 'M10 x 1.5 bolts (x12)', '18 lb-ft (factory spec)', '10mm swivel socket, 12-point socket, extensions', false, 4),
  ('Remove factory manifolds from engine bay', 'N/A', 'N/A', 'Pry bar, patience', false, 5),
  ('Install new long tube headers with gaskets', 'M10 x 1.5 header bolts (x12)', '25 lb-ft in sequence', '10mm swivel socket, torque wrench, thread locker', false, 6),
  ('Reinstall O2 sensors into new headers', '7/8 O2 sensor socket', '30 lb-ft', '7/8 O2 sensor socket, anti-seize', false, 7),
  ('Reconnect mid-pipe to new headers', '2.5 inch clamp bolts', '35 lb-ft', '14mm socket, torque wrench', false, 8),
  ('Reinstall heat shields', '8mm hex bolts (x6)', '10 lb-ft', '8mm socket, ratchet', false, 9),
  ('Lower vehicle and reconnect battery', '10mm battery terminal', 'N/A', 'Floor jack, 10mm socket', false, 10),
  ('Start engine and check for exhaust leaks', 'N/A', 'N/A', 'Flashlight, spray bottle with soapy water', false, 11),
  ('Tune ECU for new headers (optional but recommended)', 'N/A', 'N/A', 'Diablo Trinity tuner', false, 12)
) AS s(step_desc, fastener, torque, tools, done, ord)
WHERE p.title = 'Installing Long Tube Headers'
AND NOT EXISTS (SELECT 1 FROM project_steps WHERE project_id = p.id);

-- Seed: project steps for AC Recharge
INSERT INTO project_steps (project_id, description, fastener_info, torque_spec, tools_required, completed, step_order)
SELECT p.id, s.step_desc, s.fastener, s.torque, s.tools, s.done, s.ord
FROM projects p
CROSS JOIN (VALUES
  ('Connect AC manifold gauge set to low and high side ports', 'N/A', 'N/A', 'AC manifold gauge set, gloves, safety glasses', false, 1),
  ('Check system static pressure with engine off', 'N/A', 'N/A', 'Manifold gauge set', false, 2),
  ('Start engine and set AC to max cold, blower on high', 'N/A', 'N/A', 'N/A', false, 3),
  ('Read low and high side pressures - diagnose if low on R134a', 'N/A', 'N/A', 'Manifold gauges, ambient thermometer', false, 4),
  ('Connect R134a can to manifold center hose', 'N/A', 'N/A', 'R134a recharge kit, can tap valve', false, 5),
  ('Slowly add R134a while monitoring low side pressure', 'N/A', 'Target: 30-40 psi low side', 'Can tap valve, manifold gauges', false, 6),
  ('Check vent temperature - target 40-48F at center vent', 'N/A', 'N/A', 'Thermometer in center vent', false, 7),
  ('Disconnect gauges and cap service ports', 'N/A', 'N/A', 'Manifold gauge set', false, 8)
) AS s(step_desc, fastener, torque, tools, done, ord)
WHERE p.title = 'AC System Refrigerant Recharge'
AND NOT EXISTS (SELECT 1 FROM project_steps WHERE project_id = p.id);

-- Seed: parts inventory
INSERT INTO parts_inventory (name, part_number, vendor, price, quantity, delivery_status, notes) VALUES
('Long Tube Headers 1-7/8', 'BBP-1693', 'BBK Performance', 749.99, 1, 'Delivered', 'Stainless steel, 1-7/8 primary tubes'),
('Header Gasket Set', 'FEL-5190', 'Fel-Pro', 32.99, 1, 'Delivered', 'Premium multilayer steel gaskets'),
('Header Bolt Kit M10', 'ARP-150-2501', 'ARP', 45.99, 1, 'Delivered', 'M10 x 1.5, 12-point header bolts'),
('O2 Sensor Extension Harness (x4)', 'NGK-1430EXT', 'NGK', 38.99, 1, 'In Transit', '18 inch extension harness for relocated O2 sensors'),
('Anti-Seize Compound', 'PER-13310', 'Permatex', 9.49, 1, 'Delivered', 'High temp nickel anti-seize for O2 sensors'),
('R134a Refrigerant 12oz', 'ID-AC134a', 'IDQ', 12.99, 3, 'Pending', 'Need 2-3 cans for full recharge'),
('AC Manifold Gauge Set', 'ROB-48925', 'Robinair', 89.99, 1, 'Delivered', 'R134a manifold gauge set with hoses')
ON CONFLICT DO NOTHING;

-- Seed: tools checklist
INSERT INTO tools_checklist (name, category, owned, notes) VALUES
('3/8 Drive Socket Set (8-19mm)', 'Hand Tools', true, 'Metric + SAE set'),
('1/2 Drive Torque Wrench (10-150 lb-ft)', 'Precision Tools', true, 'Calibrated 2024'),
('10mm Swivel Socket', 'Hand Tools', true, 'Essential for header bolts'),
('7/8 O2 Sensor Socket', 'Specialty Tools', true, 'Slotted for sensor wiring'),
('12-Point Socket Set', 'Hand Tools', false, 'Needed for factory manifold bolts'),
('Floor Jack + Jack Stands (3-ton)', 'Lifting Equipment', true, 'Pair of 3-ton stands'),
('Trim Removal Tool Set', 'Body Tools', true, 'For plastic clips and panels'),
('AC Manifold Gauge Set', 'Specialty Tools', true, 'R134a compatible'),
('Flashlight / Work Light', 'Shop Equipment', true, 'LED work light'),
('Thread Locker (Blue Medium)', 'Chemicals', true, 'Loctite 242 or equivalent'),
('Anti-Seize (High Temp Nickel)', 'Chemicals', true, 'For O2 sensor threads')
ON CONFLICT DO NOTHING;

-- Seed: media tutorials
INSERT INTO media_tutorials (title, url, type, description) VALUES
('Dodge Charger Long Tube Header Install (Full Walkthrough)', 'https://www.youtube.com/watch?v=header-install-charger', 'Video', 'Complete step-by-step long tube header installation on a 5.7L/6.4L Charger. Covers removal, install, torque sequence, and tips.'),
('How to Recharge Your Car AC System (R134a)', 'https://www.youtube.com/watch?v=ac-recharge-guide', 'Video', 'Beginner-friendly guide to recharging R134a AC systems using a manifold gauge set.'),
('Torque Spec Reference: 6.4L HEMI Fasteners', 'https://www.youtube.com/watch?v=hem-torque-specs', 'Video', 'Quick reference for common 6.4L HEMI torque specs: headers, intake, oil pan, and more.'),
('Header Bolt Torque Sequence Explained', 'https://www.youtube.com/watch?v=torque-sequence', 'Video', 'Why torque sequence matters and how to properly tighten header bolts in the right order.'),
('6.4L HEMI Buyers Guide and Common Issues', 'https://www.youtube.com/watch?v=hemi-buyers-guide', 'Video', 'Overview of the 6.4L HEMI platform, common problems, and maintenance intervals to watch for.')
ON CONFLICT DO NOTHING;
