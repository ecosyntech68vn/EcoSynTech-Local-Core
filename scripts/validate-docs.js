const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const FILES = [
  'ARCHITECTURE.md',
  'EXECUTIVE_SUMMARY.md',
  'ISO_27001_2022_GAP_ANALYSIS.md',
  'SOP_INDEX.md',
  'docs/audit/e2e_evidence.md',
  'DOCS_GUIDE.md',
  'RELEASE_NOTES.md',
  'CHANGELOG.md'
]

function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch (e) {
    return null
  }
}

function checkFile(name, text) {
  if (!text) return { ok: false, note: 'missing' }
  const low = text.toLowerCase()
  switch (name) {
    case 'ARCHITECTURE.md': {
      const hasLite = low.includes('lite')
      const hasPro = low.includes('pro')
      const hasVersion = low.includes('version')
      return { ok: hasLite && hasPro && hasVersion, note: hasLite ? (hasPro ? 'ok' : 'missing pro') : 'missing lite' }
    }
    case 'EXECUTIVE_SUMMARY.md':
    case 'ISO_27001_2022_GAP_ANALYSIS.md':
    case 'docs/audit/e2e_evidence.md': {
      const hasLast = low.includes('last updated') || low.includes('updated')
      return { ok: hasLast, note: 'missing last updated' }
    }
    case 'SOP_INDEX.md': {
      const hasDanh = low.includes('danh muc sop')
      const hasDocsGuide = text.includes('DOCS_GUIDE.md')
      return { ok: hasDanh && hasDocsGuide, note: hasDanh ? (hasDocsGuide ? 'ok' : 'missing docs-guide') : 'missing danh muc sop' }
    }
    case 'DOCS_GUIDE.md':
    case 'RELEASE_NOTES.md':
    case 'CHANGELOG.md': {
      return { ok: text.length > 0, note: 'present' }
    }
    default:
      return { ok: false, note: 'unknown' }
  }
}

let allOk = true
let logs = []

for (const fname of FILES) {
  const full = path.join(repoRoot, fname)
  const text = readFile(full)
  const res = checkFile(fname, text)
  logs.push(`${fname}: ${res.ok ? 'OK' : 'MISS'} (${res.note})`)
  if (!res.ok) allOk = false
}

if (!allOk) {
  console.error('Docs validation failed:')
  for (const line of logs) console.error(' - ' + line)
  process.exit(1)
}
console.log('Docs validation passed.')
process.exit(0)
