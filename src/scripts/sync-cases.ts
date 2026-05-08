import fs from 'node:fs'
import path from 'node:path'
import { loadCaseManifest } from '../config/case-manifest.js'

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.isFile() && full.endsWith('.ts')) out.push(full)
  }
  return out
}

const manifest = loadCaseManifest()
const specsDir = path.resolve(process.cwd(), 'src')
const implemented = new Set<string>()
const regex = /itCase\(\s*['"](CX-[A-Z0-9-]+)['"]/g

for (const file of walk(specsDir)) {
  const content = fs.readFileSync(file, 'utf8')
  let match: RegExpExecArray | null
  while ((match = regex.exec(content))) {
    implemented.add(match[1])
  }
}

const all = [...manifest.keys()].sort()
const implementedKnown = [...implemented].filter((id) => manifest.has(id)).sort()
const implementedUnknown = [...implemented].filter((id) => !manifest.has(id)).sort()
const notImplemented = all.filter((id) => !implemented.has(id))
const webviewBase = all.filter((id) => id.startsWith('CX-WV-BASE-'))
const compat = all.filter((id) => id.startsWith('CX-WV-COMPAT-'))

const result = {
  source: 'testcases/webview-h5-test-cases.csv',
  csvTotal: all.length,
  implemented: implementedKnown.length,
  implementedUnknown,
  notImplemented: notImplemented.length,
  webviewBaseTotal: webviewBase.length,
  webviewBaseImplemented: webviewBase.filter((id) => implemented.has(id)).length,
  webviewCompatTotal: compat.length,
  webviewCompatImplemented: compat.filter((id) => implemented.has(id)).length,
  implementedCases: implementedKnown,
  notImplementedCases: notImplemented,
}

const outputs = [path.resolve(process.cwd(), 'reports', 'case-coverage.json')]
if (process.env.TEST_RUN_DIR) {
  outputs.unshift(path.join(process.env.TEST_RUN_DIR, 'case-coverage.json'))
}

for (const output of outputs) {
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, JSON.stringify(result, null, 2))
}

console.log(JSON.stringify({
  csvTotal: result.csvTotal,
  implemented: result.implemented,
  notImplemented: result.notImplemented,
  webviewBase: `${result.webviewBaseImplemented}/${result.webviewBaseTotal}`,
  webviewCompat: `${result.webviewCompatImplemented}/${result.webviewCompatTotal}`,
  outputs,
}, null, 2))
