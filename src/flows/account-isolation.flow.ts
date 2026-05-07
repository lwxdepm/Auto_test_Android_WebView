import assert from 'node:assert/strict'
import { browser } from '@wdio/globals'
import { accounts } from '../config/accounts.js'
import type { TestAccount } from '../config/accounts.js'
import { H5ApiClient } from '../core/h5-api-client.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { ChatPage } from '../pages/ChatPage.js'
import { LoginPage } from '../pages/LoginPage.js'
import { MedicalRecordsPage } from '../pages/MedicalRecordsPage.js'
import { SideDrawerPage } from '../pages/SideDrawerPage.js'
import { MedicalFastFlow } from './medical-fast.flow.js'
import { TestDataFlow } from './test-data.flow.js'

interface CreatedSession {
  id: string
  title: string
}

export class AccountIsolationFlow {
  static async assertSwitchAccountCacheIsolation(
    accountA: TestAccount = accounts.normal,
    accountB: TestAccount = accounts.second,
  ): Promise<void> {
    assert.ok(accountA.phone, `${accountA.name} 未配置手机号`)
    assert.ok(accountB.phone, `${accountB.name} 未配置手机号`)
    assert.notEqual(accountA.phone, accountB.phone, '切账号缓存隔离需要两个不同测试账号：TEST_PHONE_A 与 TEST_PHONE_B 不能相同')

    const suffix = Date.now().toString().slice(-6)
    const sessionMarker = `隔离会话${suffix}`
    const medicalMarker = `隔离档案${suffix}`
    let medicalMarkerWritten = false

    try {
      await TestDataFlow.ensureCompletedProfile(accountA)
      await H5Runtime.goto('/chat')
      await ChatPage.waitForLoaded()

      const createdSession = await H5ApiClient.post<CreatedSession>('/sessions', { title: sessionMarker })
      await ChatPage.openDrawer()
      await browser.waitUntil(async () => {
        const body = await H5Runtime.getBodyText().catch(() => '')
        return body.includes(sessionMarker)
      }, { timeout: 15000, interval: 300, timeoutMsg: 'A 账号侧边栏未加载到隔离标记会话' })

      // 远端清理，但不刷新当前抽屉里的 Zustand 缓存，用于验证 logout/setAuth 会清掉旧账号本地会话态。
      await H5ApiClient.delete(`/sessions/${createdSession.id}`).catch(() => undefined)
      await SideDrawerPage.close()

      await MedicalFastFlow.ensureMedicalPageReady(accountA)
      await H5ApiClient.post('/medical', {
        profileData: {
          medications: ['other'],
          medicationCustom: medicalMarker,
        },
      })
      medicalMarkerWritten = true
      await H5Runtime.reload()
      await MedicalRecordsPage.waitForLoaded()
      await browser.waitUntil(async () => {
        const body = await H5Runtime.getBodyText().catch(() => '')
        return body.includes(medicalMarker)
      }, { timeout: 10000, interval: 300, timeoutMsg: 'A 账号健康档案未展示隔离标记' })

      await H5Runtime.goto('/chat')
      await ChatPage.waitForLoaded()
      await ChatPage.openDrawer()
      await SideDrawerPage.logout()
      await LoginPage.waitForLoaded()
      await H5Runtime.expectLocalStorageMissing('cx-token')

      await TestDataFlow.ensureCompletedProfile(accountB)
      await ChatPage.waitForLoaded()
      const tokenPhone = await H5Runtime.getCurrentTokenPhone()
      assert.equal(tokenPhone, accountB.phone, `切换后 token 应属于 B 账号，实际=${tokenPhone}`)

      let body = await H5Runtime.getBodyText()
      assert.ok(!body.includes(sessionMarker), 'B 账号 Chat 首屏不应残留 A 账号会话/消息内容')
      assert.ok(!body.includes(medicalMarker), 'B 账号 Chat 首屏不应残留 A 账号健康档案内容')

      await ChatPage.openDrawer()
      await browser.waitUntil(async () => {
        const drawerBody = await H5Runtime.getBodyText().catch(() => '')
        return drawerBody.includes('对话记录') && !drawerBody.includes('加载中')
      }, { timeout: 15000, interval: 300, timeoutMsg: 'B 账号侧边栏会话列表未加载完成' })
      body = await H5Runtime.getBodyText()
      assert.ok(!body.includes(sessionMarker), 'B 账号侧边栏不应出现 A 账号会话缓存')
      await SideDrawerPage.close()

      await MedicalFastFlow.ensureMedicalPageReady(accountB)
      body = await H5Runtime.getBodyText()
      assert.ok(!body.includes(medicalMarker), 'B 账号健康档案不应出现 A 账号档案缓存')
    } finally {
      if (medicalMarkerWritten) {
        await TestDataFlow.ensureCompletedProfile(accountA).catch(() => undefined)
        await MedicalFastFlow.ensureMedicalPageReady(accountA).catch(() => undefined)
        await H5ApiClient.post('/medical', {
          profileData: {
            medications: ['none'],
            medicationCustom: '',
          },
        }).catch(() => undefined)
      }
    }
  }
}
