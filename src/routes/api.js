// Sin Miedo AI — API Routes
import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { broadcast } from '../websocket.js';

const api = Router();

// ═══ JOBS ═══
api.get('/jobs', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM jobs ORDER BY created_at DESC').all();
  res.json(rows);
});

api.get('/jobs/:id', (req, res) => {
  const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Job not found' });
  res.json(row);
});

// ═══ DASHBOARD STATS ═══
api.get('/jobs/:jobId/dashboard', (req, res) => {
  const db = getDb();
  const jobId = req.params.jobId;

  const packages = db.prepare(`
    SELECT status, COUNT(*) as count FROM packages WHERE job_id = ? GROUP BY status
  `).all(jobId);

  const totalPkgs = packages.reduce((s, r) => s + r.count, 0);
  const closedPkgs = packages.find(r => r.status === 'closed')?.count || 0;
  const holdPkgs = packages.find(r => r.status === 'hold')?.count || 0;
  const progressPkgs = packages.find(r => r.status === 'in_progress')?.count || 0;

  const weldStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM welds WHERE job_id = ? GROUP BY status
  `).all(jobId);
  const totalWelds = weldStats.reduce((s, r) => s + r.count, 0);

  const ndeStats = db.prepare(`
    SELECT result, COUNT(*) as count FROM nde_exams WHERE job_id = ? GROUP BY result
  `).all(jobId);

  const aiReviews = db.prepare(`
    SELECT COUNT(*) as count FROM nde_exams WHERE job_id = ? AND ai_review_status = 'complete'
  `).get(jobId);

  const unitProgress = db.prepare(`
    SELECT u.unit_number, u.description,
      COUNT(p.id) as total,
      SUM(CASE WHEN p.status = 'closed' THEN 1 ELSE 0 END) as closed,
      ROUND(AVG(p.progress), 1) as avg_progress
    FROM units u LEFT JOIN packages p ON p.unit_id = u.id
    WHERE u.job_id = ? GROUP BY u.id ORDER BY u.unit_number
  `).all(jobId);

  const insights = db.prepare(`
    SELECT * FROM ai_insights WHERE job_id = ? AND resolved = 0 ORDER BY
      CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 WHEN 'success' THEN 3 ELSE 4 END,
      created_at DESC LIMIT 10
  `).all(jobId);

  const activity = db.prepare(`
    SELECT * FROM activity_log WHERE job_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(jobId);

  res.json({
    packages: { total: totalPkgs, closed: closedPkgs, in_progress: progressPkgs, hold: holdPkgs },
    welds: { total: totalWelds, by_status: weldStats },
    nde: { by_result: ndeStats, ai_reviewed: aiReviews.count },
    unit_progress: unitProgress,
    insights,
    activity
  });
});

// ═══ PACKAGES ═══
api.get('/jobs/:jobId/packages', (req, res) => {
  const { status } = req.query;
  let sql = `SELECT p.*, u.unit_number FROM packages p LEFT JOIN units u ON p.unit_id = u.id WHERE p.job_id = ?`;
  const params = [req.params.jobId];
  if (status && status !== 'all') { sql += ' AND p.status = ?'; params.push(status); }
  sql += ' ORDER BY p.package_id';
  res.json(getDb().prepare(sql).all(...params));
});

