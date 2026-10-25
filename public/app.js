// Sin Miedo AI — Frontend Data Layer
// Connects the UI to the live API

const API = '/api';
let currentJob = null;
let jobDbId = null;

// ═══ UTILITIES ═══
async function api(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function badge(status, label) {
  const map = {
    open: 'bo', in_progress: 'bp', hold: 'bh', closed: 'bd',
    accepted: 'bd', rejected: 'bh', pending: 'bpn', complete: 'bd',
    pass: 'bd', fail: 'bh', scheduled: 'bp',
    requested: 'bo', reviewing: 'ba', queued: 'ba',
    clear: 'bd', pattern: 'bh', scanning: 'bo',
    signed: 'bd', missing: 'bh', assembled: 'bo', torqued: 'bd',
    current: 'bd', approved: 'bd', draft: 'bp', action_required: 'bh',
    pending_review: 'bp', superseded: 'bp',
    verified: 'bd', auditing: 'ba', action: 'bh',
    // AI statuses
    'AI Review': 'ba', 'clear': 'bd', '3 issues': 'bh', 'reviewing': 'ba',
    'pending': 'bpn', 'scanning': 'bo', 'queued': 'ba'
  };
  const cls = map[status] || map[label?.toLowerCase()] || 'bo';
  return `<span class="b ${cls}">${label || status}</span>`;
}

function progressBar(pct, color) {
  const c = pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--yellow)' : pct >= 30 ? 'var(--accent)' : 'var(--red)';
  const col = color || c;
  return `<div class="pi"><div class="pt"><div class="pf" style="width:${pct}%;background:${col};"></div></div><span class="pp" style="color:${col};">${Math.round(pct)}%</span></div>`;
}

