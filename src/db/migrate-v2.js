// Sin Miedo AI — Migration v2: Field Template Structures
// Non-destructive: ALTER TABLE ADD COLUMN + CREATE TABLE IF NOT EXISTS
// Safe to run multiple times (each ALTER wrapped in try/catch)

import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'db', 'sinmiedo.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function addColumn(table, column, type) {
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    console.log(`  ✓ ${table}.${column}`);
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log(`  ○ ${table}.${column} (already exists)`);
    } else {
      console.error(`  ✗ ${table}.${column}: ${e.message}`);
    }
  }
}

console.log('\n══════════════════════════════════════════');
console.log('  Sin Miedo AI — Database Migration v2');
console.log('  Field Template Structures Upgrade');
console.log('══════════════════════════════════════════\n');

// ═══════════════════════════════════════════
// 1. ALTER packages table
// ═══════════════════════════════════════════
console.log('▸ ALTER TABLE packages');
addColumn('packages', 'scope_type', 'TEXT');
addColumn('packages', 'wo_number', 'TEXT');
addColumn('packages', 'ets_number', 'TEXT');
addColumn('packages', 'welding_required', 'INTEGER DEFAULT 0');
addColumn('packages', 'nbic_type', 'TEXT');
addColumn('packages', 'equipment_name', 'TEXT');
addColumn('packages', 'spec', 'TEXT');
addColumn('packages', 'entity_type', 'TEXT');
addColumn('packages', 'system_process', 'TEXT');
addColumn('packages', 'pressure_test_required', 'INTEGER DEFAULT 0');
addColumn('packages', 'test_pressure', 'REAL');
addColumn('packages', 'shell_side_test_pressure', 'REAL');
addColumn('packages', 'shell_side_completion_date', 'TEXT');
addColumn('packages', 'tube_side_test_pressure', 'REAL');
addColumn('packages', 'tube_side_completion_date', 'TEXT');
addColumn('packages', 'work_description', 'TEXT');
addColumn('packages', 'date_sold', 'TEXT');
addColumn('packages', 'scanned', 'INTEGER DEFAULT 0');
addColumn('packages', 'transmitted', 'INTEGER DEFAULT 0');
addColumn('packages', 'received', 'INTEGER DEFAULT 0');
addColumn('packages', 'flg_mapped', 'INTEGER DEFAULT 0');
addColumn('packages', 'supervisor_signoff', 'TEXT');
addColumn('packages', 'supervisor_date', 'TEXT');
addColumn('packages', 'qaqc_signoff', 'TEXT');
addColumn('packages', 'qaqc_date', 'TEXT');
addColumn('packages', 'customer_signoff', 'TEXT');
addColumn('packages', 'customer_date', 'TEXT');

// ═══════════════════════════════════════════
// 2. ALTER welds table
// ═══════════════════════════════════════════
console.log('\n▸ ALTER TABLE welds');
addColumn('welds', 'drawing_number', 'TEXT');
// joint_type already exists on welds
addColumn('welds', 'welder_id_2', 'INTEGER REFERENCES welders(id)');
addColumn('welds', 'welder_id_3', 'INTEGER REFERENCES welders(id)');
addColumn('welds', 'welder_id_4', 'INTEGER REFERENCES welders(id)');
// vt_inspector already exists — skip
addColumn('welds', 'pt_mt_prep_date', 'TEXT');
addColumn('welds', 'fitup_accept_date', 'TEXT');
addColumn('welds', 'fitup_inspector', 'TEXT');
addColumn('welds', 'pt_mt_root_date', 'TEXT');
addColumn('welds', 'pt_mt_final_date', 'TEXT');
addColumn('welds', 'nde_date', 'TEXT');
addColumn('welds', 'nde_reject_welder', 'TEXT');
addColumn('welds', 'repair_1_date', 'TEXT');
addColumn('welds', 'pwht_date', 'TEXT');
addColumn('welds', 'pwht_required', 'INTEGER DEFAULT 0');
addColumn('welds', 'bhn_date', 'TEXT');
addColumn('welds', 'ferrite_date', 'TEXT');
addColumn('welds', 'pmi_date', 'TEXT');
addColumn('welds', 'ut_thickness_date', 'TEXT');
addColumn('welds', 'hydro_psi', 'REAL');
addColumn('welds', 'hydro_date', 'TEXT');
addColumn('welds', 'spec', 'TEXT');
addColumn('welds', 'weld_category', 'TEXT');
addColumn('welds', 'deleted', 'INTEGER DEFAULT 0');
addColumn('welds', 'job_completed', 'INTEGER DEFAULT 0');

