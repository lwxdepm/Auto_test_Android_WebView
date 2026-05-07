import assert from 'node:assert/strict'
import { $$ } from '@wdio/globals'
import { selectors } from '../core/selectors.js'

export class AgreementModal {
  static title(title: string) {
    return selectors.exactText(title, '*')
  }

  static async expectTitle(title: string): Promise<void> {
    const el = this.title(title)
    await el.waitForDisplayed({ timeout: 10000 })
    assert.ok(await el.isDisplayed(), `期望弹窗标题显示：${title}`)
  }

  static async clickPrimary(label: string): Promise<void> {
    const btn = selectors.containsText(label, 'button')
    await btn.waitForClickable({ timeout: 10000 })
    await btn.click()
  }

  static async close(): Promise<void> {
    const closeBtns = await $$('[aria-label="关闭"]')
    for (const btn of closeBtns) {
      if (await btn.isDisplayed().catch(() => false)) {
        await btn.click()
        return
      }
    }
    throw new Error('未找到可见的关闭按钮')
  }
}
