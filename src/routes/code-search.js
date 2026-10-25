// Sin Miedo AI — Code Search API
// Full-text search over ingested ASME/API/AWS codebooks
import { Router } from 'express';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = join(__dirname, '..', '..', 'knowledge');

const router = Router();

// ═══ IN-MEMORY CACHE ═══
// ~4.8 MB of text — load once, search fast
const fileCache = new Map(); // path -> { lines: string[], standard: string, name: string }
let cacheReady = false;

function getStandardId(filePath) {
  const rel = relative(KNOWLEDGE_DIR, filePath).replace(/\\/g, '/');
  if (rel.startsWith('asme-b31.3/')) return 'b31.3';
  if (rel.startsWith('asme-section-viii/')) return 'section-viii';
  if (rel.startsWith('quick-references/')) return 'quick-references';
  if (rel.startsWith('qc-manuals/')) return 'qc-manuals';
  return 'other';
}

function getStandardName(id) {
  const names = {
    'b31.3': 'ASME B31.3 Process Piping',
    'section-viii': 'ASME Section VIII Div 1 — Pressure Vessels',
    'quick-references': 'Quick Reference Charts',
    'qc-manuals': 'QC Manuals',
    'other': 'Other'
  };
  return names[id] || id;
}

function getStandardEdition(id) {
  const editions = {
    'b31.3': '2020 Edition',
    'section-viii': '2021 Edition',
    'quick-references': 'Current',
    'qc-manuals': 'Current'
  };
  return editions[id] || '';
}

function walkDir(dir, files = []) {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walkDir(full, files);
      } else if (entry.endsWith('.txt')) {
        files.push(full);
      }
    }
  } catch (e) {
    console.error(`walkDir error: ${e.message}`);
  }
  return files;
}

function loadCache() {
  if (cacheReady) return;
  const files = walkDir(KNOWLEDGE_DIR);
  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const standard = getStandardId(filePath);
      fileCache.set(filePath, {
        lines,
        standard,
        name: basename(filePath, '.txt'),
        relativePath: relative(KNOWLEDGE_DIR, filePath).replace(/\\/g, '/')
      });
    } catch (e) {
      console.error(`Failed to load ${filePath}: ${e.message}`);
    }
  }
  cacheReady = true;
  console.log(`  ║  Code KB: ${fileCache.size} files cached          ║`);
}

// Load on first import
loadCache();

// ═══ GET /api/code-search ═══
router.get('/code-search', (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) return res.json({ results: [], total: 0 });

  const standardFilter = (req.query.standard || 'all').toLowerCase();
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const contextLines = 5;

  const queryLower = query.toLowerCase();
  const results = [];

  for (const [filePath, file] of fileCache) {
    // Filter by standard
    if (standardFilter !== 'all' && file.standard !== standardFilter) continue;

    const { lines, standard, name, relativePath } = file;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(queryLower)) {
        const start = Math.max(0, i - contextLines);
        const end = Math.min(lines.length - 1, i + contextLines);
        const context = lines.slice(start, end + 1).join('\n');

        results.push({
          file: relativePath,
          standard,
          standard_name: getStandardName(standard),
          line_number: i + 1, // 1-indexed
          match_line: lines[i].trim(),
          context,
          context_start: start + 1,
          context_end: end + 1
        });

        if (results.length >= limit * 3) break; // Collect extra, trim later
      }
    }
    if (results.length >= limit * 3) break;
  }

  res.json({
    results: results.slice(0, limit),
    total: results.length,
    query,
    standard: standardFilter
  });
});

// ═══ GET /api/code-standards ═══
router.get('/code-standards', (req, res) => {
  const standards = {};

  for (const [, file] of fileCache) {
    const id = file.standard;
    if (!standards[id]) {
      standards[id] = {
        id,
        name: getStandardName(id),
        edition: getStandardEdition(id),
        file_count: 0,
        total_lines: 0,
        files: []
      };
    }
    standards[id].file_count++;
    standards[id].total_lines += file.lines.length;
    standards[id].files.push(file.relativePath);
  }

  res.json(Object.values(standards));
});

// ═══ GET /api/code-section ═══
router.get('/code-section', (req, res) => {
  const filePath = req.query.file;
  const start = parseInt(req.query.start) || 1;
  const end = parseInt(req.query.end) || (start + 50);

  if (!filePath) return res.status(400).json({ error: 'file parameter required' });

  const fullPath = join(KNOWLEDGE_DIR, filePath);
  const cached = fileCache.get(fullPath);
  if (!cached) {
    return res.status(404).json({ error: 'File not found in knowledge base' });
  }

  const lines = cached.lines.slice(start - 1, end);
  res.json({
    file: filePath,
    standard: cached.standard,
    start_line: start,
    end_line: Math.min(end, cached.lines.length),
    total_lines: cached.lines.length,
    content: lines.join('\n'),
    lines
  });
});

