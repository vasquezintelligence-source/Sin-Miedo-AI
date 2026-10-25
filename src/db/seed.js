// Sin Miedo AI — Demo Data Seed
// Marathon Galveston Bay Turnaround J-2026-0847
import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'db', 'sinmiedo.db');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

console.log('Seeding demo data...');

const tx = db.transaction(() => {
  // ═══ JOB ═══
  db.prepare(`INSERT OR IGNORE INTO jobs (job_number, client, site_name, description, start_date, target_end_date)
    VALUES (?, ?, ?, ?, ?, ?)`).run(
    'J-2026-0847', 'Marathon Petroleum', 'Galveston Bay Refinery',
    'Unit Turnaround — Crude/Vacuum, Reformer, Hydrotreater',
    '2026-09-15', '2026-11-15'
  );
  const jobId = db.prepare(`SELECT id FROM jobs WHERE job_number = ?`).get('J-2026-0847').id;

  // ═══ UNITS ═══
  const units = [
    ['U-100', 'Crude Unit', 22], ['U-200', 'Vacuum Unit', 20], ['U-300', 'Reformer', 18],
    ['U-400', 'Hydrotreater', 16], ['U-500', 'Sulfur Recovery', 15], ['U-600', 'Amine Unit', 18],
    ['U-700', 'Hydrogen Plant', 17], ['U-800', 'Utilities', 16]
  ];
  const insertUnit = db.prepare(`INSERT OR IGNORE INTO units (job_id, unit_number, description, total_packages) VALUES (?, ?, ?, ?)`);
  for (const [num, desc, pkgs] of units) insertUnit.run(jobId, num, desc, pkgs);

  const getUnit = db.prepare(`SELECT id FROM units WHERE job_id = ? AND unit_number = ?`);

  // ═══ WPS ═══
  const wpsList = [
    ['WPS-CS-001', 'Carbon Steel', 'GTAW/SMAW', 'All', '0.125"–2.0"', '0.75"–36"', 'PQR-CS-001'],
    ['WPS-CS-002', 'Carbon Steel', 'SMAW', 'All', '0.5"–4.0"', '4"–48"', 'PQR-CS-002'],
    ['WPS-SS-003', 'Stainless 304/316', 'GTAW', 'All', '0.065"–0.75"', '0.5"–12"', 'PQR-SS-001'],
    ['WPS-CR-001', 'Chrome-Moly', 'GTAW/SMAW', '1G,2G,5G,6G', '0.25"–1.5"', '1"–24"', 'PQR-CR-001'],
    ['WPS-NI-001', 'Inconel 625 Overlay', 'GTAW', '1G,2G', '0.125" min', '6"–48"', 'PQR-NI-001']
  ];
  const insertWps = db.prepare(`INSERT OR IGNORE INTO wps (job_id, wps_number, base_material, process, position, thickness_range, diameter_range, pqr_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const w of wpsList) insertWps.run(jobId, ...w);
  const getWps = db.prepare(`SELECT id FROM wps WHERE job_id = ? AND wps_number = ?`);

  // ═══ WELDERS ═══
  const welders = [
    ['J. Hernandez', 'JH-47', 'GTAW/SMAW CS, SS, CrMo — 6G', 'active', 156, 0.919],
    ['C. Ramirez', 'CR-12', 'GTAW SS, Inconel — 6G', 'active', 47, 1.0],
    ['M. Torres', 'MT-33', 'SMAW CS — 6G', 'active', 134, 0.955],
    ['A. Lopez', 'AL-08', 'GTAW/SMAW CrMo — 6G', 'active', 89, 0.966],
    ['R. Garza', 'RG-21', 'GTAW SS — 2G, 5G, 6G', 'active', 112, 0.973],
    ['D. Nguyen', 'DN-55', 'SMAW CS — All', 'active', 201, 0.940],
    ['K. Patel', 'KP-09', 'GTAW CS, SS — 6G', 'active', 78, 0.987]
  ];
  const insertWelder = db.prepare(`INSERT OR IGNORE INTO welders (job_id, name, stamp, qualifications, status, total_welds, acceptance_rate) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const w of welders) insertWelder.run(jobId, ...w);
  const getWelder = db.prepare(`SELECT id FROM welders WHERE job_id = ? AND name = ?`);

  // ═══ PACKAGES (sample) ═══
  const pkgs = [
    ['PKG-U100-001','U-100','Exchanger E-101','Heat Exchanger','R. Martinez','Garcia','day','closed',null,100,'clear',null],
    ['PKG-U100-002','U-100','Reactor R-101','Reactor','R. Martinez','Garcia','day','closed',null,100,'clear',null],
    ['PKG-U100-042','U-100','Piping Spool PS-142','Piping','R. Martinez','Smith','day','closed',null,100,'clear',null],
    ['PKG-U200-008','U-200','Column T-201','Column','J. Hernandez','Lopez','day','in_progress',null,72,'reviewing',null],
    ['PKG-U300-015','U-300','Drum D-301','Drum','M. Singh','Torres','night','hold','Weld repair required',45,'3 issues',null],
    ['PKG-U400-003','U-400','Heater H-401','Heater','R. Garcia','Davis','day','closed',null,100,'clear',null],
    ['PKG-U500-012','U-500','Piping Spool PS-501','Piping','R. Garcia','Martinez','night','in_progress',null,58,'pending',null],
    ['PKG-U700-003','U-700','Vessel V-701','Vessel','J. Hernandez','Wilson','day','open',null,15,'scanning',null],
    ['PKG-U800-005','U-800','Cooling Tower CT-801','Structure','M. Singh','Brown','day','in_progress',null,82,'clear',null]
  ];
  const insertPkg = db.prepare(`INSERT OR IGNORE INTO packages (job_id, unit_id, package_id, equipment, equipment_type, inspector, foreman, shift, status, hold_reason, progress, ai_status, ai_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const p of pkgs) {
    const unitId = getUnit.get(jobId, p[1])?.id;
    insertPkg.run(jobId, unitId, p[0], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11]);
  }
  const getPkg = db.prepare(`SELECT id FROM packages WHERE job_id = ? AND package_id = ?`);

  // ═══ WELDS (sample) ═══
  const weldData = [
    ['W-3847','U-300','PKG-U300-015','J. Hernandez','WPS-CS-001','6"','Sch 80','CS','Butt','pass',null,'RT','rejected',0,'rejected','pattern','3rd rejection on same WPS — root IF pattern'],
    ['W-4098','U-200','PKG-U200-008','C. Ramirez','WPS-SS-003','4"','Sch 40','SS 316','Butt','pass',null,'PAUT','accepted',0,'accepted','clear',null],
    ['W-4099','U-200','PKG-U200-008','C. Ramirez','WPS-SS-003','4"','Sch 40','SS 316','Butt','pass',null,'PAUT','accepted',0,'accepted','clear',null],
    ['W-4100','U-400','PKG-U400-003','M. Torres','WPS-CS-002','8"','Sch 160','CS','Butt','pass',null,'RT','pending',0,'nde_pending','reviewing','PAUT review in progress'],
    ['W-4101','U-700','PKG-U700-003','A. Lopez','WPS-CR-001','3"','Sch 40','CrMo','Butt','scheduled',null,'UT','pending',0,'open',null,null],
    ['W-4102','U-700','PKG-U700-003','J. Hernandez','WPS-CS-001','10"','Sch 80','CS','Butt','pass',null,'RT','requested',0,'open','queued','Queued for AI review']
  ];
  const insertWeld = db.prepare(`INSERT OR IGNORE INTO welds (job_id, unit_id, package_id, weld_id, welder_id, wps_id, size, schedule, material, joint_type, vt_status, vt_date, nde_method, nde_status, repair_count, status, ai_flag, ai_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const w of weldData) {
    const unitId = getUnit.get(jobId, w[1])?.id;
    const pkgId = getPkg.get(jobId, w[2])?.id;
    const welderId = getWelder.get(jobId, w[3])?.id;
    const wpsId = getWps.get(jobId, w[4])?.id;
    insertWeld.run(jobId, unitId, pkgId, w[0], welderId, wpsId, w[5], w[6], w[7], w[8], w[9], w[10], w[11], w[12], w[13], w[14], w[15], w[16]);
  }
  const getWeld = db.prepare(`SELECT id FROM welds WHERE job_id = ? AND weld_id = ?`);

  // ═══ NDE EXAMS ═══
  const ndeData = [
    ['NDE-0291','W-4100','PAUT','M. Singh','Level II','ASME V, Art. 4','ASME VIII Div 1 UW-51(b)','pending','2 linear/volumetric indications','complete',0.87,'Linear 12mm at 0.8T, Volumetric 3mm at 0.4T',null],
    ['NDE-0290','W-3847','RT','K. Chen','Level II','ASME V, Art. 2','ASME VIII Div 1 UW-51','rejected','Incomplete fusion at root','complete',0.95,'IF detected — root pass defect confirmed',null],
    ['NDE-0289','W-4098','PAUT','M. Singh','Level II','ASME V, Art. 4','ASME VIII Div 1 UW-51(b)','accepted',null,'complete',0.96,'No recordable indications',null],
    ['NDE-0288','W-4095','UT','D. Patel','Level II','ASME V, Art. 5','ASME VIII Div 1 UW-51','accepted',null,'complete',0.92,'Clear',null],
    ['NDE-0287','W-4093','MT','A. Reyes','Level II','ASME V, Art. 7','ASME VIII Div 1 UW-51','accepted',null,'not_applicable',null,null,null]
  ];
  const insertNde = db.prepare(`INSERT OR IGNORE INTO nde_exams (job_id, weld_id, nde_id, method, technician, technician_level, code_reference, acceptance_criteria, result, indications, ai_review_status, ai_confidence, ai_findings, report_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const n of ndeData) {
    const weldDbId = getWeld.get(jobId, n[1])?.id;
    insertNde.run(jobId, weldDbId, n[0], n[2], n[3], n[4], n[5], n[6], n[7], n[8], n[9], n[10], n[11], n[12]);
  }

  // ═══ FLANGES ═══
  const flangeData = [
    ['FLG-U100-001','U-100','6"','900#','RF','Spiral Wound','316SS/CG','3/4" B7','2H',590,590,'hydraulic','signed','R. Martinez','2026-10-18',1,'complete',null],
    ['FLG-U100-002','U-100','4"','600#','RF','Spiral Wound','304SS/CG','5/8" B7','2H',310,310,'hydraulic','signed','R. Martinez','2026-10-18',1,'complete',null],
    ['FLG-U300-018','U-300','8"','1500#','RJ','Ring Joint','321SS','7/8" B7M','2HM',null,null,null,'missing',null,null,0,'hold','JTR missing — PCC-1 hold'],
    ['FLG-U500-009','U-500','10"','300#','RF','Spiral Wound','316SS/CG','7/8" B7','2H',null,null,null,'pending',null,null,0,'assembled',null],
    ['FLG-U700-004','U-700','6"','600#','RF','Spiral Wound','304SS/CG','5/8" B7','2H',null,null,null,'open',null,null,0,'open',null]
  ];
  const insertFlange = db.prepare(`INSERT OR IGNORE INTO flanges (job_id, unit_id, flange_id, size, rating, facing, gasket_type, gasket_material, bolt_size, bolt_material, target_torque, actual_torque, torque_method, jtr_status, jtr_signed_by, jtr_date, pcc1_compliant, status, hold_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const f of flangeData) {
    const unitId = getUnit.get(jobId, f[1])?.id;
    insertFlange.run(jobId, unitId, f[0], f[2], f[3], f[4], f[5], f[6], f[7], f[8], f[9], f[10], f[11], f[12], f[13], f[14], f[15], f[16], f[17]);
  }

  // ═══ DOCUMENTS ═══
  const docData = [
    ['DWG-U100-001','E-101 Shell Side Piping ISO','isometric','R3','current','verified',null],
    ['ITP-U200-001','T-201 Column Repad ITP','itp','R1','approved','verified',null],
    ['WPS-CS-001','GTAW/SMAW Carbon Steel','wps','R0','current','verified',null],
    ['WPS-SS-003','GTAW Stainless Steel','wps','R0','current','verified',null],
    ['RPT-NDE-0290','W-3847 RT Report — Rejected','nde_report','R0','action_required','action','Repair required'],
    ['PKG-CLO-U100','Unit 100 Turnover Package','closeout','Draft','pending_review','auditing','2 items remaining']
  ];
  const insertDoc = db.prepare(`INSERT OR IGNORE INTO documents (job_id, doc_id, title, doc_type, revision, status, ai_status, ai_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const d of docData) insertDoc.run(jobId, d[0], d[1], d[2], d[3], d[4], d[5], d[6]);

  // ═══ ACTIVITY LOG ═══
  const activities = [
    ['package','PKG-U100-042','closeout','PKG-U100-042 closed out','R. Martinez',0],
    ['nde','NDE-0291','ai_review','AI Review: PAUT scan — 2 indications flagged, 87% confidence',null,1],
    ['weld','W-3847','rejection','W-3847 RT rejected — incomplete fusion, repair assigned','K. Chen',0],
    ['flange','FLG-U300-018','hold','FLG-U300-018 PCC-1 hold — torque record incomplete','QC System',0],
    ['system','HANDOVER','generated','Day shift handover generated — 4 unresolved items',null,1]
  ];
  const insertAct = db.prepare(`INSERT INTO activity_log (job_id, entity_type, entity_id, action, description, user_name, ai_generated) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const a of activities) insertAct.run(jobId, ...a);

  // ═══ AI INSIGHTS ═══
  const insights = [
    ['daily_brief','critical','3 weld repairs outstanding','U-300: W-3847, W-3851, W-3860. J. Hernandez has capacity — recommend morning shift assignment.','weld',null],
    ['compliance','warning','FLG-U300-018 PCC-1 hold','8" 1500# ring joint missing JTR. On critical path for U-300 turnover.','flange','FLG-U300-018'],
    ['pattern','critical','Welder pattern detected','J. Hernandez — 3 RT rejections this week on WPS-CS-001, all root pass IF. Recommend re-qual review per ASME IX QW-322.','weld',null],
    ['recommendation','success','U-100 turnover ready','98% complete. 2 remaining: hydro report + E-101 as-built ISO. Ready by EOD.','package',null],
    ['risk','warning','U-700 at risk','35% complete with 12 days remaining. 8 packages need NDE clearance.','unit','U-700']
  ];
  const insertInsight = db.prepare(`INSERT INTO ai_insights (job_id, insight_type, severity, title, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const i of insights) insertInsight.run(jobId, ...i);
});

tx();
console.log('Demo data seeded successfully.');
console.log('Job: J-2026-0847 — Marathon Galveston Bay');
db.close();