// ═══════════════════════════════════════════
// 3. ALTER flanges table
// ═══════════════════════════════════════════
console.log('\n▸ ALTER TABLE flanges');
addColumn('flanges', 'drawing_number', 'TEXT');
addColumn('flanges', 'flange_number', 'TEXT');
addColumn('flanges', 'package_number', 'TEXT');
addColumn('flanges', 'pipe_spec', 'TEXT');
addColumn('flanges', 'connection_worked', 'TEXT');
addColumn('flanges', 'flange_material', 'TEXT');
addColumn('flanges', 'stud_length', 'TEXT');
addColumn('flanges', 'stud_type', 'TEXT');
addColumn('flanges', 'stud_quantity', 'INTEGER');
addColumn('flanges', 'torque_wrench_sn', 'TEXT');
addColumn('flanges', 'craftsmen_signoff', 'TEXT');
addColumn('flanges', 'foreman_signoff', 'TEXT');
addColumn('flanges', 'inspector_signoff', 'TEXT');
addColumn('flanges', 'customer_signoff', 'TEXT');
addColumn('flanges', 'deleted', 'INTEGER DEFAULT 0');

// ═══════════════════════════════════════════
// 4. CREATE new tables
// ═══════════════════════════════════════════
console.log('\n▸ CREATE TABLE wire_inventory');
db.prepare(`
  CREATE TABLE IF NOT EXISTS wire_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    filler_metal TEXT NOT NULL,
    process TEXT,
    application TEXT,
    wire_size TEXT,
    amount_ordered REAL,
    amount_onsite REAL,
    audit_date TEXT,
    auditor TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`).run();
console.log('  ✓ wire_inventory created');

console.log('\n▸ CREATE TABLE rfis');
db.prepare(`
  CREATE TABLE IF NOT EXISTS rfis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    rfi_number TEXT NOT NULL,
    wo_number TEXT,
    ets_number TEXT,
    date_submitted TEXT,
    asked_by TEXT,
    bic TEXT,
    subject TEXT,
    status TEXT DEFAULT 'open' CHECK(status IN ('open','closed','pending')),
    package_built INTEGER DEFAULT 0,
    comments TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(job_id, rfi_number)
  )
`).run();
console.log('  ✓ rfis created');

console.log('\n▸ CREATE TABLE iwr_awr');
db.prepare(`
  CREATE TABLE IF NOT EXISTS iwr_awr (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    iwr_awr_number TEXT NOT NULL,
    rr_number TEXT,
    parent_job_plan TEXT,
    unit TEXT,
    equipment_number TEXT,
    welding_required INTEGER DEFAULT 0,
    nbic_repair INTEGER DEFAULT 0,
    hydro_psi REAL,
    hydro_complete INTEGER DEFAULT 0,
    date_sold TEXT,
    work_description TEXT,
    deleted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(job_id, iwr_awr_number)
  )
`).run();
console.log('  ✓ iwr_awr created');

console.log('\n▸ CREATE TABLE crew');
db.prepare(`
  CREATE TABLE IF NOT EXISTS crew (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    name TEXT NOT NULL,
    role TEXT,
    shift TEXT CHECK(shift IN ('day','night')),
    start_date TEXT,
    phone TEXT,
    email TEXT,
    designation TEXT,
    unit_area TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`).run();
console.log('  ✓ crew created');

// ═══════════════════════════════════════════
// 5. SEED demo data for new tables
// ═══════════════════════════════════════════
console.log('\n▸ Seeding demo data...');

