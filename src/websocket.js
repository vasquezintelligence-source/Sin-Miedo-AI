// Sin Miedo AI — WebSocket Server
import { WebSocketServer } from 'ws';

let wss;
const HEARTBEAT_INTERVAL = 30000;

export function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch { /* ignore malformed */ }
    });

    // Send welcome
    ws.send(JSON.stringify({
      type: 'connected',
      data: { message: 'Sin Miedo AI — Real-time feed active', timestamp: new Date().toISOString() }
    }));
  });

  // Heartbeat: terminate dead connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on('close', () => clearInterval(interval));

  console.log('  ║  WebSocket: attached to HTTP server  ║');
  return wss;
}

export function broadcast(type, data) {
  if (!wss) return;
  const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(payload);
    }
  });
}
