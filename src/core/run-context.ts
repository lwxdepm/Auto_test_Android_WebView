import fs from 'node:fs'
import path from 'node:path'
import { buildEnvironmentReport, collectDeviceInfoFromAdb, readRunnerToolVersions } from './reporting.js'

export interface RunContext {
  runId: string
  projectRoot: string
  runsRoot: string
  runDir: string
  artifactsDir: string
  startedAt: string
}

let context: RunContext | null = null

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function createRunId(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
}

function mkdirp(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

function safeWrite(file: string, content: string) {
  mkdirp(path.dirname(file))
  fs.writeFileSync(file, content)
}

export function ensureRunContext(): RunContext {
  if (context) return context

  const projectRoot = process.cwd()
  const runsRoot = path.resolve(projectRoot, 'reports', 'runs')
  const runId = process.env.TEST_RUN_ID || createRunId()
  const runDir = process.env.TEST_RUN_DIR || path.join(runsRoot, runId)
  const artifactsDir = path.join(runDir, 'artifacts')
  const startedAt = process.env.TEST_RUN_STARTED_AT || new Date().toISOString()

  mkdirp(runDir)
  mkdirp(artifactsDir)
  mkdirp(path.join(runDir, 'junit'))
  mkdirp(path.join(runDir, 'allure-results'))
  mkdirp(path.join(runDir, 'html'))

  process.env.TEST_RUN_ID = runId
  process.env.TEST_RUN_DIR = runDir
  process.env.TEST_RUN_STARTED_AT = startedAt

  safeWrite(path.join(runsRoot, 'latest-run.txt'), `${runId}\n${runDir}\n`)
  safeWrite(path.join(runDir, 'environment.json'), JSON.stringify(buildEnvironmentReport({
    runId,
    startedAt,
    projectRoot,
    toolVersions: readRunnerToolVersions(projectRoot),
    deviceInfo: collectDeviceInfoFromAdb(),
  }), null, 2))

  context = { runId, projectRoot, runsRoot, runDir, artifactsDir, startedAt }
  return context
}
