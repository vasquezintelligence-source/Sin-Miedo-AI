// Sin Miedo AI — Modal Forms
// Creates/edits records via modal dialogs matching the dark navy design

(function () {
  'use strict';

  const API = '/api';

  // ═══ INJECT MODAL STYLES ═══
  const style = document.createElement('style');
  style.textContent = `
    .sm-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(5, 8, 16, 0.82);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s ease;
      pointer-events: none;
    }
    .sm-overlay.open { opacity: 1; pointer-events: all; }

    .sm-modal {
      background: #121c30;
      border: 1px solid rgba(56,189,248,0.15);
      border-radius: 16px;
      width: 520px; max-width: 94vw; max-height: 88vh;
      display: flex; flex-direction: column;
      box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(56,189,248,0.06);
      transform: translateY(16px) scale(0.97);
      transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
      overflow: hidden;
    }
    .sm-overlay.open .sm-modal { transform: translateY(0) scale(1); }

    .sm-modal::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, #38bdf8, transparent);
    }

    .sm-header {
      display: flex; align-items: center; gap: 10px;
      padding: 18px 22px 14px; border-bottom: 1px solid rgba(56,189,248,0.06);
      position: relative;
    }
    .sm-header-icon {
      width: 28px; height: 28px; border-radius: 8px;
      background: linear-gradient(135deg, #38bdf8, #06b6d4);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 900; color: #050810;
      box-shadow: 0 0 16px rgba(56,189,248,0.25);
    }
    .sm-header-title {
      font-size: 15px; font-weight: 700; color: #e4eaf6; letter-spacing: -0.3px;
    }
    .sm-close {
      margin-left: auto; background: none; border: 1px solid rgba(56,189,248,0.06);
      border-radius: 8px; width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      color: #3d516e; font-size: 18px; cursor: pointer;
      transition: all 0.15s; font-family: inherit;
    }
    .sm-close:hover { color: #e4eaf6; border-color: rgba(56,189,248,0.2); background: rgba(56,189,248,0.06); }

    .sm-body {
      padding: 18px 22px 8px; overflow-y: auto; flex: 1;
    }

    .sm-row { display: grid; gap: 12px; margin-bottom: 14px; }
    .sm-row.c2 { grid-template-columns: 1fr 1fr; }
    .sm-row.c3 { grid-template-columns: 1fr 1fr 1fr; }

    .sm-field { display: flex; flex-direction: column; gap: 5px; }
    .sm-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; color: #3d516e;
    }
    .sm-input, .sm-select {
      background: #0d1525; border: 1px solid rgba(56,189,248,0.06);
      border-radius: 8px; padding: 9px 12px; font-size: 13px;
      color: #e4eaf6; font-family: 'Inter', system-ui, sans-serif;
      outline: none; transition: border-color 0.15s;
      width: 100%;
    }
    .sm-input::placeholder { color: #243050; }
    .sm-input:focus, .sm-select:focus {
      border-color: rgba(56,189,248,0.3);
      box-shadow: 0 0 0 2px rgba(56,189,248,0.06);
    }
    .sm-select {
      appearance: none; cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%233d516e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 10px center;
      padding-right: 28px;
    }
    .sm-select option { background: #0d1525; color: #e4eaf6; }

    .sm-footer {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 22px 18px; border-top: 1px solid rgba(56,189,248,0.06);
    }
    .sm-feedback {
      font-size: 12px; font-weight: 600; flex: 1;
      min-height: 18px; transition: color 0.2s;
    }
    .sm-feedback.ok { color: #22c55e; }
    .sm-feedback.err { color: #ef4444; }

    .sm-btn {
      border: none; border-radius: 8px; padding: 9px 20px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: 'Inter', system-ui, sans-serif;
      transition: all 0.15s;
    }
    .sm-btn-cancel {
      background: rgba(56,189,248,0.04); color: #7e92b4;
      border: 1px solid rgba(56,189,248,0.06);
    }
    .sm-btn-cancel:hover { color: #e4eaf6; border-color: rgba(56,189,248,0.15); }
    .sm-btn-submit {
      background: linear-gradient(135deg, #38bdf8, #06b6d4);
      color: #050810; font-weight: 700;
      box-shadow: 0 0 16px rgba(56,189,248,0.2);
    }
    .sm-btn-submit:hover { opacity: 0.9; }
    .sm-btn-submit:disabled { opacity: 0.4; cursor: not-allowed; }
  `;
  document.head.appendChild(style);

  // ═══ CREATE OVERLAY CONTAINER ═══
  const overlay = document.createElement('div');
  overlay.className = 'sm-overlay';
  overlay.innerHTML = '<div class="sm-modal"></div>';
  document.body.appendChild(overlay);

  const modal = overlay.querySelector('.sm-modal');

  function openModal(html) {
    modal.innerHTML = html;
    // Force reflow, then open
    overlay.offsetHeight;
    overlay.classList.add('open');
    const first = modal.querySelector('.sm-input, .sm-select');
    if (first) setTimeout(() => first.focus(), 120);
  }

  function closeModal() {
    overlay.classList.remove('open');
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  function feedback(msg, ok) {
    const el = modal.querySelector('.sm-feedback');
    if (!el) return;
    el.textContent = msg;
    el.className = 'sm-feedback ' + (ok ? 'ok' : 'err');
  }

  // ═══ HELPERS ═══
  async function fetchJson(path) {
    const r = await fetch(API + path);
    if (!r.ok) return [];
    return r.json();
  }

  async function postJson(path, data) {
    const r = await fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Server error');
    return json;
  }

  function optionsHtml(items, labelKey, valueKey) {
    return '<option value="">— Select —</option>' +
      items.map(i => `<option value="${i[valueKey || labelKey]}">${i[labelKey]}</option>`).join('');
  }

  function getActivePage() {
    const active = document.querySelector('.nav-item.active');
    return active ? active.dataset.page : 'dashboard';
  }

  function getVal(id) {
    const el = modal.querySelector('#' + id);
    return el ? el.value.trim() : '';
  }

  // ═══ 1) NEW PACKAGE MODAL ═══
  async function openNewPackage() {
    const units = await fetchJson(`/jobs/${jobDbId}/units`);
    openModal(`
      <div class="sm-header">
        <div class="sm-header-icon">📦</div>
        <span class="sm-header-title">New Package</span>
        <button class="sm-close" onclick="this.closest('.sm-overlay').classList.remove('open')">✕</button>
      </div>
      <div class="sm-body">
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Package ID</label>
            <input class="sm-input" id="sm-pkg-id" placeholder="PKG-U100-001">
          </div>
          <div class="sm-field">
            <label class="sm-label">Unit</label>
            <select class="sm-select" id="sm-pkg-unit">${optionsHtml(units, 'unit_number')}</select>
          </div>
        </div>
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Equipment</label>
            <input class="sm-input" id="sm-pkg-equip" placeholder="Exchanger E-101">
          </div>
          <div class="sm-field">
            <label class="sm-label">Equipment Type</label>
            <input class="sm-input" id="sm-pkg-type" placeholder="exchanger">
          </div>
        </div>
        <div class="sm-row c3">
          <div class="sm-field">
            <label class="sm-label">Inspector</label>
            <input class="sm-input" id="sm-pkg-insp" placeholder="R. Martinez">
          </div>
          <div class="sm-field">
            <label class="sm-label">Foreman</label>
            <input class="sm-input" id="sm-pkg-fore" placeholder="J. Lopez">
          </div>
          <div class="sm-field">
            <label class="sm-label">Shift</label>
            <select class="sm-select" id="sm-pkg-shift">
              <option value="day">Day</option>
              <option value="night">Night</option>
            </select>
          </div>
        </div>
      </div>
      <div class="sm-footer">
        <span class="sm-feedback"></span>
        <button class="sm-btn sm-btn-cancel" id="sm-pkg-cancel">Cancel</button>
        <button class="sm-btn sm-btn-submit" id="sm-pkg-submit">Create Package</button>
      </div>
    `);
    modal.querySelector('#sm-pkg-cancel').onclick = closeModal;
    modal.querySelector('#sm-pkg-submit').onclick = async () => {
      const pkg_id = getVal('sm-pkg-id');
      if (!pkg_id) return feedback('Package ID is required', false);
      const btn = modal.querySelector('#sm-pkg-submit');
      btn.disabled = true;
      try {
        await postJson(`/jobs/${jobDbId}/packages`, {
          package_id: pkg_id,
          unit_number: getVal('sm-pkg-unit'),
          equipment: getVal('sm-pkg-equip'),
          equipment_type: getVal('sm-pkg-type'),
          inspector: getVal('sm-pkg-insp'),
          foreman: getVal('sm-pkg-fore'),
          shift: getVal('sm-pkg-shift')
        });
        feedback('✓ Package created', true);
        setTimeout(() => { closeModal(); renderPackages(); }, 600);
      } catch (e) {
        feedback(e.message, false);
        btn.disabled = false;
      }
    };
  }

  // ═══ 2) LOG WELD MODAL ═══
  async function openLogWeld() {
    const [units, welders, wps, packages] = await Promise.all([
      fetchJson(`/jobs/${jobDbId}/units`),
      fetchJson(`/jobs/${jobDbId}/welders`),
      fetchJson(`/jobs/${jobDbId}/wps`),
      fetchJson(`/jobs/${jobDbId}/packages`)
    ]);
    const ndeMethods = ['RT', 'PAUT', 'UT', 'MT', 'PT', 'VT', 'TOFD'];
    openModal(`
      <div class="sm-header">
        <div class="sm-header-icon">🔥</div>
        <span class="sm-header-title">Log Weld</span>
        <button class="sm-close" onclick="this.closest('.sm-overlay').classList.remove('open')">✕</button>
      </div>
      <div class="sm-body">
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Weld ID</label>
            <input class="sm-input" id="sm-w-id" placeholder="W-4200">
          </div>
          <div class="sm-field">
            <label class="sm-label">Unit</label>
            <select class="sm-select" id="sm-w-unit">${optionsHtml(units, 'unit_number')}</select>
          </div>
        </div>
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Package</label>
            <select class="sm-select" id="sm-w-pkg">${optionsHtml(packages, 'package_id')}</select>
          </div>
          <div class="sm-field">
            <label class="sm-label">Welder</label>
            <select class="sm-select" id="sm-w-welder">${optionsHtml(welders, 'name')}</select>
          </div>
        </div>
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">WPS</label>
            <select class="sm-select" id="sm-w-wps">${optionsHtml(wps, 'wps_number')}</select>
          </div>
          <div class="sm-field">
            <label class="sm-label">NDE Method</label>
            <select class="sm-select" id="sm-w-nde">
              <option value="">— Select —</option>
              ${ndeMethods.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="sm-row c3">
          <div class="sm-field">
            <label class="sm-label">Size</label>
            <input class="sm-input" id="sm-w-size" placeholder='6"'>
          </div>
          <div class="sm-field">
            <label class="sm-label">Schedule</label>
            <input class="sm-input" id="sm-w-sched" placeholder="Sch 80">
          </div>
          <div class="sm-field">
            <label class="sm-label">Material</label>
            <input class="sm-input" id="sm-w-mat" placeholder="CS / SS / CR">
          </div>
        </div>
        <div class="sm-row">
          <div class="sm-field">
            <label class="sm-label">Joint Type</label>
            <input class="sm-input" id="sm-w-joint" placeholder="butt / socket / fillet">
          </div>
        </div>
      </div>
      <div class="sm-footer">
        <span class="sm-feedback"></span>
        <button class="sm-btn sm-btn-cancel" id="sm-w-cancel">Cancel</button>
        <button class="sm-btn sm-btn-submit" id="sm-w-submit">Log Weld</button>
      </div>
    `);
    modal.querySelector('#sm-w-cancel').onclick = closeModal;
    modal.querySelector('#sm-w-submit').onclick = async () => {
      const weld_id = getVal('sm-w-id');
      if (!weld_id) return feedback('Weld ID is required', false);
      const btn = modal.querySelector('#sm-w-submit');
      btn.disabled = true;
      try {
        await postJson(`/jobs/${jobDbId}/welds`, {
          weld_id,
          unit_number: getVal('sm-w-unit'),
          package_id: getVal('sm-w-pkg'),
          welder_name: getVal('sm-w-welder'),
          wps_number: getVal('sm-w-wps'),
          size: getVal('sm-w-size'),
          schedule: getVal('sm-w-sched'),
          material: getVal('sm-w-mat'),
          joint_type: getVal('sm-w-joint'),
          nde_method: getVal('sm-w-nde')
        });
        feedback('✓ Weld logged', true);
        setTimeout(() => { closeModal(); renderWelds(); }, 600);
      } catch (e) {
        feedback(e.message, false);
        btn.disabled = false;
      }
    };
  }

  // ═══ 3) NDE REQUEST MODAL ═══
  async function openNdeRequest() {
    const welds = await fetchJson(`/jobs/${jobDbId}/welds`);
    const methods = ['RT', 'PAUT', 'UT', 'MT', 'PT', 'VT', 'TOFD'];
    openModal(`
      <div class="sm-header">
        <div class="sm-header-icon">🔬</div>
        <span class="sm-header-title">NDE Request</span>
        <button class="sm-close" onclick="this.closest('.sm-overlay').classList.remove('open')">✕</button>
      </div>
      <div class="sm-body">
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">NDE ID</label>
            <input class="sm-input" id="sm-nde-id" placeholder="NDE-0300">
          </div>
          <div class="sm-field">
            <label class="sm-label">Method</label>
            <select class="sm-select" id="sm-nde-method">
              <option value="">— Select —</option>
              ${methods.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Weld</label>
            <select class="sm-select" id="sm-nde-weld">${optionsHtml(welds, 'weld_id')}</select>
          </div>
          <div class="sm-field">
            <label class="sm-label">Technician</label>
            <input class="sm-input" id="sm-nde-tech" placeholder="M. Singh">
          </div>
        </div>
        <div class="sm-row">
          <div class="sm-field">
            <label class="sm-label">Code Reference</label>
            <input class="sm-input" id="sm-nde-code" placeholder="ASME V Art. 4">
          </div>
        </div>
      </div>
      <div class="sm-footer">
        <span class="sm-feedback"></span>
        <button class="sm-btn sm-btn-cancel" id="sm-nde-cancel">Cancel</button>
        <button class="sm-btn sm-btn-submit" id="sm-nde-submit">Create NDE Request</button>
      </div>
    `);
    modal.querySelector('#sm-nde-cancel').onclick = closeModal;
    modal.querySelector('#sm-nde-submit').onclick = async () => {
      const nde_id = getVal('sm-nde-id');
      const method = getVal('sm-nde-method');
      if (!nde_id) return feedback('NDE ID is required', false);
      if (!method) return feedback('Method is required', false);
      const btn = modal.querySelector('#sm-nde-submit');
      btn.disabled = true;
      try {
        await postJson(`/jobs/${jobDbId}/nde`, {
          nde_id,
          method,
          weld_id: getVal('sm-nde-weld'),
          technician: getVal('sm-nde-tech'),
          code_reference: getVal('sm-nde-code')
        });
        feedback('✓ NDE request created', true);
        setTimeout(() => { closeModal(); renderNde(); }, 600);
      } catch (e) {
        feedback(e.message, false);
        btn.disabled = false;
      }
    };
  }

  // ═══ 4) ADD FLANGE MODAL ═══
  async function openAddFlange() {
    const units = await fetchJson(`/jobs/${jobDbId}/units`);
    openModal(`
      <div class="sm-header">
        <div class="sm-header-icon">⚙</div>
        <span class="sm-header-title">Add Flange</span>
        <button class="sm-close" onclick="this.closest('.sm-overlay').classList.remove('open')">✕</button>
      </div>
      <div class="sm-body">
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Flange ID</label>
            <input class="sm-input" id="sm-flg-id" placeholder="FLG-U100-050">
          </div>
          <div class="sm-field">
            <label class="sm-label">Unit</label>
            <select class="sm-select" id="sm-flg-unit">${optionsHtml(units, 'unit_number')}</select>
          </div>
        </div>
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Size</label>
            <input class="sm-input" id="sm-flg-size" placeholder='8"'>
          </div>
          <div class="sm-field">
            <label class="sm-label">Rating</label>
            <input class="sm-input" id="sm-flg-rating" placeholder="900#">
          </div>
        </div>
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Gasket Type</label>
            <input class="sm-input" id="sm-flg-gtype" placeholder="SW-CG / RJ / Kammprofile">
          </div>
          <div class="sm-field">
            <label class="sm-label">Gasket Material</label>
            <input class="sm-input" id="sm-flg-gmat" placeholder="316 SS / Flexitallic">
          </div>
        </div>
        <div class="sm-row">
          <div class="sm-field">
            <label class="sm-label">Target Torque (ft-lb)</label>
            <input class="sm-input" id="sm-flg-torque" type="number" placeholder="590">
          </div>
        </div>
      </div>
      <div class="sm-footer">
        <span class="sm-feedback"></span>
        <button class="sm-btn sm-btn-cancel" id="sm-flg-cancel">Cancel</button>
        <button class="sm-btn sm-btn-submit" id="sm-flg-submit">Add Flange</button>
      </div>
    `);
    modal.querySelector('#sm-flg-cancel').onclick = closeModal;
    modal.querySelector('#sm-flg-submit').onclick = async () => {
      const flange_id = getVal('sm-flg-id');
      if (!flange_id) return feedback('Flange ID is required', false);
      const btn = modal.querySelector('#sm-flg-submit');
      btn.disabled = true;
      try {
        await postJson(`/jobs/${jobDbId}/flanges`, {
          flange_id,
          unit_number: getVal('sm-flg-unit'),
          size: getVal('sm-flg-size'),
          rating: getVal('sm-flg-rating'),
          gasket_type: getVal('sm-flg-gtype'),
          gasket_material: getVal('sm-flg-gmat'),
          target_torque: getVal('sm-flg-torque') ? parseFloat(getVal('sm-flg-torque')) : null
        });
        feedback('✓ Flange added', true);
        setTimeout(() => { closeModal(); renderFlanges(); }, 600);
      } catch (e) {
        feedback(e.message, false);
        btn.disabled = false;
      }
    };
  }

  // ═══ 5) UPLOAD DOCUMENT MODAL ═══
  async function openUploadDoc() {
    const docTypes = [
      { value: 'isometric', label: 'Isometric' },
      { value: 'itp', label: 'ITP' },
      { value: 'wps', label: 'WPS' },
      { value: 'pqr', label: 'PQR' },
      { value: 'nde_report', label: 'NDE Report' },
      { value: 'drawing', label: 'Drawing' },
      { value: 'procedure', label: 'Procedure' },
      { value: 'closeout', label: 'Closeout' },
      { value: 'rfi', label: 'RFI' },
      { value: 'transmittal', label: 'Transmittal' },
      { value: 'other', label: 'Other' }
    ];
    openModal(`
      <div class="sm-header">
        <div class="sm-header-icon">📄</div>
        <span class="sm-header-title">Upload Document</span>
        <button class="sm-close" onclick="this.closest('.sm-overlay').classList.remove('open')">✕</button>
      </div>
      <div class="sm-body">
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Document ID</label>
            <input class="sm-input" id="sm-doc-id" placeholder="DWG-U100-050">
          </div>
          <div class="sm-field">
            <label class="sm-label">Document Type</label>
            <select class="sm-select" id="sm-doc-type">
              <option value="">— Select —</option>
              ${docTypes.map(d => `<option value="${d.value}">${d.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="sm-row">
          <div class="sm-field">
            <label class="sm-label">Title</label>
            <input class="sm-input" id="sm-doc-title" placeholder="E-101 Shell Side ISO">
          </div>
        </div>
        <div class="sm-row">
          <div class="sm-field">
            <label class="sm-label">Revision</label>
            <input class="sm-input" id="sm-doc-rev" placeholder="R0">
          </div>
        </div>
      </div>
      <div class="sm-footer">
        <span class="sm-feedback"></span>
        <button class="sm-btn sm-btn-cancel" id="sm-doc-cancel">Cancel</button>
        <button class="sm-btn sm-btn-submit" id="sm-doc-submit">Upload Document</button>
      </div>
    `);
    modal.querySelector('#sm-doc-cancel').onclick = closeModal;
    modal.querySelector('#sm-doc-submit').onclick = async () => {
      const doc_id = getVal('sm-doc-id');
      const title = getVal('sm-doc-title');
      if (!doc_id) return feedback('Document ID is required', false);
      if (!title) return feedback('Title is required', false);
      const btn = modal.querySelector('#sm-doc-submit');
      btn.disabled = true;
      try {
        await postJson(`/jobs/${jobDbId}/documents`, {
          doc_id,
          title,
          doc_type: getVal('sm-doc-type') || 'other',
          revision: getVal('sm-doc-rev')
        });
        feedback('✓ Document uploaded', true);
        setTimeout(() => { closeModal(); renderDocs(); }, 600);
      } catch (e) {
        feedback(e.message, false);
        btn.disabled = false;
      }
    };
  }

  // ═══ 6) NEW WIRE ENTRY MODAL ═══
  async function openNewWireEntry() {
    openModal(`
      <div class="sm-header">
        <div class="sm-header-icon">⬡</div>
        <span class="sm-header-title">New Wire Entry</span>
        <button class="sm-close" onclick="this.closest('.sm-overlay').classList.remove('open')">✕</button>
      </div>
      <div class="sm-body">
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Filler Metal</label>
            <input class="sm-input" id="sm-wire-filler" placeholder="ER70S-6">
          </div>
          <div class="sm-field">
            <label class="sm-label">Process</label>
            <select class="sm-select" id="sm-wire-process">
              <option value="">— Select —</option>
              <option value="GTAW">GTAW</option>
              <option value="SMAW">SMAW</option>
              <option value="FCAW">FCAW</option>
              <option value="GMAW">GMAW</option>
              <option value="SAW">SAW</option>
            </select>
          </div>
        </div>
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Application</label>
            <input class="sm-input" id="sm-wire-app" placeholder="CS Piping">
          </div>
          <div class="sm-field">
            <label class="sm-label">Wire Size</label>
            <input class="sm-input" id="sm-wire-size" placeholder="3/32&quot;">
          </div>
        </div>
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Amount Ordered (lbs)</label>
            <input class="sm-input" id="sm-wire-ordered" type="number" placeholder="500">
          </div>
          <div class="sm-field">
            <label class="sm-label">Amount Onsite (lbs)</label>
            <input class="sm-input" id="sm-wire-onsite" type="number" placeholder="350">
          </div>
        </div>
      </div>
      <div class="sm-footer">
        <span class="sm-feedback"></span>
        <button class="sm-btn sm-btn-cancel" id="sm-wire-cancel">Cancel</button>
        <button class="sm-btn sm-btn-submit" id="sm-wire-submit">Add Wire Entry</button>
      </div>
    `);
    modal.querySelector('#sm-wire-cancel').onclick = closeModal;
    modal.querySelector('#sm-wire-submit').onclick = async () => {
      const filler_metal = getVal('sm-wire-filler');
      if (!filler_metal) return feedback('Filler metal is required', false);
      const btn = modal.querySelector('#sm-wire-submit');
      btn.disabled = true;
      try {
        await postJson(`/jobs/${jobDbId}/wire-inventory`, {
          filler_metal,
          process: getVal('sm-wire-process'),
          application: getVal('sm-wire-app'),
          wire_size: getVal('sm-wire-size'),
          amount_ordered: getVal('sm-wire-ordered') ? parseFloat(getVal('sm-wire-ordered')) : null,
          amount_onsite: getVal('sm-wire-onsite') ? parseFloat(getVal('sm-wire-onsite')) : null
        });
        feedback('✓ Wire entry added', true);
        setTimeout(() => { closeModal(); renderWireInventory(); }, 600);
      } catch (e) {
        feedback(e.message, false);
        btn.disabled = false;
      }
    };
  }

  // ═══ 7) NEW RFI MODAL ═══
  async function openNewRfi() {
    openModal(`
      <div class="sm-header">
        <div class="sm-header-icon">◇</div>
        <span class="sm-header-title">New RFI</span>
        <button class="sm-close" onclick="this.closest('.sm-overlay').classList.remove('open')">✕</button>
      </div>
      <div class="sm-body">
        <div class="sm-row c3">
          <div class="sm-field">
            <label class="sm-label">RFI Number</label>
            <input class="sm-input" id="sm-rfi-num" placeholder="RFI-001">
          </div>
          <div class="sm-field">
            <label class="sm-label">WO Number</label>
            <input class="sm-input" id="sm-rfi-wo" placeholder="WO-1234">
          </div>
          <div class="sm-field">
            <label class="sm-label">ETS Number</label>
            <input class="sm-input" id="sm-rfi-ets" placeholder="ETS-5678">
          </div>
        </div>
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Asked By</label>
            <input class="sm-input" id="sm-rfi-asked" placeholder="J. Hernandez">
          </div>
          <div class="sm-field">
            <label class="sm-label">BIC</label>
            <input class="sm-input" id="sm-rfi-bic" placeholder="QC Inspector">
          </div>
        </div>
        <div class="sm-row">
          <div class="sm-field">
            <label class="sm-label">Subject</label>
            <input class="sm-input" id="sm-rfi-subject" placeholder="Weld procedure clarification for U-300">
          </div>
        </div>
      </div>
      <div class="sm-footer">
        <span class="sm-feedback"></span>
        <button class="sm-btn sm-btn-cancel" id="sm-rfi-cancel">Cancel</button>
        <button class="sm-btn sm-btn-submit" id="sm-rfi-submit">Create RFI</button>
      </div>
    `);
    modal.querySelector('#sm-rfi-cancel').onclick = closeModal;
    modal.querySelector('#sm-rfi-submit').onclick = async () => {
      const rfi_number = getVal('sm-rfi-num');
      if (!rfi_number) return feedback('RFI number is required', false);
      const btn = modal.querySelector('#sm-rfi-submit');
      btn.disabled = true;
      try {
        await postJson(`/jobs/${jobDbId}/rfis`, {
          rfi_number,
          wo_number: getVal('sm-rfi-wo'),
          ets_number: getVal('sm-rfi-ets'),
          asked_by: getVal('sm-rfi-asked'),
          subject: getVal('sm-rfi-subject')
        });
        feedback('✓ RFI created', true);
        setTimeout(() => { closeModal(); renderRfis(); }, 600);
      } catch (e) {
        feedback(e.message, false);
        btn.disabled = false;
      }
    };
  }

  // ═══ 8) NEW IWR/AWR MODAL ═══
  async function openNewIwr() {
    openModal(`
      <div class="sm-header">
        <div class="sm-header-icon">▣</div>
        <span class="sm-header-title">New IWR/AWR</span>
        <button class="sm-close" onclick="this.closest('.sm-overlay').classList.remove('open')">✕</button>
      </div>
      <div class="sm-body">
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">IWR/AWR Number</label>
            <input class="sm-input" id="sm-iwr-num" placeholder="AWR-001">
          </div>
          <div class="sm-field">
            <label class="sm-label">Unit</label>
            <input class="sm-input" id="sm-iwr-unit" placeholder="U-300">
          </div>
        </div>
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Equipment Number</label>
            <input class="sm-input" id="sm-iwr-equip" placeholder="E-301">
          </div>
          <div class="sm-field" style="display:flex;align-items:center;gap:10px;flex-direction:row;padding-top:18px;">
            <input type="checkbox" id="sm-iwr-weld" style="width:18px;height:18px;accent-color:#38bdf8;">
            <label class="sm-label" style="margin:0;text-transform:none;font-size:12px;color:var(--text-secondary);">Welding Required</label>
          </div>
        </div>
        <div class="sm-row">
          <div class="sm-field">
            <label class="sm-label">Work Description</label>
            <input class="sm-input" id="sm-iwr-desc" placeholder="Replace corroded section, re-weld nozzle N-3">
          </div>
        </div>
      </div>
      <div class="sm-footer">
        <span class="sm-feedback"></span>
        <button class="sm-btn sm-btn-cancel" id="sm-iwr-cancel">Cancel</button>
        <button class="sm-btn sm-btn-submit" id="sm-iwr-submit">Create AWR</button>
      </div>
    `);
    modal.querySelector('#sm-iwr-cancel').onclick = closeModal;
    modal.querySelector('#sm-iwr-submit').onclick = async () => {
      const iwr_awr_number = getVal('sm-iwr-num');
      if (!iwr_awr_number) return feedback('AWR number is required', false);
      const btn = modal.querySelector('#sm-iwr-submit');
      btn.disabled = true;
      try {
        await postJson(`/jobs/${jobDbId}/iwr-awr`, {
          iwr_awr_number,
          unit: getVal('sm-iwr-unit'),
          equipment_number: getVal('sm-iwr-equip'),
          welding_required: modal.querySelector('#sm-iwr-weld').checked ? 1 : 0,
          work_description: getVal('sm-iwr-desc')
        });
        feedback('✓ AWR created', true);
        setTimeout(() => { closeModal(); renderIwr(); }, 600);
      } catch (e) {
        feedback(e.message, false);
        btn.disabled = false;
      }
    };
  }

  // ═══ 9) NEW CREW MEMBER MODAL ═══
  async function openNewCrewMember() {
    openModal(`
      <div class="sm-header">
        <div class="sm-header-icon">◎</div>
        <span class="sm-header-title">Add Crew Member</span>
        <button class="sm-close" onclick="this.closest('.sm-overlay').classList.remove('open')">✕</button>
      </div>
      <div class="sm-body">
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Name</label>
            <input class="sm-input" id="sm-crew-name" placeholder="J. Hernandez">
          </div>
          <div class="sm-field">
            <label class="sm-label">Role</label>
            <select class="sm-select" id="sm-crew-role">
              <option value="">— Select —</option>
              <option value="QC Inspector">QC Inspector</option>
              <option value="QC Manager">QC Manager</option>
              <option value="Welder">Welder</option>
              <option value="Fitter">Fitter</option>
              <option value="Pipefitter">Pipefitter</option>
              <option value="NDE Technician">NDE Technician</option>
              <option value="Foreman">Foreman</option>
              <option value="Superintendent">Superintendent</option>
              <option value="Safety">Safety</option>
              <option value="Helper">Helper</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Shift</label>
            <select class="sm-select" id="sm-crew-shift">
              <option value="day">Day</option>
              <option value="night">Night</option>
            </select>
          </div>
          <div class="sm-field">
            <label class="sm-label">Phone</label>
            <input class="sm-input" id="sm-crew-phone" placeholder="(555) 123-4567">
          </div>
        </div>
        <div class="sm-row c2">
          <div class="sm-field">
            <label class="sm-label">Email</label>
            <input class="sm-input" id="sm-crew-email" placeholder="jhernandez@example.com">
          </div>
          <div class="sm-field">
            <label class="sm-label">Unit/Area</label>
            <input class="sm-input" id="sm-crew-area" placeholder="U-300">
          </div>
        </div>
      </div>
      <div class="sm-footer">
        <span class="sm-feedback"></span>
        <button class="sm-btn sm-btn-cancel" id="sm-crew-cancel">Cancel</button>
        <button class="sm-btn sm-btn-submit" id="sm-crew-submit">Add Crew Member</button>
      </div>
    `);
    modal.querySelector('#sm-crew-cancel').onclick = closeModal;
    modal.querySelector('#sm-crew-submit').onclick = async () => {
      const name = getVal('sm-crew-name');
      const role = getVal('sm-crew-role');
      if (!name) return feedback('Name is required', false);
      if (!role) return feedback('Role is required', false);
      const btn = modal.querySelector('#sm-crew-submit');
      btn.disabled = true;
      try {
        await postJson(`/jobs/${jobDbId}/crew`, {
          name,
          role,
          shift: getVal('sm-crew-shift') || 'day',
          phone: getVal('sm-crew-phone'),
          email: getVal('sm-crew-email'),
          unit_area: getVal('sm-crew-area')
        });
        feedback('✓ Crew member added', true);
        setTimeout(() => { closeModal(); renderCrew(); }, 600);
      } catch (e) {
        feedback(e.message, false);
        btn.disabled = false;
      }
    };
  }

  // ═══ WIRE ACTION BUTTON ═══
  const modalMap = {
    dashboard:  openNewPackage,
    packages:   openNewPackage,
    welds:      openLogWeld,
    nde:        openNdeRequest,
    flanges:    openAddFlange,
    docs:       openUploadDoc,
    wire:       openNewWireEntry,
    rfis:       openNewRfi,
    iwr:        openNewIwr,
    crew:       openNewCrewMember
  };

  // Bind the topbar action button
  const abtn = document.getElementById('abtn');
  if (abtn) {
    abtn.addEventListener('click', () => {
      const page = getActivePage();
      const opener = modalMap[page];
      if (opener) opener();
    });
  }

  // Expose for external use if needed
  window.smModals = {
    openNewPackage,
    openLogWeld,
    openNdeRequest,
    openAddFlange,
    openUploadDoc,
    openNewWireEntry,
    openNewRfi,
    openNewIwr,
    openNewCrewMember,
    close: closeModal
  };

})();
