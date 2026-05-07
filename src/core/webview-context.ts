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
    const webview = await this.waitForWebView(timeoutMs)
    await (browser as any).switchContext(webview)
    return webview
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
