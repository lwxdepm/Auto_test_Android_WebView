import { browser } from '@wdio/globals'
import { env } from '../config/env.js'

export class WebViewContext {
  static async getContextsSnapshot(): Promise<{ currentContext: string | null; contexts: string[] }> {
    let currentContext: string | null = null
    let contexts: string[] = []
    try {
      currentContext = String(await (browser as any).getContext())
    } catch {
      currentContext = null
    }
    try {
      contexts = (await (browser as any).getContexts()).map((ctx: unknown) => String(ctx))
    } catch {
      contexts = []
    }
    return { currentContext, contexts }
  }

  static async waitForWebView(timeoutMs = env.webviewContextTimeoutMs): Promise<string> {
    const pattern = env.webviewContextPattern
    let latest: string[] = []

    await browser.waitUntil(async () => {
      latest = (await (browser as any).getContexts()).map((ctx: unknown) => String(ctx))
      return latest.some((ctx) => ctx.includes(pattern))
    }, {
      timeout: timeoutMs,
      interval: 500,
      timeoutMsg: `未找到 WebView Context。pattern=${pattern}, latest=${JSON.stringify(latest)}`,
    })

    const contexts: string[] = (await (browser as any).getContexts()).map((ctx: unknown) => String(ctx))
    const webview = contexts.find((ctx: string) => ctx.includes(pattern))
    if (!webview) throw new Error(`未找到 WebView Context。contexts=${JSON.stringify(contexts)}`)
    return webview
  }

  static async switchToWebView(timeoutMs = env.webviewContextTimeoutMs): Promise<string> {
    const deadline = Date.now() + timeoutMs
    let lastError: unknown
    let attempt = 0

    while (Date.now() < deadline) {
      attempt += 1
      try {
        const remaining = Math.max(1000, deadline - Date.now())
        const webview = await this.waitForWebView(Math.min(10000, remaining))
        await (browser as any).switchContext(webview)
        return webview
      } catch (err) {
        lastError = err
        // App 清数据/重启后 Chromedriver 偶发 context POST headers timeout。
        // 尝试切回原生并短暂等待，再重新发现 WebView context。
        await this.switchToNative().catch(() => undefined)
        await browser.pause(Math.min(500 * attempt, 2000))
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown')
    throw new Error(`切换 WebView Context 失败，已重试 ${attempt} 次，last=${message}`)
  }

  static async switchToNative(): Promise<void> {
    await (browser as any).switchContext('NATIVE_APP')
  }

  static async current(): Promise<string | null> {
    try {
      return String(await (browser as any).getContext())
    } catch {
      return null
    }
  }

  static async isInWebView(): Promise<boolean> {
    return (await this.current())?.includes(env.webviewContextPattern) ?? false
  }
}
