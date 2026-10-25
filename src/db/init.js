// Sin Miedo AI — Database Schema & Initialization
// SQLite with better-sqlite3
import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'db', 'sinmiedo.db');

// Ensure db dir exists
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('Initializing Sin Miedo AI database...');

// ═══ JOBS ═══
db.exec(`
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_number TEXT NOT NULL UNIQUE,
  client TEXT NOT NULL,
  site_name TEXT,
  description TEXT,
  start_date TEXT,
  target_end_date TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','complete','on_hold')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

// ═══ UNITS ═══
db.exec(`
CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  unit_number TEXT NOT NULL,
  description TEXT,
  total_packages INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(job_id, unit_number)
);
`);

// ═══ PACKAGES ═══
db.exec(`
CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  unit_id INTEGER REFERENCES units(id),
  package_id TEXT NOT NULL,
  equipment TEXT,
  equipment_type TEXT,
  inspector TEXT,
  foreman TEXT,
  shift TEXT CHECK(shift IN ('day','night')),
  status TEXT DEFAULT 'open' CHECK(status IN ('open','in_progress','hold','closed')),
  hold_reason TEXT,
  progress REAL DEFAULT 0,
  ai_status TEXT DEFAULT 'pending',
  ai_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  closed_at TEXT,
  UNIQUE(job_id, package_id)
);
`);

// ═══ WELDERS ═══
db.exec(`
CREATE TABLE IF NOT EXISTS welders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  name TEXT NOT NULL,
  stamp TEXT,
  qualifications TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','suspended')),
  total_welds INTEGER DEFAULT 0,
  acceptance_rate REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// ═══ WPS ═══
db.exec(`
CREATE TABLE IF NOT EXISTS wps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  wps_number TEXT NOT NULL,
  base_material TEXT,
  process TEXT,
  position TEXT,
  thickness_range TEXT,
  diameter_range TEXT,
  pqr_number TEXT,
  status TEXT DEFAULT 'qualified',
  UNIQUE(job_id, wps_number)
);
`);

// ═══ WELDS ═══
db.exec(`
CREATE TABLE IF NOT EXISTS welds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  package_id INTEGER REFERENCES packages(id),
  unit_id INTEGER REFERENCES units(id),
  weld_id TEXT NOT NULL,
  welder_id INTEGER REFERENCES welders(id),
  wps_id INTEGER REFERENCES wps(id),
  size TEXT,
  schedule TEXT,
  material TEXT,
  joint_type TEXT,
  vt_status TEXT DEFAULT 'pending' CHECK(vt_status IN ('pending','pass','fail','scheduled')),
  vt_date TEXT,
  vt_inspector TEXT,
  nde_method TEXT,
  nde_status TEXT DEFAULT 'pending' CHECK(nde_status IN ('pending','requested','in_progress','accepted','rejected')),
  repair_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK(status IN ('open','vt_pass','nde_pending','accepted','rejected','repair','complete')),
  ai_flag TEXT,
  ai_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(job_id, weld_id)
);
`);

// ═══ NDE EXAMINATIONS ═══
db.exec(`
CREATE TABLE IF NOT EXISTS nde_exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  weld_id INTEGER REFERENCES welds(id),
  nde_id TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('RT','PAUT','UT','MT','PT','VT','TOFD')),
  technician TEXT,
  technician_level TEXT,
  code_reference TEXT,
  acceptance_criteria TEXT,
  result TEXT CHECK(result IN ('pending','accepted','rejected','inconclusive')),
  indications TEXT,
  ai_review_status TEXT DEFAULT 'pending' CHECK(ai_review_status IN ('pending','queued','reviewing','complete','not_applicable')),
  ai_confidence REAL,
  ai_findings TEXT,
  ai_reviewed_at TEXT,
  report_number TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(job_id, nde_id)
);
`);

// ═══ FLANGES ═══
db.exec(`
CREATE TABLE IF NOT EXISTS flanges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  package_id INTEGER REFERENCES packages(id),
  unit_id INTEGER REFERENCES units(id),
  flange_id TEXT NOT NULL,
  size TEXT,
  rating TEXT,
  facing TEXT,
  gasket_type TEXT,
  gasket_material TEXT,
  bolt_size TEXT,
  bolt_material TEXT,
  target_torque REAL,
  actual_torque REAL,
  torque_method TEXT,
  jtr_status TEXT DEFAULT 'open' CHECK(jtr_status IN ('open','pending','signed','missing')),
  jtr_signed_by TEXT,
  jtr_date TEXT,
  pcc1_compliant INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK(status IN ('open','assembled','torqued','signed','hold','complete')),
  hold_reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(job_id, flange_id)
);
`);

// ═══ DOCUMENTS ═══
db.exec(`
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  package_id INTEGER REFERENCES packages(id),
  doc_id TEXT NOT NULL,
  title TEXT NOT NULL,
  doc_type TEXT CHECK(doc_type IN ('isometric','itp','wps','pqr','nde_report','drawing','procedure','closeout','rfi','transmittal','other')),
  revision TEXT,
  file_path TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','pending_review','approved','current','superseded','action_required')),
  ai_status TEXT DEFAULT 'pending',
  ai_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(job_id, doc_id)
);
`);

// ═══ ACTIVITY LOG ═══
db.exec(`
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  description TEXT,
  user_name TEXT,
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_job ON activity_log(job_id, created_at DESC);
`);

// ═══ SHIFT HANDOVERS ═══
db.exec(`
CREATE TABLE IF NOT EXISTS shift_handovers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  from_shift TEXT NOT NULL,
  to_shift TEXT NOT NULL,
  handover_date TEXT NOT NULL,
  items TEXT NOT NULL,
  ai_generated INTEGER DEFAULT 1,
  acknowledged_by TEXT,
  acknowledged_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// ═══ AI INSIGHTS ═══
db.exec(`
CREATE TABLE IF NOT EXISTS ai_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  insight_type TEXT NOT NULL CHECK(insight_type IN ('daily_brief','pattern','risk','recommendation','compliance')),
  severity TEXT DEFAULT 'info' CHECK(severity IN ('info','warning','critical','success')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  resolved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_insights_job ON ai_insights(job_id, created_at DESC);
`);

console.log('Database initialized successfully.');
console.log(`Database file: ${DB_PATH}`);

db.close();