function confidence(val) {
  if (val == null) return '—';
  const pct = Math.round(val * 100);
  const col = pct >= 90 ? 'var(--green)' : pct >= 70 ? 'var(--accent)' : 'var(--yellow)';
  return `<span class="cm"><span class="cmb"><span class="cmf" style="width:${pct}%;background:${col};"></span></span><span style="color:${col};">${pct}%</span></span>`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'Z');
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff/60)}m ago`;
  if (diff < 86400) return `${Math.round(diff/3600)}h ago`;
  return `${Math.round(diff/86400)}d ago`;
}

function severityColor(sev) {
  return { critical: 'var(--red)', warning: 'var(--yellow)', success: 'var(--green)', info: 'var(--accent)' }[sev] || 'var(--accent)';
}

function statusLabel(s) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ═══ DASHBOARD ═══
async function renderDashboard() {
  try {
    const data = await api(`/jobs/${jobDbId}/dashboard`);
    const p = data.packages;

    // KPIs
    const kpis = $$('#page-dashboard .kpi-row .kpi');
    if (kpis[0]) { kpis[0].querySelector('.kpi-value').textContent = p.total; kpis[0].querySelector('.kpi-sub').textContent = `${currentJob.client} ${currentJob.site_name || ''}`; }
    if (kpis[1]) { kpis[1].querySelector('.kpi-value').textContent = p.closed; kpis[1].querySelector('.kpi-sub').textContent = p.total > 0 ? `${((p.closed/p.total)*100).toFixed(1)}% complete` : '0%'; const bar1 = kpis[1].querySelector('.kpi-bar-fill'); if (bar1) bar1.style.width = `${p.total > 0 ? (p.closed/p.total)*100 : 0}%`; }
    if (kpis[2]) { kpis[2].querySelector('.kpi-value').textContent = p.in_progress; }
    if (kpis[3]) { kpis[3].querySelector('.kpi-value').textContent = p.hold; }
    if (kpis[4]) { kpis[4].querySelector('.kpi-value').textContent = data.nde.ai_reviewed || 0; }

    // Unit progress bars
    const barChart = $('#page-dashboard .bchart');
    if (barChart && data.unit_progress.length > 0) {
      barChart.innerHTML = data.unit_progress.map(u => {
        const pct = u.avg_progress || 0;
        const col = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--accent)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)';
        return `<div class="bcol"><div class="bval">${Math.round(pct)}%</div><div class="bar2" style="height:${Math.max(pct, 3)}%;background:linear-gradient(to top,rgba(56,189,248,0.1),${col});"></div><div class="blbl">${u.unit_number}</div></div>`;
      }).join('');
    }

    // AI Insights
    const insightPanel = $('#page-dashboard .ap');
    if (insightPanel && data.insights.length > 0) {
      const insHead = insightPanel.querySelector('.aph');
      const headHTML = insHead ? insHead.outerHTML : '';
      insightPanel.innerHTML = headHTML + data.insights.map(i =>
        `<div class="ai-ins"><div class="ai-dot" style="background:${severityColor(i.severity)};"></div><div><strong>${i.title}</strong> ${i.description}</div></div>`
      ).join('');
    }

    // Activity Feed
    const feed = $('#page-dashboard .feed');
    if (feed && data.activity.length > 0) {
      feed.innerHTML = data.activity.slice(0, 6).map(a => {
        const col = a.ai_generated ? 'var(--violet)' : a.action === 'closeout' ? 'var(--green)' : a.action === 'rejection' ? 'var(--red)' : a.action === 'hold' ? 'var(--yellow)' : 'var(--accent)';
        return `<div class="fi"><div class="fdot" style="background:${col};"></div><div><div class="ftxt">${a.ai_generated ? '<strong>AI:</strong> ' : ''}${a.description}</div><div class="ftime">${timeAgo(a.created_at)}</div></div></div>`;
      }).join('');
    }

    // Critical items table
    const critBody = $('#page-dashboard .tc tbody');
    if (critBody) {
      // Combine holds and urgent items from insights
      const items = [];
      data.insights.filter(i => i.severity === 'critical' || i.severity === 'warning').forEach(i => {
        items.push({ id: i.entity_id || i.title.split(' ')[0], type: i.entity_type || 'system', status: i.severity, age: timeAgo(i.created_at) });
      });
      if (items.length > 0) {
        critBody.innerHTML = items.slice(0, 5).map(i =>
          `<tr><td class="tid">${i.id}</td><td>${statusLabel(i.type)}</td><td>${badge(i.status === 'critical' ? 'hold' : 'progress', statusLabel(i.status))}</td><td>${i.age}</td></tr>`
        ).join('');
      }
    }
  } catch (e) {
    console.error('Dashboard load failed:', e);
  }
}

// ═══ PACKAGES ═══
async function renderPackages(filter) {
  try {
    const url = filter && filter !== 'all' ? `/jobs/${jobDbId}/packages?status=${filter}` : `/jobs/${jobDbId}/packages`;
    const pkgs = await api(url);

    // KPIs
    const kpis = $$('#page-packages .kpi-row .kpi');
    const total = pkgs.length;
    const closed = pkgs.filter(p => p.status === 'closed').length;
    const prog = pkgs.filter(p => p.status === 'in_progress').length;
    const hold = pkgs.filter(p => p.status === 'hold').length;
    if (kpis[0]) kpis[0].querySelector('.kpi-value').textContent = total;
    if (kpis[1]) kpis[1].querySelector('.kpi-value').textContent = closed;
    if (kpis[2]) kpis[2].querySelector('.kpi-value').textContent = prog;
    if (kpis[3]) kpis[3].querySelector('.kpi-value').textContent = hold;

    // Table
    const tbody = $('#page-packages .tc tbody');
    if (tbody) {
      tbody.innerHTML = pkgs.map(p =>
        `<tr>
          <td class="tid">${p.package_id}</td>
          <td>${p.unit_number || ''}</td>
          <td class="tdb">${p.equipment || ''}</td>
          <td>${p.inspector || ''}</td>
          <td>${badge(p.ai_status || 'pending', statusLabel(p.ai_status || 'pending'))}</td>
          <td>${badge(p.status, statusLabel(p.status))}</td>
          <td>${progressBar(p.progress || 0)}</td>
        </tr>`
      ).join('');
    }
  } catch (e) {
    console.error('Packages load failed:', e);
  }
}

// ═══ WELDS ═══
async function renderWelds(filter) {
  try {
    const url = filter && filter !== 'all' ? `/jobs/${jobDbId}/welds?status=${filter}` : `/jobs/${jobDbId}/welds`;
    const welds = await api(url);

    const kpis = $$('#page-welds .kpi-row .kpi');
    const total = welds.length;
    const accepted = welds.filter(w => w.status === 'accepted' || w.status === 'complete').length;
    const rejected = welds.filter(w => w.status === 'rejected').length;
    const pending = welds.filter(w => w.nde_status === 'pending' || w.nde_status === 'requested').length;
    if (kpis[0]) kpis[0].querySelector('.kpi-value').textContent = total.toLocaleString();
    if (kpis[1]) kpis[1].querySelector('.kpi-value').textContent = accepted.toLocaleString();
    if (kpis[2]) kpis[2].querySelector('.kpi-value').textContent = rejected;
    if (kpis[3]) kpis[3].querySelector('.kpi-value').textContent = pending;

    const tbody = $('#page-welds .tc tbody');
    if (tbody) {
      tbody.innerHTML = welds.map(w =>
        `<tr>
          <td class="tid">${w.weld_id}</td>
          <td class="tdb">${w.welder_name || ''}</td>
          <td class="tmono">${w.wps_number || ''}</td>
          <td>${w.size || ''} ${w.schedule || ''}</td>
          <td>${badge(w.vt_status, statusLabel(w.vt_status))}</td>
          <td>${w.nde_method || ''}</td>
          <td>${w.ai_flag ? badge(w.ai_flag === 'clear' ? 'clear' : w.ai_flag === 'pattern' ? 'pattern' : 'reviewing', statusLabel(w.ai_flag)) : '—'}</td>
          <td>${badge(w.status, statusLabel(w.status))}</td>
        </tr>`
      ).join('');
    }
  } catch (e) {
    console.error('Welds load failed:', e);
  }
}

// ═══ NDE ═══
async function renderNde(filter) {
  try {
    const url = filter && filter !== 'all' ? `/jobs/${jobDbId}/nde?method=${filter}` : `/jobs/${jobDbId}/nde`;
    const exams = await api(url);

    const kpis = $$('#page-nde .kpi-row .kpi');
    const total = exams.length;
    const accepted = exams.filter(n => n.result === 'accepted').length;
    const rejected = exams.filter(n => n.result === 'rejected').length;
    const aiReviewed = exams.filter(n => n.ai_review_status === 'complete').length;
    if (kpis[0]) kpis[0].querySelector('.kpi-value').textContent = total;
    if (kpis[1]) kpis[1].querySelector('.kpi-value').textContent = accepted;
    if (kpis[2]) kpis[2].querySelector('.kpi-value').textContent = rejected;
    if (kpis[3]) kpis[3].querySelector('.kpi-value').textContent = aiReviewed;

    const tbody = $('#page-nde .tc tbody');
    if (tbody) {
      tbody.innerHTML = exams.map(n => {
        const aiLabel = n.ai_review_status === 'complete'
          ? (n.ai_findings && n.ai_findings.includes('indication') ? 'Indications' : 'Clear')
          : statusLabel(n.ai_review_status);
        const aiCls = n.ai_review_status === 'complete'
          ? (n.result === 'rejected' ? 'bh' : n.ai_findings && n.ai_findings.toLowerCase().includes('no recordable') ? 'bd' : 'ba')
          : 'bpn';
        return `<tr>
          <td class="tid">${n.nde_id}</td>
          <td>${n.weld_number || ''}</td>
          <td class="tdb">${n.method}</td>
          <td>${n.technician || ''}</td>
          <td class="tmono" style="font-size:10px;">${(n.code_reference || '').replace('ASME ', '')}</td>
          <td><span class="b ${aiCls}">${aiLabel}</span></td>
          <td>${confidence(n.ai_confidence)}</td>
          <td>${badge(n.result || 'pending', statusLabel(n.result || 'pending'))}</td>
        </tr>`;
      }).join('');
    }
  } catch (e) {
    console.error('NDE load failed:', e);
  }
}

// ═══ FLANGES ═══
async function renderFlanges(filter) {
  try {
    const url = filter && filter !== 'all' ? `/jobs/${jobDbId}/flanges?status=${filter}` : `/jobs/${jobDbId}/flanges`;
    const flanges = await api(url);

    const kpis = $$('#page-flanges .kpi-row .kpi');
    const total = flanges.length;
    const complete = flanges.filter(f => f.status === 'complete').length;
    const pending = flanges.filter(f => f.jtr_status === 'open' || f.jtr_status === 'pending').length;
    const holds = flanges.filter(f => f.status === 'hold').length;
    if (kpis[0]) kpis[0].querySelector('.kpi-value').textContent = total;
    if (kpis[1]) kpis[1].querySelector('.kpi-value').textContent = complete;
    if (kpis[2]) kpis[2].querySelector('.kpi-value').textContent = pending;
    if (kpis[3]) kpis[3].querySelector('.kpi-value').textContent = holds;

    const tbody = $('#page-flanges .tc tbody');
    if (tbody) {
      tbody.innerHTML = flanges.map(f =>
        `<tr>
          <td class="tid">${f.flange_id}</td>
          <td>${f.unit_number || ''}</td>
          <td class="tdb">${f.size || ''} ${f.rating || ''}</td>
          <td>${f.gasket_type || ''}</td>
          <td class="tmono">${f.actual_torque ? f.actual_torque + ' ft-lb' : '<span style="color:var(--text-dim);">—</span>'}</td>
          <td>${badge(f.jtr_status, statusLabel(f.jtr_status))}</td>
          <td>${badge(f.status, statusLabel(f.status))}</td>
        </tr>`
      ).join('');
    }
  } catch (e) {
    console.error('Flanges load failed:', e);
  }
}

// ═══ DOCUMENTS ═══
async function renderDocs(filter) {
  try {
    const url = filter && filter !== 'all' ? `/jobs/${jobDbId}/documents?type=${filter}` : `/jobs/${jobDbId}/documents`;
    const docs = await api(url);

    const kpis = $$('#page-docs .kpi-row .kpi');
    const total = docs.length;
    const current = docs.filter(d => d.status === 'current' || d.status === 'approved').length;
    const pending = docs.filter(d => d.status === 'pending_review' || d.status === 'draft').length;
    const overdue = docs.filter(d => d.status === 'action_required').length;
    if (kpis[0]) kpis[0].querySelector('.kpi-value').textContent = total;
    if (kpis[1]) kpis[1].querySelector('.kpi-value').textContent = current;
    if (kpis[2]) kpis[2].querySelector('.kpi-value').textContent = pending;
    if (kpis[3]) kpis[3].querySelector('.kpi-value').textContent = overdue;

    const tbody = $('#page-docs .tc tbody');
    if (tbody) {
      tbody.innerHTML = docs.map(d =>
        `<tr>
          <td class="tid">${d.doc_id}</td>
          <td class="tdb">${d.title}</td>
          <td>${statusLabel(d.doc_type || '')}</td>
          <td class="tmono">${d.revision || ''}</td>
          <td>${d.ai_status ? badge(d.ai_status === 'verified' ? 'clear' : d.ai_status, statusLabel(d.ai_status)) : '—'}</td>
          <td>${badge(d.status, statusLabel(d.status))}</td>
        </tr>`
      ).join('');
    }
  } catch (e) {
    console.error('Documents load failed:', e);
  }
}

// ═══ WIRE INVENTORY ═══
async function renderWireInventory(filter) {
  try {
    const items = await api(`/jobs/${jobDbId}/wire-inventory`);
    const filtered = filter && filter !== 'all'
      ? items.filter(w => (w.process || '').toLowerCase().includes(filter.toLowerCase()))
      : items;

    const kpis = $$('#page-wire .kpi-row .kpi');
    const totalOrdered = items.reduce((s, w) => s + (parseFloat(w.amount_ordered) || 0), 0);
    const totalOnsite = items.reduce((s, w) => s + (parseFloat(w.amount_onsite) || 0), 0);
    const needsRestock = items.filter(w => {
      const ord = parseFloat(w.amount_ordered) || 1;
      const on = parseFloat(w.amount_onsite) || 0;
      return (on / ord) < 0.2;
    }).length;
    if (kpis[0]) kpis[0].querySelector('.kpi-value').textContent = items.length;
    if (kpis[1]) kpis[1].querySelector('.kpi-value').textContent = totalOrdered.toLocaleString();
    if (kpis[2]) kpis[2].querySelector('.kpi-value').textContent = totalOnsite.toLocaleString();
    if (kpis[3]) kpis[3].querySelector('.kpi-value').textContent = needsRestock;

    // Update nav badge
    const navBadge = document.getElementById('nav-wire-cnt');
    if (navBadge) navBadge.textContent = items.length;

    // Update table count
    const tcnt = document.querySelector('#page-wire .tcnt');
    if (tcnt) tcnt.textContent = filtered.length;

    const tbody = $('#page-wire .tc tbody');
    if (tbody) {
      tbody.innerHTML = filtered.map(w => {
        const ord = parseFloat(w.amount_ordered) || 1;
        const on = parseFloat(w.amount_onsite) || 0;
        const pct = Math.round((on / ord) * 100);
        return `<tr>
          <td class="tdb">${w.filler_metal || ''}</td>
          <td>${w.process || ''}</td>
          <td>${w.application || ''}</td>
          <td class="tmono">${w.wire_size || ''}</td>
          <td class="tmono">${(parseFloat(w.amount_ordered) || 0).toLocaleString()}</td>
          <td class="tmono">${(parseFloat(w.amount_onsite) || 0).toLocaleString()}</td>
          <td>${progressBar(pct)}</td>
          <td>${w.audit_date ? timeAgo(w.audit_date) : '—'}</td>
        </tr>`;
      }).join('');
    }
  } catch (e) {
    console.error('Wire inventory load failed:', e);
  }
}

// ═══ RFI TRACKER ═══
async function renderRfis(filter) {
  try {
    const url = filter && filter !== 'all'
      ? `/jobs/${jobDbId}/rfis?status=${filter}`
      : `/jobs/${jobDbId}/rfis`;
    const rfis = await api(url);

    const allRfis = filter && filter !== 'all' ? await api(`/jobs/${jobDbId}/rfis`) : rfis;
    const kpis = $$('#page-rfis .kpi-row .kpi');
    const open = allRfis.filter(r => r.status === 'open').length;
    const closed = allRfis.filter(r => r.status === 'closed').length;
    const pending = allRfis.filter(r => r.status === 'pending').length;
    if (kpis[0]) kpis[0].querySelector('.kpi-value').textContent = allRfis.length;
    if (kpis[1]) kpis[1].querySelector('.kpi-value').textContent = open;
    if (kpis[2]) kpis[2].querySelector('.kpi-value').textContent = closed;
    if (kpis[3]) kpis[3].querySelector('.kpi-value').textContent = pending;

    const tcnt = document.querySelector('#page-rfis .tcnt');
    if (tcnt) tcnt.textContent = rfis.length;

    const tbody = $('#page-rfis .tc tbody');
    if (tbody) {
      tbody.innerHTML = rfis.map(r =>
        `<tr>
          <td class="tid">${r.rfi_number || ''}</td>
          <td class="tmono">${r.wo_number || ''}</td>
          <td class="tmono">${r.ets_number || ''}</td>
          <td>${r.date_submitted ? new Date(r.date_submitted).toLocaleDateString() : '—'}</td>
          <td class="tdb">${r.asked_by || ''}</td>
          <td>${r.subject || ''}</td>
          <td>${badge(r.status || 'open', statusLabel(r.status || 'open'))}</td>
        </tr>`
      ).join('');
    }
  } catch (e) {
    console.error('RFI load failed:', e);
  }
}

// ═══ IWR/AWR ═══
async function renderIwr(filter) {
  try {
    const items = await api(`/jobs/${jobDbId}/iwr-awr`);
    let filtered = items.filter(i => !i.deleted);
    if (filter === 'sold') filtered = filtered.filter(i => i.date_sold);
    else if (filter === 'welding') filtered = filtered.filter(i => i.welding_required);
    else if (filter === 'nbic') filtered = filtered.filter(i => i.nbic_repair);
    else if (filter && filter !== 'all') filtered = filtered;

    const kpis = $$('#page-iwr .kpi-row .kpi');
    const active = items.filter(i => !i.deleted);
    const sold = active.filter(i => i.date_sold).length;
    const remaining = active.length - sold;
    const welding = active.filter(i => i.welding_required).length;
    if (kpis[0]) kpis[0].querySelector('.kpi-value').textContent = active.length;
    if (kpis[1]) kpis[1].querySelector('.kpi-value').textContent = sold;
    if (kpis[2]) kpis[2].querySelector('.kpi-value').textContent = remaining;
    if (kpis[3]) kpis[3].querySelector('.kpi-value').textContent = welding;

    const tcnt = document.querySelector('#page-iwr .tcnt');
    if (tcnt) tcnt.textContent = filtered.length;

    const tbody = $('#page-iwr .tc tbody');
    if (tbody) {
      tbody.innerHTML = filtered.map(i =>
        `<tr>
          <td class="tid">${i.iwr_awr_number || ''}</td>
          <td class="tmono">${i.rr_number || ''}</td>
          <td>${i.unit || ''}</td>
          <td class="tdb">${i.equipment_number || ''}</td>
          <td>${i.welding_required ? badge('open', 'Yes') : '<span style="color:var(--text-dim);">No</span>'}</td>
          <td>${i.nbic_repair ? badge('hold', 'Yes') : '<span style="color:var(--text-dim);">No</span>'}</td>
          <td>${i.hydro_psi ? '<span class="tmono">' + i.hydro_psi + ' PSI</span>' : '—'} ${i.hydro_complete ? badge('complete', '✓') : ''}</td>
          <td>${i.date_sold ? badge('complete', 'Sold') : badge('pending', 'Open')}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(i.work_description || '').replace(/"/g, '&quot;')}">${i.work_description || ''}</td>
        </tr>`
      ).join('');
    }
  } catch (e) {
    console.error('IWR/AWR load failed:', e);
  }
}

// ═══ CREW MANAGEMENT ═══
async function renderCrew(filter) {
  try {
    let url;
    if (filter === 'day') url = `/jobs/${jobDbId}/crew/day`;
    else if (filter === 'night') url = `/jobs/${jobDbId}/crew/night`;
    else url = `/jobs/${jobDbId}/crew`;
    const crew = await api(url);
    const allCrew = (filter && filter !== 'all' && filter !== 'qc') ? await api(`/jobs/${jobDbId}/crew`) : crew;

    let displayed = crew;
    if (filter === 'qc') {
      displayed = crew.filter(c => (c.role || '').toLowerCase().includes('qc') || (c.designation || '').toLowerCase().includes('qc'));
    }

    const kpis = $$('#page-crew .kpi-row .kpi');
    const dayCount = allCrew.filter(c => c.shift === 'day').length;
    const nightCount = allCrew.filter(c => c.shift === 'night').length;
    const qcCount = allCrew.filter(c => (c.role || '').toLowerCase().includes('qc') || (c.designation || '').toLowerCase().includes('qc')).length;
    if (kpis[0]) kpis[0].querySelector('.kpi-value').textContent = allCrew.length;
    if (kpis[1]) kpis[1].querySelector('.kpi-value').textContent = dayCount;
    if (kpis[2]) kpis[2].querySelector('.kpi-value').textContent = nightCount;
    if (kpis[3]) kpis[3].querySelector('.kpi-value').textContent = qcCount;

    const tcnt = document.querySelector('#page-crew .tcnt');
    if (tcnt) tcnt.textContent = displayed.length;

    const tbody = $('#page-crew .tc tbody');
    if (tbody) {
      tbody.innerHTML = displayed.map(c =>
        `<tr>
          <td class="tdb">${c.name || ''}</td>
          <td>${c.role || ''}</td>
          <td>${c.shift === 'day' ? badge('open', '☀ Day') : badge('pending', '☾ Night')}</td>
          <td class="tmono">${c.phone || ''}</td>
          <td>${c.unit_area || ''}</td>
          <td>${c.active !== false && c.active !== 0 ? badge('complete', 'Active') : badge('hold', 'Inactive')}</td>
        </tr>`
      ).join('');
    }
  } catch (e) {
    console.error('Crew load failed:', e);
  }
}

// ═══ CODE LIBRARY SEARCH ═══
let codeFilterStandard = 'all';

function setCodeFilter(std, btn) {
  codeFilterStandard = std;
  document.querySelectorAll('.code-chip').forEach(c => {
    c.style.background = 'var(--card)';
    c.style.fontWeight = '400';
  });
  if (btn) {
    btn.style.background = 'var(--accent)';
    btn.style.color = '#000';
    btn.style.fontWeight = '600';
  }
  const input = document.getElementById('code-search-input');
  if (input && input.value.trim()) searchCodes();
}

async function searchCodes() {
  const input = document.getElementById('code-search-input');
  const query = (input ? input.value.trim() : '');
  if (!query) return;

  const resultsDiv = document.getElementById('code-search-results');
  if (!resultsDiv) return;
  resultsDiv.innerHTML = '<div style="color:var(--text-dim);padding:16px;">Searching...</div>';

  try {
    const res = await fetch(`${API}/code-search?q=${encodeURIComponent(query)}&standard=${codeFilterStandard}&limit=20`);
    const data = await res.json();

    if (data.results.length === 0) {
      resultsDiv.innerHTML = '<div style="color:var(--text-dim);padding:16px;background:var(--card);border-radius:10px;border:1px solid var(--border);">No matches found. Try different keywords.</div>';
      return;
    }

    resultsDiv.innerHTML = `<div style="color:var(--text-dim);font-size:12px;margin-bottom:8px;">${data.total} matches for "<strong style="color:var(--text);">${data.query}</strong>"</div>` +
      data.results.map((r, idx) => {
        const stdColor = r.standard === 'b31.3' ? 'var(--accent)' : r.standard === 'section-viii' ? 'var(--cyan)' : r.standard === 'quick-references' ? 'var(--green)' : 'var(--yellow)';
        const highlightedMatch = r.match_line.replace(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark style="background:var(--accent);color:#000;padding:1px 3px;border-radius:3px;">$1</mark>');
        const contextHtml = r.context.split('\n').map((line, li) => {
          const lineNum = r.context_start + li;
          const isMatch = lineNum === r.line_number;
          const escaped = line.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const highlighted = isMatch ? escaped.replace(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark style="background:var(--accent);color:#000;padding:1px 3px;border-radius:3px;">$1</mark>') : escaped;
          return `<div style="display:flex;gap:8px;${isMatch ? 'background:rgba(56,189,248,0.08);border-left:2px solid var(--accent);padding-left:6px;' : ''}"><span style="color:var(--text-dim);min-width:40px;text-align:right;font-size:11px;user-select:none;">${lineNum}</span><span style="white-space:pre-wrap;word-break:break-word;">${highlighted}</span></div>`;
        }).join('');

        return `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="background:${stdColor}20;color:${stdColor};border:1px solid ${stdColor}30;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">${r.standard_name}</span>
            <span style="color:var(--text-dim);font-size:11px;">${r.file}</span>
            <span style="color:var(--text-dim);font-size:11px;margin-left:auto;">Line ${r.line_number}</span>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.6;overflow-x:auto;">${contextHtml}</div>
        </div>`;
      }).join('');
  } catch (e) {
    resultsDiv.innerHTML = `<div style="color:var(--red);padding:16px;background:var(--card);border-radius:10px;">Search failed: ${e.message}</div>`;
  }
}

async function loadCodeStandards() {
  try {
    const res = await fetch(`${API}/code-standards`);
    const standards = await res.json();
    const infoDiv = document.getElementById('code-standards-info');
    if (infoDiv && standards.length > 0) {
      const totalFiles = standards.reduce((s, st) => s + st.file_count, 0);
      const totalLines = standards.reduce((s, st) => s + st.total_lines, 0);
      infoDiv.innerHTML = `<div style="display:flex;gap:16px;flex-wrap:wrap;">
        ${standards.map(s => {
          const col = s.id === 'b31.3' ? 'var(--accent)' : s.id === 'section-viii' ? 'var(--cyan)' : s.id === 'quick-references' ? 'var(--green)' : 'var(--yellow)';
          return `<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:12px;">
            <span style="color:${col};font-weight:600;">${s.name}</span>
            <span style="color:var(--text-dim);margin-left:8px;">${s.file_count} files · ${s.total_lines.toLocaleString()} lines</span>
          </div>`;
        }).join('')}
      </div>`;
    }
  } catch (e) {
    console.error('Failed to load code standards:', e);
  }
}

// ═══ AI ASSISTANT — CODE QUERY ═══
async function sendAiQuery() {
  const input = document.getElementById('ai-chat-input');
  const question = input ? input.value.trim() : '';
  if (!question) return;

  const resultsDiv = document.getElementById('ai-chat-results');
  if (!resultsDiv) return;

  // Show user question
  resultsDiv.innerHTML += `<div class="ai-msg" style="justify-content:flex-end;"><div class="ai-bub" style="background:var(--accent);color:#000;margin-left:40px;margin-right:0;">${question}</div></div>`;
  input.value = '';

  // Show loading
  const loadingId = 'ai-loading-' + Date.now();
  resultsDiv.innerHTML += `<div id="${loadingId}" class="ai-msg"><div class="ai-av">AI</div><div class="ai-bub" style="color:var(--text-dim);">Searching codebooks...</div></div>`;

  try {
    const res = await fetch(`${API}/ai-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    const loading = document.getElementById(loadingId);
    if (loading) loading.remove();

    const a = data.answer;
    let html = `<div class="ai-msg"><div class="ai-av">AI</div><div class="ai-bub">`;
    html += `<div style="margin-bottom:10px;"><strong style="color:var(--accent);">Governing Code:</strong> ${a.governing_code}</div>`;

    if (a.references && a.references.length > 0) {
      html += `<div style="margin-bottom:10px;"><strong style="color:var(--cyan);">Applicable References (${a.references.length}):</strong></div>`;
      a.references.forEach((ref, i) => {
        const contextLines = ref.context.split('\n').map(line => {
          const escaped = line.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return escaped;
        }).join('\n');
        html += `<div style="background:rgba(56,189,248,0.05);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;font-size:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:var(--accent);font-weight:600;">${ref.standard}</span>
            <span style="color:var(--text-dim);">${ref.file} : Line ${ref.line}</span>
          </div>
          <div style="color:var(--green);font-weight:600;margin-bottom:4px;">Match (${ref.keywords_matched.join(', ')}):</div>
          <div style="color:var(--text);">${ref.excerpt}</div>
          <details style="margin-top:6px;"><summary style="color:var(--text-dim);cursor:pointer;font-size:11px;">Show context</summary>
            <pre style="margin-top:4px;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.5;white-space:pre-wrap;color:var(--text-dim);max-height:200px;overflow-y:auto;">${contextLines}</pre>
          </details>
        </div>`;
      });
    }

    html += `<div style="margin-bottom:8px;"><strong style="color:var(--yellow);">Technical Requirement:</strong><br>${a.technical_requirement}</div>`;

    if (a.limitations && a.limitations !== 'None') {
      html += `<div style="margin-bottom:8px;color:var(--text-dim);font-size:12px;"><strong>Limitations:</strong> ${a.limitations}</div>`;
    }

    html += `<div style="margin-top:10px;padding:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;font-size:11px;color:var(--red);">⚠ ${a.disclaimer}</div>`;
    html += `</div></div>`;

    resultsDiv.innerHTML += html;
    resultsDiv.scrollTop = resultsDiv.scrollHeight;

  } catch (e) {
    const loading = document.getElementById(loadingId);
    if (loading) loading.remove();
    resultsDiv.innerHTML += `<div class="ai-msg"><div class="ai-av">AI</div><div class="ai-bub" style="color:var(--red);">Query failed: ${e.message}</div></div>`;
  }
}