// Find the first job to attach demo data to
const job = db.prepare('SELECT id FROM jobs ORDER BY id LIMIT 1').get();
if (job) {
  const jobId = job.id;

  // Wire Inventory
  const existingWire = db.prepare('SELECT COUNT(*) as c FROM wire_inventory WHERE job_id = ?').get(jobId);
  if (existingWire.c === 0) {
    const wireInsert = db.prepare(`
      INSERT INTO wire_inventory (job_id, filler_metal, process, application, wire_size, amount_ordered, amount_onsite, audit_date, auditor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    wireInsert.run(jobId, 'ER308L', 'GTAW', 'Stainless root pass', '3/32"', 100, 85, '2026-10-20', 'J. Martinez');
    wireInsert.run(jobId, 'E7018', 'SMAW', 'Carbon steel fill/cap', '1/8"', 200, 150, '2026-10-20', 'J. Martinez');
    wireInsert.run(jobId, 'ER70S-6', 'GMAW', 'Carbon steel fab welds', '0.035"', 50, 45, '2026-10-20', 'J. Martinez');
    wireInsert.run(jobId, 'ER309L', 'GTAW', 'Dissimilar metal joints', '3/32"', 30, 28, '2026-10-20', 'J. Martinez');
    wireInsert.run(jobId, 'E309L-16', 'SMAW', 'SS to CS transitions', '1/8"', 40, 35, '2026-10-20', 'J. Martinez');
    console.log('  ✓ wire_inventory: 5 rows seeded');
  } else {
    console.log('  ○ wire_inventory: already has data');
  }

  // RFIs
  const existingRfi = db.prepare('SELECT COUNT(*) as c FROM rfis WHERE job_id = ?').get(jobId);
  if (existingRfi.c === 0) {
    const rfiInsert = db.prepare(`
      INSERT INTO rfis (job_id, rfi_number, wo_number, ets_number, date_submitted, asked_by, bic, subject, status, package_built, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    rfiInsert.run(jobId, 'RFI-001', 'WO-4521', 'ETS-1001', '2026-10-15', 'F. Vasquez', 'M. Thompson', 'NDE acceptance criteria for CrMo welds at E-101', 'closed', 1, 'Resolved per API 570 Section 7.6');
    rfiInsert.run(jobId, 'RFI-002', 'WO-4522', 'ETS-1002', '2026-10-17', 'R. Garcia', 'M. Thompson', 'PWHT soak time for 2.5" CS pipe', 'open', 0, 'Awaiting engineering response');
    rfiInsert.run(jobId, 'RFI-003', 'WO-4523', null, '2026-10-19', 'T. Nguyen', 'J. Wilson', 'Hydro test pressure for V-204 shell side', 'pending', 0, 'Client reviewing P&ID markup');
    console.log('  ✓ rfis: 3 rows seeded');
  } else {
    console.log('  ○ rfis: already has data');
  }

  // IWR/AWR
  const existingIwr = db.prepare('SELECT COUNT(*) as c FROM iwr_awr WHERE job_id = ?').get(jobId);
  if (existingIwr.c === 0) {
    const iwrInsert = db.prepare(`
      INSERT INTO iwr_awr (job_id, iwr_awr_number, rr_number, parent_job_plan, unit, equipment_number, welding_required, nbic_repair, hydro_psi, hydro_complete, date_sold, work_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    iwrInsert.run(jobId, 'IWR-001', 'RR-2026-0401', 'JP-TA2026-UNIT3', 'Unit 3', 'E-301', 1, 0, 450, 0, '2026-09-01', 'Replace tube bundle and re-tube exchanger E-301');
    iwrInsert.run(jobId, 'IWR-002', 'RR-2026-0402', 'JP-TA2026-UNIT3', 'Unit 3', 'V-302', 1, 1, 650, 0, '2026-09-01', 'NBIC repair — nozzle N3 weld overlay and PWHT');
    iwrInsert.run(jobId, 'AWR-001', null, 'JP-TA2026-UNIT5', 'Unit 5', 'P-501A', 0, 0, null, 0, '2026-10-05', 'Replace mechanical seal and bearing housing');
    iwrInsert.run(jobId, 'IWR-003', 'RR-2026-0405', 'JP-TA2026-UNIT5', 'Unit 5', 'T-501', 1, 0, 200, 0, '2026-09-15', 'Tower internals removal, tray replacement, and weld repair at manway');
    console.log('  ✓ iwr_awr: 4 rows seeded');
  } else {
    console.log('  ○ iwr_awr: already has data');
  }

  // Crew
  const existingCrew = db.prepare('SELECT COUNT(*) as c FROM crew WHERE job_id = ?').get(jobId);
  if (existingCrew.c === 0) {
    const crewInsert = db.prepare(`
      INSERT INTO crew (job_id, name, role, shift, start_date, phone, email, designation, unit_area, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    crewInsert.run(jobId, 'Frank Vasquez', 'qc_lead', 'day', '2026-09-15', '555-0101', 'frank@sinmiedo.ai', 'QC Lead', 'All Units', 1);
    crewInsert.run(jobId, 'Roberto Garcia', 'inspector', 'day', '2026-09-15', '555-0102', 'rgarcia@sinmiedo.ai', 'QC Inspector Level II', 'Unit 3', 1);
    crewInsert.run(jobId, 'Tony Nguyen', 'inspector', 'night', '2026-09-15', '555-0103', 'tnguyen@sinmiedo.ai', 'QC Inspector Level II', 'Unit 5', 1);
    crewInsert.run(jobId, 'Maria Santos', 'doc_control', 'day', '2026-09-20', '555-0104', 'msantos@sinmiedo.ai', 'Document Control', 'Trailer', 1);
    crewInsert.run(jobId, 'James Cooper', 'supervisor', 'day', '2026-09-15', '555-0105', 'jcooper@sinmiedo.ai', 'Piping Supervisor', 'Unit 3', 1);
    crewInsert.run(jobId, 'Carlos Mendez', 'piping', 'night', '2026-09-20', '555-0106', 'cmendez@sinmiedo.ai', 'Pipefitter Foreman', 'Unit 5', 1);
    crewInsert.run(jobId, 'Sarah Kim', 'mechanical', 'day', '2026-10-01', '555-0107', 'skim@sinmiedo.ai', 'Mechanical Lead', 'Unit 3', 1);
    console.log('  ✓ crew: 7 rows seeded');
  } else {
    console.log('  ○ crew: already has data');
  }

  // Update some existing packages with new field values for demo
  const pkgs = db.prepare('SELECT id, package_id FROM packages WHERE job_id = ? LIMIT 3').all(jobId);
  if (pkgs.length > 0) {
    const pkgUpdate = db.prepare(`
      UPDATE packages SET
        scope_type = ?, wo_number = ?, entity_type = ?,
        welding_required = ?, pressure_test_required = ?, spec = ?
      WHERE id = ?
    `);
    if (pkgs[0]) pkgUpdate.run('original', 'WO-4521', 'piping', 1, 1, 'A1A', pkgs[0].id);
    if (pkgs[1]) pkgUpdate.run('original', 'WO-4522', 'exchangers', 1, 1, 'B2B', pkgs[1].id);
    if (pkgs[2]) pkgUpdate.run('added', 'WO-4523', 'towers', 1, 0, 'A1A', pkgs[2].id);
    console.log('  ✓ packages: updated', pkgs.length, 'rows with new field values');
  }

} else {
  console.log('  ⚠ No jobs found — skipping seed data');
}

// ═══════════════════════════════════════════
// 6. Verify
// ═══════════════════════════════════════════
console.log('\n▸ Verification');
const tables = ['packages', 'welds', 'flanges', 'wire_inventory', 'rfis', 'iwr_awr', 'crew'];
for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info(${t})`).all();
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get();
  console.log(`  ${t}: ${cols.length} columns, ${count.c} rows`);
}

db.close();
console.log('\n✔ Migration v2 complete!\n');