// ═══ POST /api/ai-query ═══
// Keyword-based code search with structured QC response format
const STOP_WORDS = new Set([
  'what', 'is', 'the', 'for', 'a', 'an', 'in', 'of', 'to', 'and', 'or',
  'are', 'can', 'how', 'do', 'does', 'did', 'will', 'would', 'should',
  'could', 'be', 'been', 'being', 'have', 'has', 'had', 'not', 'no',
  'but', 'if', 'then', 'than', 'that', 'this', 'these', 'those',
  'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'they',
  'them', 'their', 'he', 'she', 'him', 'her', 'who', 'which', 'when',
  'where', 'why', 'with', 'from', 'by', 'on', 'at', 'about', 'per',
  'any', 'all', 'each', 'every', 'some', 'many', 'much', 'more',
  'also', 'very', 'just', 'only', 'well', 'so', 'too', 'up', 'out',
  'tell', 'show', 'find', 'give', 'need', 'want', 'use', 'using',
  'regarding', 'requirement', 'requirements', 'code', 'standard',
  'section', 'paragraph', 'specify', 'specified', 'says', 'say'
]);

function extractKeywords(question) {
  return question
    .toLowerCase()
    .replace(/[^\w\s.-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function detectStandard(question) {
  const q = question.toLowerCase();
  if (q.includes('b31.3') || q.includes('b31 3') || q.includes('piping')) return 'b31.3';
  if (q.includes('section viii') || q.includes('section 8') || q.includes('pressure vessel') || q.includes('bpvc')) return 'section-viii';
  return 'all';
}

router.post('/ai-query', (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question field required' });
  }

  const keywords = extractKeywords(question);
  if (keywords.length === 0) {
    return res.json({
      answer: {
        governing_code: 'Unable to determine',
        references: [],
        technical_requirement: 'No matching keywords found. Try rephrasing with specific code terms (e.g., "preheat", "radiography", "PWHT", "hydrostatic test").',
        limitations: 'No keywords extracted from query',
        disclaimer: 'AI findings require qualified human review per applicable code requirements.'
      },
      raw_matches: [],
      keywords
    });
  }

  const detectedStandard = detectStandard(question);
  const contextLines = 5;

  // Score each line by how many keywords match
  const scored = [];

  for (const [filePath, file] of fileCache) {
    if (detectedStandard !== 'all' && file.standard !== detectedStandard) continue;

    const { lines, standard, relativePath } = file;
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if (lineLower.trim().length < 5) continue; // skip blank/short lines

      let matchCount = 0;
      const matchedKeywords = [];
      for (const kw of keywords) {
        if (lineLower.includes(kw)) {
          matchCount++;
          matchedKeywords.push(kw);
        }
      }

      if (matchCount >= Math.max(1, Math.floor(keywords.length * 0.3))) {
        const start = Math.max(0, i - contextLines);
        const end = Math.min(lines.length - 1, i + contextLines);
        const context = lines.slice(start, end + 1).join('\n');

        scored.push({
          score: matchCount,
          matchedKeywords,
          file: relativePath,
          standard,
          standard_name: getStandardName(standard),
          edition: getStandardEdition(standard),
          line_number: i + 1,
          match_line: lines[i].trim(),
          context,
          context_start: start + 1,
          context_end: end + 1
        });
      }
    }
  }

  // Sort by score descending, take top 5
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5);

  // Build structured answer
  const governingCode = top.length > 0
    ? top[0].standard_name + (top[0].edition ? ` (${top[0].edition})` : '')
    : 'No matching code found';

  const references = top.map(m => ({
    standard: m.standard_name,
    file: m.file,
    line: m.line_number,
    excerpt: m.match_line,
    context: m.context,
    keywords_matched: m.matchedKeywords,
    score: m.score
  }));

  const technicalRequirement = top.length > 0
    ? top[0].match_line
    : 'No matching requirements found for the given query.';

  const limitations = [];
  if (detectedStandard === 'all') limitations.push('Searched all available standards — results may span multiple codes');
  if (keywords.length <= 2) limitations.push('Few keywords extracted — results may be broad');
  if (top.length === 0) limitations.push('No matches found — try different terminology');
  if (top.length > 0 && top[0].score < keywords.length) limitations.push(`Best match covered ${top[0].score}/${keywords.length} keywords`);

  res.json({
    answer: {
      governing_code: governingCode,
      references,
      technical_requirement: technicalRequirement,
      limitations: limitations.join('; ') || 'None',
      disclaimer: 'AI findings require qualified human review per applicable code requirements.'
    },
    raw_matches: top,
    keywords,
    detected_standard: detectedStandard,
    total_matches: scored.length
  });
});

export default router;
