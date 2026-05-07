import fs from 'node:fs/promises'
import path from 'node:path'
import { browser } from '@wdio/globals'
import { env } from '../config/env.js'
import { ensureRunContext } from './run-context.js'
import { WebViewContext } from './webview-context.js'
import { H5Runtime } from './h5-runtime.js'
import { AppController } from './app-controller.js'

async function mkdirp(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

async function write(file: string, content: string | Buffer) {
  await mkdirp(path.dirname(file))
  await fs.writeFile(file, content)
}

async function writeJson(file: string, value: unknown) {
  await write(file, JSON.stringify(value, null, 2))
}

async function safe(name: string, fn: () => Promise<void>) {
  try {
    await fn()
  } catch (err) {
    // 单个 artifact 采集失败不能掩盖原始测试失败。
    try {
      const run = ensureRunContext()
      await write(path.join(run.runDir, 'artifact-warnings.log'), `[${new Date().toISOString()}] ${name}: ${err instanceof Error ? err.stack || err.message : String(err)}\n`)
    } catch {
      // noop
    }
  }
}

export class ArtifactCollector {
  static caseDir(caseId: string): string {
    const run = ensureRunContext()
    return path.join(run.artifactsDir, caseId.replace(/[^A-Za-z0-9_.-]/g, '_'))
  }

  static async collect(caseId: string, error?: unknown): Promise<void> {
    const dir = this.caseDir(caseId)
    await mkdirp(dir)

    await safe('error', async () => {
      await writeJson(path.join(dir, 'error.json'), {
        message: error instanceof Error ? error.message : String(error ?? ''),
        stack: error instanceof Error ? error.stack : undefined,
      })
    })

    await safe('contexts', async () => {
      await writeJson(path.join(dir, 'contexts.json'), await WebViewContext.getContextsSnapshot())
    })

    await safe('screenshot', async () => {
      await browser.saveScreenshot(path.join(dir, 'screenshot.png'))
    })

    await safe('page-source', async () => {
      await write(path.join(dir, 'page-source.xml'), await browser.getPageSource())
    })

    await safe('h5-state', async () => {
      if (!(await WebViewContext.isInWebView())) {
        await WebViewContext.switchToWebView(5000)
      }
      await write(path.join(dir, 'current-url.txt'), await H5Runtime.getCurrentUrl())
      await write(path.join(dir, 'webview-html.html'), await H5Runtime.getHtml())
      await writeJson(path.join(dir, 'local-storage.json'), await H5Runtime.dumpLocalStorage())
      await writeJson(path.join(dir, 'viewport.json'), await H5Runtime.getViewportInfo())
    })

    await safe('device-info', async () => {
      await writeJson(path.join(dir, 'device-info.json'), await AppController.getDeviceInfo())
    })

    if (env.recordLogcat) {
      await safe('logcat', async () => {
        await write(path.join(dir, 'logcat.txt'), await AppController.collectLogcat())
      })
    }
  }
}
