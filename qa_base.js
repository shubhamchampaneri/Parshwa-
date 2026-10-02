const { chromium } = require('C:/Users/BL0080/.gemini/antigravity/scratch/pixel-perfect-validator/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EVIDENCE_DIR = path.resolve(__dirname, 'qa_evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const resultsMap = new Map();

// Initialize from existing file if present
const resultsFilePath = path.join(EVIDENCE_DIR, 'full_qa_results.json');
if (fs.existsSync(resultsFilePath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(resultsFilePath, 'utf8'));
    if (Array.isArray(existing)) {
      for (const item of existing) {
        if (item && item.id) {
          resultsMap.set(item.id, item);
        }
      }
    }
  } catch (e) {
    console.error('Error loading existing results:', e);
  }
}

function recordResult(id, status, actualResult, evidence, severity = null) {
  const rec = {
    id,
    status,
    actualResult,
    evidence: evidence || 'DOM / Memory inspection',
    severity: status === 'FAIL' ? (severity || 'High') : (status === 'BLOCKED' ? 'Medium' : 'N/A')
  };
  resultsMap.set(id, rec);
  console.log(`[${status}] ${id} | ${actualResult.slice(0, 80)} | ${rec.evidence}`);
  
  // Continuous checkpoint
  const sortedResults = Array.from(resultsMap.values());
  fs.writeFileSync(
    resultsFilePath,
    JSON.stringify(sortedResults, null, 2),
    'utf8'
  );
  return rec;
}

// SHA-256 helper
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

module.exports = {
  EVIDENCE_DIR,
  resultsMap,
  get allResults() { return Array.from(resultsMap.values()); },
  recordResult,
  sha256
};
