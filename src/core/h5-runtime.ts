import assert from 'node:assert/strict'
import { browser } from '@wdio/globals'
import { WebViewContext } from './webview-context.js'

export class H5Runtime {
  static async execute<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T> {
    if (!(await WebViewContext.isInWebView())) {
      await WebViewContext.switchToWebView()
    }
    return browser.execute(fn, ...args) as Promise<T>
  }

  static async getCurrentUrl(): Promise<string> {
    return this.execute(() => window.location.href)
  }

  static async getPathname(): Promise<string> {
    return this.execute(() => window.location.pathname)
  }

  static async goto(pathOrUrl: string): Promise<void> {
    await this.execute((target) => {
      window.location.assign(target)
    }, pathOrUrl)
  }

  static async replace(pathOrUrl: string): Promise<void> {
    await this.execute((target) => {
      window.location.replace(target)
    }, pathOrUrl)
  }

  static async reload(): Promise<void> {
    await this.execute(() => window.location.reload())
  }

  static async getBodyText(): Promise<string> {
    return this.execute(() => document.body?.innerText || '')
  }

  static async getHtml(): Promise<string> {
    return this.execute(() => document.documentElement?.outerHTML || '')
  }

  static async getViewportInfo() {
    return this.execute(() => {
      const rootStyle = getComputedStyle(document.documentElement)
      return {
        href: window.location.href,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        bodyTextLength: document.body?.innerText?.trim().length || 0,
        appHeight: rootStyle.getPropertyValue('--app-height').trim(),
        keyboardOffset: rootStyle.getPropertyValue('--keyboard-offset').trim(),
      }
    })
  }

  static async setLocalStorage(key: string, value: string): Promise<void> {
    await this.execute((k, v) => localStorage.setItem(k, v), key, value)
  }

  static async removeLocalStorage(key: string): Promise<void> {
    await this.execute((k) => localStorage.removeItem(k), key)
  }

  static async getLocalStorage(key: string): Promise<string | null> {
    return this.execute((k) => localStorage.getItem(k), key)
  }

  static async getCurrentTokenPhone(): Promise<string | null> {
    return this.execute(() => {
      const token = localStorage.getItem('cx-token')
      if (!token) return null
      try {
        const payload = token.split('.')[1]
        if (!payload) return null
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
        const decoded = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')))
        return typeof decoded.phone === 'string' ? decoded.phone : null
      } catch {
        return null
      }
    })
  }

  static async dumpLocalStorage(): Promise<Record<string, string>> {
    return this.execute(() => {
      const result: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) result[key] = localStorage.getItem(key) || ''
      }
      return result
    })
  }

  static async clearLoginStorage(): Promise<void> {
    await this.execute(() => {
      localStorage.removeItem('cx-token')
      localStorage.removeItem('cx-consents')
      localStorage.removeItem('cx-needs-profile')
      localStorage.removeItem('cx-require-complete-profile')
    })
  }

  static async expectLocalStorageMissing(key: string): Promise<void> {
    const value = await this.getLocalStorage(key)
    assert.equal(value, null, `期望 localStorage.${key} 不存在，实际=${value}`)
  }

  static async expectNotBlank(minTextLength = 1): Promise<void> {
    const info = await this.getViewportInfo()
    assert.ok(info.clientHeight > 200 || info.innerHeight > 200, `页面高度异常：${JSON.stringify(info)}`)
    assert.ok(info.bodyTextLength >= minTextLength, `页面疑似白屏：${JSON.stringify(info)}`)
  }
}
