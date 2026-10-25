// Sin Miedo AI — Express Server
import express from 'express';
import cors from 'cors';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { closeDb } from './db/connection.js';
import apiRoutes from './routes/api.js';
import codeSearchRoutes from './routes/code-search.js';
import { initWebSocket } from './websocket.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3847;

const app = express();

app.use(cors());
app.use(express.json());

// API
app.use('/api', apiRoutes);
app.use('/api', codeSearchRoutes);

// Serve frontend
app.use(express.static(join(__dirname, '..', 'public')));

// SPA fallback (Express 5 syntax)
app.get('/{*path}', (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║     SIN MIEDO AI — QC PLATFORM       ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  Server:  http://localhost:${PORT}      ║`);
  console.log('  ║  Status:  Running                    ║');
  console.log('  ║  AI:      Kimi K3.1 Pro (routed)     ║');
  initWebSocket(server);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});

process.on('SIGINT', () => { closeDb(); server.close(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); server.close(); process.exit(0); });
