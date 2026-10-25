// Sin Miedo AI — WebSocket Client
(function () {
  'use strict';

  const WS_URL = `ws://${location.host}`;
  let ws;
  let reconnectDelay = 1000;
  const MAX_RECONNECT = 30000;

  // ── Toast container ──
  function getOrCreateToastContainer() {
    let container = document.getElementById('sm-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sm-toast-container';
      Object.assign(container.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '9999',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
        maxWidth: '380px'
      });
      document.body.appendChild(container);

      // Inject keyframes once
      const style = document.createElement('style');
      style.textContent = `
        @keyframes sm-slide-in {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes sm-slide-out {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(120%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    return container;
  }

  // Color map matching app design vars
  const TOAST_COLORS = {
    success: '#10b981',
    alert:   '#ef4444',
    info:    '#3b82f6',
    ai:      '#8b5cf6'
  };

  function showToast(message, variant = 'info', duration = 5000) {
    const container = getOrCreateToastContainer();
    const borderColor = TOAST_COLORS[variant] || TOAST_COLORS.info;

    const toast = document.createElement('div');
    Object.assign(toast.style, {
      background: '#1e1e2e',
      color: '#e0e0e0',
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: '8px',
      padding: '12px 16px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      fontFamily: 'inherit',
      fontSize: '13px',
      lineHeight: '1.4',
      pointerEvents: 'auto',
      animation: 'sm-slide-in 0.3s ease forwards',
      cursor: 'pointer'
    });
    toast.textContent = message;

    toast.addEventListener('click', () => dismissToast(toast));
    container.appendChild(toast);

    setTimeout(() => dismissToast(toast), duration);
  }

  function dismissToast(el) {
    if (!el || !el.parentNode) return;
    el.style.animation = 'sm-slide-out 0.25s ease forwards';
    el.addEventListener('animationend', () => el.remove());
  }

  // ── Activity feed updater ──
  function updateActivityFeed(data) {
    // Look for the activity feed container in the DOM
    const feedSelectors = ['.activity-feed', '#activity-feed', '[data-activity-feed]', '.activity-list'];
    let feed = null;
    for (const sel of feedSelectors) {
      feed = document.querySelector(sel);
      if (feed) break;
    }
    if (!feed) return;

    const item = document.createElement('div');
    item.className = 'activity-item activity-item--new';
    item.innerHTML = `
      <span class="activity-action">${data.action || ''}</span>
      <span class="activity-desc">${data.description || data.message || ''}</span>
      <span class="activity-time">just now</span>
    `;
    feed.insertBefore(item, feed.firstChild);

    // Cap feed length
    while (feed.children.length > 50) {
      feed.removeChild(feed.lastChild);
    }
  }

  // ── Message router ──
  const MESSAGE_HANDLERS = {
    connected(data) {
      showToast('Real-time feed connected', 'success', 3000);
    },
    activity(data) {
      updateActivityFeed(data);
      showToast(data.description || 'New activity', data.ai_generated ? 'ai' : 'info');
    },
    handover_generated(data) {
      updateActivityFeed({ action: 'handover', description: `Shift handover generated — ${data.item_count || 0} items` });
      showToast(`Shift handover generated with ${data.item_count || 0} items`, 'ai');
    },
    weld_update(data) {
      showToast(`Weld ${data.weld_id || ''}: ${data.status || 'updated'}`, data.status === 'rejected' ? 'alert' : 'success');
    },
    package_update(data) {
      const variant = data.status === 'hold' ? 'alert' : data.status === 'closed' ? 'success' : 'info';
      showToast(`Package ${data.package_id || ''}: ${data.status || 'updated'}`, variant);
    },
    nde_update(data) {
      showToast(`NDE ${data.nde_id || ''}: ${data.result || 'updated'}`, data.result === 'reject' ? 'alert' : 'info');
    },
    ai_insight(data) {
      showToast(data.message || 'New AI insight', 'ai');
    },
    error(data) {
      showToast(data.message || 'An error occurred', 'alert');
    }
  };

  // ── Connection ──
  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      reconnectDelay = 1000;
      console.log('[Sin Miedo WS] Connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const handler = MESSAGE_HANDLERS[msg.type];
        if (handler) {
          handler(msg.data);
        } else {
          console.log('[Sin Miedo WS] Unhandled type:', msg.type, msg.data);
        }
      } catch (e) {
        console.warn('[Sin Miedo WS] Parse error', e);
      }
    };

    ws.onclose = () => {
      console.log(`[Sin Miedo WS] Disconnected — reconnecting in ${reconnectDelay / 1000}s`);
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT);
    };

    ws.onerror = (err) => {
      console.warn('[Sin Miedo WS] Error', err);
      ws.close();
    };
  }

  // Start on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    connect();
  }

  // Expose for manual use
  window.SinMiedoWS = { showToast, connect };
})();
