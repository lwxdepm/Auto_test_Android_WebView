import fs from 'node:fs/promises'
import path from 'node:path'
import { ensureRunContext } from './run-context.js'
import { ArtifactCollector } from './artifacts.js'
import { getCaseMeta } from '../config/case-manifest.js'
import { env } from '../config/env.js'

export interface CaseRecord {
  caseId: string
  title: string
  module?: string
  subFunction?: string
  priority?: string
  difficulty?: string
  status: 'passed' | 'failed' | 'skipped'
  startedAt: string
  endedAt?: string
  durationMs?: number
  error?: string
  tags?: string[]
  workerPid?: number
}

export class CaseSkippedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CaseSkippedError'
  }
}

/**
 * 用于“需要预置数据/特定账号”的用例：
 * - 用例代码已实现；
 * - 当前账号没有对应前置数据时，记录为 skipped，不污染 failed；
 * - 有前置数据时自动继续执行。
 */
export function skipCase(reason: string): never {
  throw new CaseSkippedError(reason)
}

interface ItCaseOptions {
  tags?: string[]
  workerPid?: number
}

const records: CaseRecord[] = []

async function writeJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(value, null, 2))
}

function summary(allRecords: CaseRecord[]) {
  const run = ensureRunContext()
  const total = allRecords.length
  const passed = allRecords.filter((r) => r.status === 'passed').length
  const failed = allRecords.filter((r) => r.status === 'failed').length
  const skipped = allRecords.filter((r) => r.status === 'skipped').length
  const failedRecords = allRecords.filter((r) => r.status === 'failed')
  const skippedRecords = allRecords.filter((r) => r.status === 'skipped')
  const artifactDirFor = (caseId: string) =>
    path.relative(run.runDir, path.join(run.artifactsDir, caseId.replace(/[^A-Za-z0-9_.-]/g, '_')))
  return {
    runId: run.runId,
    suite: env.testSuiteName,
    startedAt: run.startedAt,
    endedAt: new Date().toISOString(),
    total,
    passed,
    failed,
    skipped,
    failedCases: failedRecords.map((r) => r.caseId),
    failedCaseDetails: failedRecords.map((r) => ({
      caseId: r.caseId,
      title: r.title,
      reason: r.error || '',
      module: r.module,
      subFunction: r.subFunction,
      priority: r.priority,
      tags: r.tags,
      durationMs: r.durationMs,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      artifactDir: artifactDirFor(r.caseId),
    })),
    skippedCases: skippedRecords.map((r) => r.caseId),
    skippedCaseDetails: skippedRecords.map((r) => ({
      caseId: r.caseId,
      title: r.title,
      reason: r.error || '',
      module: r.module,
      subFunction: r.subFunction,
      priority: r.priority,
      tags: r.tags,
      durationMs: r.durationMs,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
    })),
  }
}

async function readExistingCases(file: string): Promise<CaseRecord[]> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function flush() {
  const run = ensureRunContext()
  const casesFile = path.join(run.runDir, 'cases.json')
  const existing = await readExistingCases(casesFile)
  const external = existing.filter((r) => r.workerPid !== process.pid)
  const allRecords = [...external, ...records].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  await writeJson(casesFile, allRecords)
  await writeJson(path.join(run.runDir, 'summary.json'), summary(allRecords))
}

export function itCase(caseId: string, title: string, fn: () => Promise<void>): void
export function itCase(caseId: string, title: string, options: ItCaseOptions, fn: () => Promise<void>): void
export function itCase(caseId: string, title: string, optionsOrFn: ItCaseOptions | (() => Promise<void>), maybeFn?: () => Promise<void>): void {
  const options = typeof optionsOrFn === 'function' ? {} : optionsOrFn
  const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn
  if (!fn) throw new Error(`itCase ${caseId} 缺少执行函数`)

  const meta = getCaseMeta(caseId)
  const fullTitle = `${caseId} ${title}`

  it(fullTitle, async function (this: any) {
    const startedAt = new Date().toISOString()
    const started = Date.now()
    let shouldSkip = false
    const record: CaseRecord = {
      caseId,
      title,
      module: meta?.module,
      subFunction: meta?.subFunction,
      priority: meta?.priority,
      difficulty: meta?.difficulty,
      status: 'passed',
      startedAt,
      tags: options.tags,
      workerPid: process.pid,
    }

    try {
      await fn()
      record.status = 'passed'
    } catch (err) {
      if (err instanceof CaseSkippedError) {
        record.status = 'skipped'
        record.error = err.message
        shouldSkip = true
      } else {
        record.status = 'failed'
        record.error = err instanceof Error ? err.message : String(err)
        await ArtifactCollector.collect(caseId, err)
        throw err
      }
    } finally {
      record.endedAt = new Date().toISOString()
      record.durationMs = Date.now() - started
      records.push(record)
      await flush()
    }

    if (shouldSkip) {
      this.skip()
    }
  })
}
