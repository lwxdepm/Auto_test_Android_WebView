import assert from 'node:assert/strict'
import { $, browser } from '@wdio/globals'
import { H5Runtime } from '../core/h5-runtime.js'
import { selectors } from '../core/selectors.js'
import { MaterialsPage } from './MaterialsPage.js'
import { MedicalRecordsPage } from './MedicalRecordsPage.js'

export class BusinessWidgetsPage {
  static async waitForBodyIncludes(texts: string[], timeout = 120000, message?: string): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return texts.every((text) => body.includes(text))
    }, {
      timeout,
      interval: 1000,
      timeoutMsg: message || `页面未在 ${timeout}ms 内出现全部文案：${texts.join(' / ')}`,
    })
  }

  static async waitForAnyBodyIncludes(texts: string[], timeout = 120000, message?: string): Promise<string> {
    let matched = ''
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      matched = texts.find((text) => body.includes(text)) || ''
      return Boolean(matched)
    }, {
      timeout,
      interval: 1000,
      timeoutMsg: message || `页面未在 ${timeout}ms 内出现任一文案：${texts.join(' / ')}`,
    })
    return matched
  }

  static async scrollToText(text: string): Promise<void> {
    await H5Runtime.execute((targetText) => {
      const candidates = Array.from(document.querySelectorAll('button, div, span, textarea, input')) as HTMLElement[]
      const el = candidates.find((node) => (node.textContent || '').includes(targetText))
      el?.scrollIntoView({ block: 'center', inline: 'nearest' })
    }, text).catch(() => undefined)
  }

  static async clickButtonByExactText(text: string, timeout = 15000): Promise<void> {
    await this.scrollToText(text)
    const btn = selectors.exactText(text, 'button')
    await btn.waitForClickable({ timeout })
    await btn.click()
  }

  static async clickButtonByContainsText(text: string, timeout = 15000): Promise<void> {
    await this.scrollToText(text)
    const btn = selectors.containsText(text, 'button')
    await btn.waitForClickable({ timeout })
    await btn.click()
  }

  static async waitForGenerationIdle(timeout = 120000): Promise<void> {
    await browser.waitUntil(async () => {
      const stopVisible = await $('button[title="停止生成"], button[aria-label="停止生成"]').isDisplayed().catch(() => false)
      return !stopVisible
    }, { timeout, interval: 500, timeoutMsg: 'AI 生成未在预期时间内结束' })
  }

  static async waitForCommunicationCard(timeout = 150000): Promise<void> {
    await this.waitForBodyIncludes(
      ['就诊目标', '我的情况', '特别说明', '我的问题'],
      timeout,
      '未等到聊天内医患沟通卡片。请确认当前模型/Agent 会按请求调用 generate_communication_card。',
    )
    await this.waitForAnyBodyIncludes(['保存到我的材料', '已保存到我的材料'], 15000)
  }

  static async saveCommunicationCardAndOpenMaterials(): Promise<void> {
    const alreadySaved = (await H5Runtime.getBodyText()).includes('已保存到我的材料')
    if (!alreadySaved) {
      await this.clickButtonByExactText('保存到我的材料')
      await this.waitForBodyIncludes(['已保存到我的材料'], 30000, '保存沟通卡后未显示“已保存到我的材料”')
    }
    await this.clickButtonByExactText('查看材料')
    await MaterialsPage.waitForLoaded()
    await MaterialsPage.selectTab('我的沟通卡')
    assert.equal(await MaterialsPage.hasCommunicationCards(), true, '保存沟通卡后，我的材料里未出现沟通卡列表')
    await MaterialsPage.openFirstCommunicationCard()
    await this.waitForBodyIncludes(['就诊目标', '我的情况', '特别说明', '我的问题'], 15000, '沟通卡详情未展示完整字段')
  }

  static async waitForInterventionCard(timeout = 150000): Promise<void> {
    await this.waitForAnyBodyIncludes(['开始跟练', '继续跟练', '再跟练一次'], timeout, '未等到聊天内干预跟练卡入口。请确认当前模型/Agent 会按症状调用 show_intervention_material。')
    await this.waitForAnyBodyIncludes(['总时长', '当前进度'], 15000)
    await this.waitForAnyBodyIncludes(['保存到我的材料', '已保存'], 15000)
  }

  static async saveInterventionCardAndOpenMaterials(): Promise<void> {
    const body = await H5Runtime.getBodyText()
    if (!body.includes('已保存')) {
      await this.clickButtonByExactText('保存到我的材料')
      await this.waitForAnyBodyIncludes(['已保存'], 30000, '保存干预跟练卡后未显示“已保存”')
    }
    await H5Runtime.goto('/materials')
    await MaterialsPage.waitForLoaded()
    await MaterialsPage.selectTab('我的跟练卡')
    assert.equal(await MaterialsPage.hasPracticeCards(), true, '保存干预卡后，我的材料里未出现跟练卡列表')
    await MaterialsPage.openFirstPracticeCard()
    await this.waitForAnyBodyIncludes(['开始跟练', '继续跟练', '再跟练一次', '仅原会话内可跟练'], 15000, '跟练卡详情未展示跟练入口')
  }

  static async waitForApprovalCard(timeout = 150000): Promise<void> {
    await this.waitForBodyIncludes(
      ['确认更新', '当前', '更新为', '拒绝', '同意'],
      timeout,
      '未等到结构化档案更新审批卡。请确认当前模型/Agent 会按用户表述调用 update_structured_profile。',
    )
  }

  static async approveProfileUpdate(): Promise<void> {
    await this.clickButtonByExactText('同意')
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return !body.includes('更新中...') && !body.includes('确认更新档案')
    }, { timeout: 30000, interval: 500, timeoutMsg: '点击审批同意后，审批卡未消失或仍在更新中' })
  }

  static async ensureHealthConsentAccepted(): Promise<void> {
    await H5Runtime.goto('/medical-records')
    const state = await MedicalRecordsPage.waitForConsentOrLoaded()
    if (state === 'consent') await MedicalRecordsPage.acceptHealthConsent()
    await MedicalRecordsPage.waitForLoaded()
  }
}
