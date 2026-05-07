import { browser } from '@wdio/globals'
import { env } from '../config/env.js'
import { WebViewContext } from './webview-context.js'

export class AppController {
  static async launch(): Promise<void> {
    if (env.androidAppPackage) {
      await (browser as any).activateApp(env.androidAppPackage)
    }
  }

  static async terminate(): Promise<void> {
    if (env.androidAppPackage) {
      await (browser as any).terminateApp(env.androidAppPackage)
    }
  }

  static async restart(): Promise<void> {
    await WebViewContext.switchToNative().catch(() => undefined)
    if (env.androidAppPackage) {
      await (browser as any).execute('mobile: shell', {
        command: 'am',
        args: ['force-stop', env.androidAppPackage],
        includeStderr: true,
        timeout: 10000,
      }).catch(async () => {
        await this.terminate().catch(() => undefined)
      })
    } else {
      await this.terminate().catch(() => undefined)
    }
    await browser.pause(1500)
    if (env.androidAppPackage && env.androidAppActivity) {
      const activity = env.androidAppActivity.startsWith('.')
        ? `${env.androidAppPackage}/${env.androidAppActivity}`
        : env.androidAppActivity.includes('/')
          ? env.androidAppActivity
          : `${env.androidAppPackage}/${env.androidAppActivity}`
      await (browser as any).execute('mobile: shell', {
        command: 'am',
        args: ['start', '-W', '-n', activity],
        includeStderr: true,
        timeout: 15000,
      }).catch(async () => {
        await this.launch()
      })
    } else {
      await this.launch()
    }
    await WebViewContext.switchToWebView()
  }

  static async pressBack(): Promise<void> {
    await browser.back()
  }

  static async clearAppData(): Promise<void> {
    if (!env.androidAppPackage) throw new Error('ANDROID_APP_PACKAGE 未配置，无法清理 App 数据')
    await WebViewContext.switchToNative().catch(() => undefined)
    await (browser as any).execute('mobile: shell', {
      command: 'pm',
      args: ['clear', env.androidAppPackage],
      includeStderr: true,
      timeout: 20000,
    })
  }

  static async getDeviceInfo(): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {}
    for (const [key, command, args] of [
      ['model', 'getprop', ['ro.product.model']],
      ['brand', 'getprop', ['ro.product.brand']],
      ['androidVersion', 'getprop', ['ro.build.version.release']],
      ['webviewProvider', 'cmd', ['webviewupdate', 'getCurrentWebViewPackage']],
    ] as const) {
      try {
        result[key] = await (browser as any).execute('mobile: shell', {
          command,
          args,
          includeStderr: true,
          timeout: 10000,
        })
      } catch (err) {
        result[key] = { error: err instanceof Error ? err.message : String(err) }
      }
    }
    return result
  }

  static async collectLogcat(lines = 400): Promise<string> {
    try {
      const logs = await (browser as any).getLogs('logcat')
      return JSON.stringify(logs.slice(-lines), null, 2)
    } catch (err) {
      try {
        const out = await (browser as any).execute('mobile: shell', {
          command: 'logcat',
          args: ['-d', '-t', String(lines)],
          includeStderr: true,
          timeout: 15000,
        })
        return typeof out === 'string' ? out : JSON.stringify(out, null, 2)
      } catch (inner) {
        return `logcat collect failed: ${err instanceof Error ? err.message : String(err)}\nmobile:shell failed: ${inner instanceof Error ? inner.message : String(inner)}`
      }
    }
  }
}
