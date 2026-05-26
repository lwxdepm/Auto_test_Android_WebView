import fs from 'node:fs/promises'
import path from 'node:path'
import { ensureRunContext } from './run-context.js'
import { ArtifactCollector } from './artifacts.js'
import { getCaseMeta } from '../config/case-manifest.js'
import { env } from '../config/env.js'
import {
  buildRunSummary,
  enrichFailureRecord,
  inferFailureType,
  writeQualitySummaryFile,
  type FailureType,
} from './reporting.js'

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
  failureType?: FailureType
  failureReason?: string
  isBlocking?: boolean
  isFlaky?: boolean
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

async function readExistingCases(file: string): Promise<CaseRecord[]> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function readEnvironment(runDir: string): Promise<Record<string, unknown> | undefined> {
  try {
    return JSON.parse(await fs.readFile(path.join(runDir, 'environment.json'), 'utf8')) as Record<string, unknown>
  } catch {
    return undefined
  }
}

async function flush() {
  const run = ensureRunContext()
  const casesFile = path.join(run.runDir, 'cases.json')
  const existing = await readExistingCases(casesFile)
  const external = existing.filter((r) => r.workerPid !== process.pid)
  const allRecords = [...external, ...records]
    .map((record) => enrichFailureRecord(record))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const runSummary = buildRunSummary(allRecords, {
    runId: run.runId,
    suite: env.testSuiteName,
    startedAt: run.startedAt,
    endedAt: new Date().toISOString(),
    runDir: run.runDir,
    artifactsDir: run.artifactsDir,
  })
  await writeJson(casesFile, allRecords)
  await writeJson(path.join(run.runDir, 'summary.json'), runSummary)
  await writeQualitySummaryFile(run.runDir, runSummary, await readEnvironment(run.runDir))
}

async function finalizeAndFlushRecord(record: CaseRecord, started: number): Promise<void> {
  record.endedAt = new Date().toISOString()
  record.durationMs = Date.now() - started
  records.push(record)
  await flush()
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
    let flushed = false
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
        record.failureType = inferFailureType(record.error)
        record.failureReason = record.error
        record.isBlocking = record.priority?.toUpperCase() === 'P0' || Boolean(record.tags?.some((tag) => tag.toLowerCase() === 'p0'))
        record.isFlaky = record.failureType === 'flaky'
        // 先把失败结果落盘，再采集截图/page-source/logcat。
        // Bridge/native 专项失败时，设备可能停在系统 Photo Picker/权限弹窗等原生页面，
        // 后续 artifact 采集可能因 UiAutomator2 原生树查询超时而卡住。
        // 先 flush 可以保证即使用户 Ctrl+C 中断，summary.json/cases.json 也已经存在。
        await finalizeAndFlushRecord(record, started)
        flushed = true
        await ArtifactCollector.collect(caseId, err)
        throw err
      }
    } finally {
      if (!flushed) {
        await finalizeAndFlushRecord(record, started)
      }
    }

    if (shouldSkip) {
      this.skip()
    }
  })
}
