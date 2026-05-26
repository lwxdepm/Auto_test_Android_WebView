import fs from 'node:fs'
import path from 'node:path'

export interface CaseMeta {
  caseId: string
  module: string
  subFunction: string
  difficulty: string
  priority: string
  steps: string
  expected: string
  automationSuggestion: string
  remark: string
}

let cache: Map<string, CaseMeta> | null = null

const headers = [
  '测试用例ID',
  '功能模块',
  '子功能',
  '难度',
  '优先级',
  '测试步骤/描述',
  '预期结果',
  '自动化建议',
  '前置条件/备注',
]

function parseCsv(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    const next = content[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell)
      cell = ''
      continue
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++
      row.push(cell)
      if (row.some((v) => v !== '')) rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += ch
  }

  row.push(cell)
  if (row.some((v) => v !== '')) rows.push(row)
  return rows
}

export function loadCaseManifest(): Map<string, CaseMeta> {
  if (cache) return cache
  const csvPaths = [
    path.resolve(process.cwd(), 'testcases', 'webview-h5-test-cases.csv'),
    // 完整业务闭环集合包含 CX-BIZ-*，也可覆盖/补齐基础用例元信息。
    path.resolve(process.cwd(), 'testcases', 'cx-agent-complete-business-automation-cases.csv'),
  ]
  const map = new Map<string, CaseMeta>()

  const existingCsvPaths = csvPaths.filter((csvPath) => fs.existsSync(csvPath))
  if (existingCsvPaths.length === 0) {
    cache = map
    return map
  }

  for (const csvPath of existingCsvPaths) {
    const raw = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '')
    const rows = parseCsv(raw)
    const header = rows[0] ?? []
    const indexOf = (name: string, aliases: string[] = []) => {
      for (const candidate of [name, ...aliases]) {
        const idx = header.indexOf(candidate)
        if (idx >= 0) return idx
      }
      return headers.indexOf(name)
    }

    for (const row of rows.slice(1)) {
      const caseId = row[indexOf('测试用例ID')]?.trim()
      if (!caseId || !/^CX-/.test(caseId)) continue
      // 保留原 webview-h5-test-cases.csv 中已有用例的报告元数据；
      // 完整业务闭环 CSV 主要用于补齐新增 CX-BIZ-*，避免影响既有用例报告口径。
      if (map.has(caseId)) continue
      map.set(caseId, {
        caseId,
        module: row[indexOf('功能模块')] ?? '',
        subFunction: row[indexOf('子功能', ['子功能/闭环'])] ?? '',
        difficulty: row[indexOf('难度')] ?? '',
        priority: row[indexOf('优先级')] ?? '',
        steps: row[indexOf('测试步骤/描述')] ?? '',
        expected: row[indexOf('预期结果')] ?? '',
        automationSuggestion: row[indexOf('自动化建议', ['自动化类型'])] ?? '',
        remark: row[indexOf('前置条件/备注')] ?? '',
      })
    }
  }

  cache = map
  return map
}

export function getCaseMeta(caseId: string): CaseMeta | undefined {
  return loadCaseManifest().get(caseId)
}
