import assert from 'node:assert/strict'
import { $, browser } from '@wdio/globals'
import { selectors } from '../core/selectors.js'
import { H5Runtime } from '../core/h5-runtime.js'

export type FontScale = 'small' | 'medium' | 'large'

const labelByScale: Record<FontScale, string> = {
  small: '小',
  medium: '中',
  large: '大',
}

export class ReadingSettingsPage {
  static get backButton() {
    return $('[aria-label="返回"]')
  }

  static option(scale: FontScale) {
    const label = labelByScale[scale]
    return $(`//div[contains(@class,"reading-font-option") and .//span[normalize-space(.)="${label}"]]`)
  }

  static async waitForLoaded(): Promise<void> {
    await browser.waitUntil(async () => {
      const path = await H5Runtime.getPathname().catch(() => '')
      const body = await H5Runtime.getBodyText().catch(() => '')
      return path === '/reading-settings' && body.includes('阅读设置') && body.includes('字体大小')
    }, { timeout: 15000, interval: 300, timeoutMsg: '阅读设置页未加载' })
  }

  static async select(scale: FontScale): Promise<void> {
    const opt = this.option(scale)
    await opt.waitForDisplayed({ timeout: 10000 })
    await opt.click()
    await browser.waitUntil(async () => (await opt.getAttribute('aria-pressed')) === 'true', {
      timeout: 5000,
      timeoutMsg: `字号 ${scale} 未进入选中态`,
    })
  }

  static async expectSelected(scale: FontScale): Promise<void> {
    const pressed = await this.option(scale).getAttribute('aria-pressed')
    assert.equal(pressed, 'true', `期望字号 ${scale} 选中，实际 aria-pressed=${pressed}`)
  }

  static async expectPersisted(scale: FontScale): Promise<void> {
    const raw = await H5Runtime.getLocalStorage('cx-settings')
    assert.ok(raw, '期望 cx-settings 已写入')
    const parsed = JSON.parse(raw!)
    assert.equal(parsed.chatFontScale, scale, `期望 chatFontScale=${scale}，实际=${raw}`)
  }

  static async back(): Promise<void> {
    await this.backButton.waitForClickable({ timeout: 10000 })
    await this.backButton.click()
  }
}
