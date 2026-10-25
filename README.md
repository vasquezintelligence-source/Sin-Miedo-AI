# Sin Miedo AI — QC Command Center

Industrial QC/NDE/P6 management platform for refinery turnarounds.

## Quick Start

```bash
npm install
npm run db:init
npm run db:seed
npm run db:migrate
npm start
```

Server runs at http://localhost:3847

## Modules

- Dashboard — KPIs, AI daily brief, unit progress
- Package Tracker — 44-column tracking matching field Excel
- Weld Log — 46-column weld tracking with NDE status
- NDE Control — AI review with confidence scores
- Flange Log — 38-column PCC-1 compliance tracking
- Document Control — Version tracking, AI audit
- Wire Inventory — Filler metal inventory management
- RFI Tracker — Quality RFI management
- IWR/AWR — Additional work request tracking
- Crew Management — Day/night shift roster
- Code Library — Full-text search across ASME/API/AWS/NBIC codebooks
- AI Assistant — Code-referenced query engine

## Tech Stack

- Node.js + Express
- SQLite (better-sqlite3)
- Vanilla JS frontend
- WebSocket real-time updates

## Knowledge Base

107K+ lines of indexed industrial code text:
- ASME B31.3-2020 (Process Piping)
- ASME Section VIII Div. 1-2021 (Pressure Vessels)
- QC Manuals (3 editions)
- Quick reference charts and field guides

## License

PROPRIETARY — Sin Miedo AI / Frank Vasquez