api.post('/jobs/:jobId/packages', (req, res) => {
  const db = getDb();
  const { package_id, unit_number, equipment, equipment_type, inspector, foreman, shift } = req.body;
  const unitId = db.prepare('SELECT id FROM units WHERE job_id = ? AND unit_number = ?').get(req.params.jobId, unit_number)?.id;
  try {
    const info = db.prepare(`INSERT INTO packages (job_id, unit_id, package_id, equipment, equipment_type, inspector, foreman, shift) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      req.params.jobId, unitId, package_id, equipment, equipment_type, inspector, foreman, shift
    );
    db.prepare(`INSERT INTO activity_log (job_id, entity_type, entity_id, action, description, user_name) VALUES (?, 'package', ?, 'created', ?, ?)`).run(
      req.params.jobId, package_id, `Package ${package_id} created`, req.body.user || 'System'
    );
    res.status(201).json({ id: info.lastInsertRowid, package_id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

api.patch('/jobs/:jobId/packages/:pkgId', (req, res) => {
  const db = getDb();
  const allowed = ['status', 'progress', 'inspector', 'hold_reason', 'ai_status', 'ai_notes'];
  const sets = []; const vals = [];
  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k)) { sets.push(`${k} = ?`); vals.push(v); }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'No valid fields' });
  sets.push("updated_at = datetime('now')");
  vals.push(req.params.pkgId, req.params.jobId);
  db.prepare(`UPDATE packages SET ${sets.join(', ')} WHERE package_id = ? AND job_id = ?`).run(...vals);
  res.json({ updated: true });
});

// ═══ WELDS ═══
api.get('/jobs/:jobId/welds', (req, res) => {
  const { status } = req.query;
  let sql = `SELECT w.*, u.unit_number, wr.name as welder_name, wr.stamp as welder_stamp, wp.wps_number
    FROM welds w
    LEFT JOIN units u ON w.unit_id = u.id
    LEFT JOIN welders wr ON w.welder_id = wr.id
    LEFT JOIN wps wp ON w.wps_id = wp.id
    WHERE w.job_id = ?`;
  const params = [req.params.jobId];
  if (status === 'rejected') { sql += " AND w.status = 'rejected'"; }
  else if (status === 'pending') { sql += " AND w.nde_status IN ('pending','requested')"; }
  else if (status === 'repairs') { sql += ' AND w.repair_count > 0'; }
  sql += ' ORDER BY w.weld_id DESC';
  res.json(getDb().prepare(sql).all(...params));
});

api.post('/jobs/:jobId/welds', (req, res) => {
  const db = getDb();
  const { weld_id, unit_number, package_id, welder_name, wps_number, size, schedule, material, joint_type, nde_method } = req.body;
  const unitId = db.prepare('SELECT id FROM units WHERE job_id = ? AND unit_number = ?').get(req.params.jobId, unit_number)?.id;
  const pkgDbId = db.prepare('SELECT id FROM packages WHERE job_id = ? AND package_id = ?').get(req.params.jobId, package_id)?.id;
  const welderId = db.prepare('SELECT id FROM welders WHERE job_id = ? AND name = ?').get(req.params.jobId, welder_name)?.id;
  const wpsId = db.prepare('SELECT id FROM wps WHERE job_id = ? AND wps_number = ?').get(req.params.jobId, wps_number)?.id;
  try {
    const info = db.prepare(`INSERT INTO welds (job_id, unit_id, package_id, weld_id, welder_id, wps_id, size, schedule, material, joint_type, nde_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      req.params.jobId, unitId, pkgDbId, weld_id, welderId, wpsId, size, schedule, material, joint_type, nde_method
    );
    res.status(201).json({ id: info.lastInsertRowid, weld_id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ═══ NDE ═══
api.get('/jobs/:jobId/nde', (req, res) => {
  const { method } = req.query;
  let sql = `SELECT n.*, w.weld_id as weld_number FROM nde_exams n LEFT JOIN welds w ON n.weld_id = w.id WHERE n.job_id = ?`;
  const params = [req.params.jobId];
  if (method && method !== 'all') { sql += ' AND n.method = ?'; params.push(method.toUpperCase()); }
  sql += ' ORDER BY n.nde_id DESC';
  res.json(getDb().prepare(sql).all(...params));
});

api.post('/jobs/:jobId/nde', (req, res) => {
  const db = getDb();
  const { nde_id, method, weld_id, technician, code_reference } = req.body;
  const weldDbId = weld_id ? db.prepare('SELECT id FROM welds WHERE job_id = ? AND weld_id = ?').get(req.params.jobId, weld_id)?.id : null;
  try {
    const info = db.prepare(`INSERT INTO nde_exams (job_id, weld_id, nde_id, method, technician, code_reference, result) VALUES (?, ?, ?, ?, ?, ?, 'pending')`).run(
      req.params.jobId, weldDbId, nde_id, method, technician, code_reference
    );
    db.prepare(`INSERT INTO activity_log (job_id, entity_type, entity_id, action, description, user_name) VALUES (?, 'nde', ?, 'created', ?, ?)`).run(
      req.params.jobId, nde_id, `NDE ${nde_id} (${method}) requested`, req.body.user || 'System'
    );
    res.status(201).json({ id: info.lastInsertRowid, nde_id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ═══ FLANGES ═══
api.get('/jobs/:jobId/flanges', (req, res) => {
  const { status } = req.query;
  let sql = `SELECT f.*, u.unit_number FROM flanges f LEFT JOIN units u ON f.unit_id = u.id WHERE f.job_id = ?`;
  const params = [req.params.jobId];
  if (status === 'hold') sql += " AND f.status = 'hold'";
  else if (status === 'pending') sql += " AND f.jtr_status IN ('open','pending')";
  sql += ' ORDER BY f.flange_id';
  res.json(getDb().prepare(sql).all(...params));
});

api.post('/jobs/:jobId/flanges', (req, res) => {
  const db = getDb();
  const { flange_id, unit_number, size, rating, gasket_type, gasket_material, target_torque } = req.body;
  const unitId = unit_number ? db.prepare('SELECT id FROM units WHERE job_id = ? AND unit_number = ?').get(req.params.jobId, unit_number)?.id : null;
  try {
    const info = db.prepare(`INSERT INTO flanges (job_id, unit_id, flange_id, size, rating, gasket_type, gasket_material, target_torque) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      req.params.jobId, unitId, flange_id, size, rating, gasket_type, gasket_material, target_torque
    );
    db.prepare(`INSERT INTO activity_log (job_id, entity_type, entity_id, action, description, user_name) VALUES (?, 'flange', ?, 'created', ?, ?)`).run(
      req.params.jobId, flange_id, `Flange ${flange_id} added`, req.body.user || 'System'
    );
    res.status(201).json({ id: info.lastInsertRowid, flange_id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ═══ DOCUMENTS ═══
api.get('/jobs/:jobId/documents', (req, res) => {
  const { type } = req.query;
  let sql = `SELECT * FROM documents WHERE job_id = ?`;
  const params = [req.params.jobId];
  if (type && type !== 'all') { sql += ' AND doc_type = ?'; params.push(type); }
  sql += ' ORDER BY updated_at DESC';
  res.json(getDb().prepare(sql).all(...params));
});

api.post('/jobs/:jobId/documents', (req, res) => {
  const db = getDb();
  const { doc_id, title, doc_type, revision } = req.body;
  try {
    const info = db.prepare(`INSERT INTO documents (job_id, doc_id, title, doc_type, revision) VALUES (?, ?, ?, ?, ?)`).run(
      req.params.jobId, doc_id, title, doc_type || 'other', revision
    );
    db.prepare(`INSERT INTO activity_log (job_id, entity_type, entity_id, action, description, user_name) VALUES (?, 'document', ?, 'created', ?, ?)`).run(
      req.params.jobId, doc_id, `Document ${doc_id} "${title}" uploaded`, req.body.user || 'System'
    );
    res.status(201).json({ id: info.lastInsertRowid, doc_id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ═══ WELDERS ═══
api.get('/jobs/:jobId/welders', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM welders WHERE job_id = ? ORDER BY name').all(req.params.jobId));
});

// ═══ UNITS ═══
api.get('/jobs/:jobId/units', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM units WHERE job_id = ? ORDER BY unit_number').all(req.params.jobId));
});

// ═══ WPS ═══
api.get('/jobs/:jobId/wps', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM wps WHERE job_id = ? ORDER BY wps_number').all(req.params.jobId));
});

// ═══ ACTIVITY ═══
api.get('/jobs/:jobId/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(getDb().prepare('SELECT * FROM activity_log WHERE job_id = ? ORDER BY created_at DESC LIMIT ?').all(req.params.jobId, limit));
});

// ═══ INSIGHTS ═══
api.get('/jobs/:jobId/insights', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM ai_insights WHERE job_id = ? AND resolved = 0 ORDER BY created_at DESC').all(req.params.jobId));
});

// ═══ SHIFT HANDOVER ═══
api.post('/jobs/:jobId/handover/generate', (req, res) => {
  const db = getDb();
  const jobId = req.params.jobId;
  const { from_shift, to_shift } = req.body;

  try {
    // Rejected welds or welds with repairs
    const rejectedWelds = db.prepare(`
      SELECT w.weld_id, w.status, w.repair_count, w.nde_status,
             wr.name as welder_name, u.unit_number
      FROM welds w
      LEFT JOIN welders wr ON w.welder_id = wr.id
      LEFT JOIN units u ON w.unit_id = u.id
      WHERE w.job_id = ? AND (w.status = 'rejected' OR w.repair_count > 0)
      ORDER BY w.weld_id
    `).all(jobId);

    // Flanges on hold
    const holdFlanges = db.prepare(`
      SELECT f.flange_id, f.status, f.jtr_status, f.hold_reason,
             u.unit_number
      FROM flanges f
      LEFT JOIN units u ON f.unit_id = u.id
      WHERE f.job_id = ? AND f.status = 'hold'
      ORDER BY f.flange_id
    `).all(jobId);

    // Pending or incomplete NDE exams
    const pendingNde = db.prepare(`
      SELECT n.nde_id, n.method, n.result, n.ai_review_status,
             w.weld_id as weld_number
      FROM nde_exams n
      LEFT JOIN welds w ON n.weld_id = w.id
      WHERE n.job_id = ? AND (n.result = 'pending' OR n.ai_review_status != 'complete')
      ORDER BY n.nde_id
    `).all(jobId);

    // Packages on hold or incomplete with hold reason
    const holdPackages = db.prepare(`
      SELECT p.package_id, p.status, p.progress, p.hold_reason,
             u.unit_number
      FROM packages p
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE p.job_id = ? AND (p.status = 'hold' OR (p.progress < 100 AND p.hold_reason IS NOT NULL AND p.hold_reason != ''))
      ORDER BY p.package_id
    `).all(jobId);

    const items = {
      rejected_welds: rejectedWelds,
      hold_flanges: holdFlanges,
      pending_nde: pendingNde,
      hold_packages: holdPackages,
      summary: {
        total_items: rejectedWelds.length + holdFlanges.length + pendingNde.length + holdPackages.length,
        rejected_weld_count: rejectedWelds.length,
        hold_flange_count: holdFlanges.length,
        pending_nde_count: pendingNde.length,
        hold_package_count: holdPackages.length
      }
    };

    const handoverDate = new Date().toISOString().split('T')[0];
    const itemsJson = JSON.stringify(items);

    const info = db.prepare(`
      INSERT INTO shift_handovers (job_id, from_shift, to_shift, handover_date, items, ai_generated, created_at)
      VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(jobId, from_shift || 'day', to_shift || 'night', handoverDate, itemsJson);

    // Activity log entry
    db.prepare(`
      INSERT INTO activity_log (job_id, entity_type, entity_id, action, description, user_name, ai_generated, created_at)
      VALUES (?, 'handover', ?, 'generated', ?, 'AI System', 1, datetime('now'))
    `).run(jobId, String(info.lastInsertRowid),
      `Shift handover generated: ${items.summary.total_items} items (${items.summary.rejected_weld_count} welds, ${items.summary.hold_flange_count} flanges, ${items.summary.pending_nde_count} NDE, ${items.summary.hold_package_count} packages)`
    );

    // Broadcast via WebSocket
    broadcast('handover_generated', {
      handover_id: info.lastInsertRowid,
      job_id: jobId,
      from_shift: from_shift || 'day',
      to_shift: to_shift || 'night',
      item_count: items.summary.total_items,
      summary: items.summary
    });

    broadcast('activity', {
      action: 'generated',
      entity_type: 'handover',
      description: `Shift handover generated — ${items.summary.total_items} open items`,
      ai_generated: true
    });

    res.status(201).json({
      id: info.lastInsertRowid,
      job_id: jobId,
      from_shift: from_shift || 'day',
      to_shift: to_shift || 'night',
      handover_date: handoverDate,
      items,
      ai_generated: true
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get('/jobs/:jobId/handover/latest', (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM shift_handovers WHERE job_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(req.params.jobId);

  if (!row) return res.status(404).json({ error: 'No handover found for this job' });

  // Parse items JSON
  try {
    row.items = JSON.parse(row.items);
  } catch { /* leave as string */ }

  res.json(row);
});

// ═══ WIRE INVENTORY ═══
api.get('/jobs/:jobId/wire-inventory', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM wire_inventory WHERE job_id = ? ORDER BY filler_metal').all(req.params.jobId));
});

api.post('/jobs/:jobId/wire-inventory', (req, res) => {
  const db = getDb();
  const { filler_metal, process, application, wire_size, amount_ordered, amount_onsite, audit_date, auditor } = req.body;
  if (!filler_metal) return res.status(400).json({ error: 'filler_metal is required' });
  try {
    const info = db.prepare(`
      INSERT INTO wire_inventory (job_id, filler_metal, process, application, wire_size, amount_ordered, amount_onsite, audit_date, auditor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.jobId, filler_metal, process, application, wire_size, amount_ordered, amount_onsite, audit_date, auditor);
    db.prepare(`INSERT INTO activity_log (job_id, entity_type, entity_id, action, description, user_name) VALUES (?, 'wire_inventory', ?, 'created', ?, ?)`).run(
      req.params.jobId, String(info.lastInsertRowid), `Wire ${filler_metal} (${process || 'N/A'}) added to inventory`, req.body.user || 'System'
    );
    res.status(201).json({ id: info.lastInsertRowid, filler_metal });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ═══ RFIs ═══
api.get('/jobs/:jobId/rfis', (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM rfis WHERE job_id = ?';
  const params = [req.params.jobId];
  if (status && status !== 'all') { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY rfi_number';
  res.json(getDb().prepare(sql).all(...params));
});

api.post('/jobs/:jobId/rfis', (req, res) => {
  const db = getDb();
  const { rfi_number, wo_number, ets_number, date_submitted, asked_by, bic, subject, status, package_built, comments } = req.body;
  if (!rfi_number) return res.status(400).json({ error: 'rfi_number is required' });
  try {
    const info = db.prepare(`
      INSERT INTO rfis (job_id, rfi_number, wo_number, ets_number, date_submitted, asked_by, bic, subject, status, package_built, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.jobId, rfi_number, wo_number, ets_number, date_submitted, asked_by, bic, subject, status || 'open', package_built || 0, comments);
    db.prepare(`INSERT INTO activity_log (job_id, entity_type, entity_id, action, description, user_name) VALUES (?, 'rfi', ?, 'created', ?, ?)`).run(
      req.params.jobId, rfi_number, `RFI ${rfi_number}: ${subject || 'No subject'}`, req.body.user || 'System'
    );
    res.status(201).json({ id: info.lastInsertRowid, rfi_number });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: `RFI ${rfi_number} already exists for this job` });
    res.status(400).json({ error: e.message });
  }
});

api.patch('/jobs/:jobId/rfis/:rfiId', (req, res) => {
  const db = getDb();
  const allowed = ['status', 'package_built', 'comments', 'bic', 'subject'];
  const sets = []; const vals = [];
  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k)) { sets.push(`${k} = ?`); vals.push(v); }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'No valid fields' });
  vals.push(req.params.rfiId, req.params.jobId);
  const result = db.prepare(`UPDATE rfis SET ${sets.join(', ')} WHERE id = ? AND job_id = ?`).run(...vals);
  if (result.changes === 0) return res.status(404).json({ error: 'RFI not found' });
  res.json({ updated: true });
});

// ═══ IWR/AWR ═══
api.get('/jobs/:jobId/iwr-awr', (req, res) => {
  let sql = 'SELECT * FROM iwr_awr WHERE job_id = ? AND deleted = 0';
  const params = [req.params.jobId];
  sql += ' ORDER BY iwr_awr_number';
  res.json(getDb().prepare(sql).all(...params));
});

api.post('/jobs/:jobId/iwr-awr', (req, res) => {
  const db = getDb();
  const { iwr_awr_number, rr_number, parent_job_plan, unit, equipment_number, welding_required, nbic_repair, hydro_psi, date_sold, work_description } = req.body;
  if (!iwr_awr_number) return res.status(400).json({ error: 'iwr_awr_number is required' });
  try {
    const info = db.prepare(`
      INSERT INTO iwr_awr (job_id, iwr_awr_number, rr_number, parent_job_plan, unit, equipment_number, welding_required, nbic_repair, hydro_psi, date_sold, work_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.jobId, iwr_awr_number, rr_number, parent_job_plan, unit, equipment_number, welding_required || 0, nbic_repair || 0, hydro_psi, date_sold, work_description);
    db.prepare(`INSERT INTO activity_log (job_id, entity_type, entity_id, action, description, user_name) VALUES (?, 'iwr_awr', ?, 'created', ?, ?)`).run(
      req.params.jobId, iwr_awr_number, `${iwr_awr_number}: ${equipment_number || 'N/A'} — ${work_description || 'No description'}`, req.body.user || 'System'
    );
    res.status(201).json({ id: info.lastInsertRowid, iwr_awr_number });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: `${iwr_awr_number} already exists for this job` });
    res.status(400).json({ error: e.message });
  }
});

// ═══ CREW ═══
api.get('/jobs/:jobId/crew', (req, res) => {
  let sql = 'SELECT * FROM crew WHERE job_id = ? AND active = 1';
  const params = [req.params.jobId];
  sql += ' ORDER BY name';
  res.json(getDb().prepare(sql).all(...params));
});

api.get('/jobs/:jobId/crew/:shift', (req, res) => {
  const shift = req.params.shift;
  if (!['day', 'night'].includes(shift)) return res.status(400).json({ error: 'shift must be day or night' });
  res.json(getDb().prepare('SELECT * FROM crew WHERE job_id = ? AND shift = ? AND active = 1 ORDER BY name').all(req.params.jobId, shift));
});

api.post('/jobs/:jobId/crew', (req, res) => {
  const db = getDb();
  const { name, role, shift, start_date, phone, email, designation, unit_area } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const info = db.prepare(`
      INSERT INTO crew (job_id, name, role, shift, start_date, phone, email, designation, unit_area)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.jobId, name, role, shift, start_date, phone, email, designation, unit_area);
    db.prepare(`INSERT INTO activity_log (job_id, entity_type, entity_id, action, description, user_name) VALUES (?, 'crew', ?, 'created', ?, ?)`).run(
      req.params.jobId, String(info.lastInsertRowid), `${name} (${role || 'unassigned'}) added to ${shift || 'unassigned'} shift`, req.body.user || 'System'
    );
    res.status(201).json({ id: info.lastInsertRowid, name });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default api;