function fillAiQuery(btn) {
  const input = document.getElementById('ai-chat-input');
  if (input && btn) {
    // Strip surrounding quotes from button text
    input.value = btn.textContent.replace(/^[""]|[""]$/g, '');
    sendAiQuery();
  }
}

// ═══ PAGE ROUTING ═══
const pageRenderers = {
  dashboard: renderDashboard,
  packages: renderPackages,
  welds: renderWelds,
  nde: renderNde,
  flanges: renderFlanges,
  docs: renderDocs,
  wire: renderWireInventory,
  rfis: renderRfis,
  iwr: renderIwr,
  crew: renderCrew,
  codes: loadCodeStandards
};

// Hook into existing nav
function hookNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      const renderer = pageRenderers[page];
      if (renderer) {
        setTimeout(() => renderer(), 50); // After page switch animation
      }
    });
  });

  // Hook filter buttons to re-fetch with filter
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.fb');
    if (!btn) return;
    const page = btn.closest('.page');
    if (!page) return;
    const pageId = page.id.replace('page-', '');
    const filterText = btn.textContent.trim().toLowerCase();
    const filterMap = {
      'all': 'all', 'open': 'open', 'closed': 'closed', 'hold': 'hold',
      'rejected': 'rejected', 'pending': 'pending', 'repairs': 'repairs',
      'rt': 'RT', 'paut': 'PAUT', 'ut': 'UT', 'mt/pt': 'MT',
      'drawings': 'isometric', 'itps': 'itp', 'wps': 'wps', 'reports': 'nde_report',
      'holds': 'hold', 'pending nde': 'pending',
      'gtaw': 'GTAW', 'smaw': 'SMAW', 'fcaw': 'FCAW',
      'sold': 'sold', 'welding': 'welding', 'nbic': 'nbic',
      'day': 'day', 'night': 'night', 'qc': 'qc'
    };
    const filter = filterMap[filterText] || 'all';
    const renderer = pageRenderers[pageId];
    if (renderer) renderer(filter);
  });
}

// ═══ INIT ═══
async function init() {
  try {
    const jobs = await api('/jobs');
    if (jobs.length === 0) {
      console.warn('No jobs found. Run: npm run db:seed');
      return;
    }
    currentJob = jobs[0];
    jobDbId = currentJob.id;

    // Update job selector
    const jobId = $('.job-id');
    const jobClient = $('.job-client');
    if (jobId) jobId.textContent = currentJob.job_number;
    if (jobClient) jobClient.textContent = currentJob.client.split(' ')[0];

    hookNavigation();

    // Render dashboard
    await renderDashboard();

    console.log(`Sin Miedo AI — Connected to ${currentJob.job_number} (${currentJob.client})`);
  } catch (e) {
    console.error('Init failed:', e);
    console.error('Is the API server running? npm start');
  }
}

// Go
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
