import { itCase, skipCase } from '../core/case-runner.js'
import { accounts } from '../config/accounts.js'
import { ChatPage } from '../pages/ChatPage.js'
import { SideDrawerPage } from '../pages/SideDrawerPage.js'
import { NavigationFlow } from '../flows/navigation.flow.js'
import { ReadingSettingsFlow } from '../flows/reading-settings.flow.js'

const account = accounts.normal

describe('侧边栏导航与阅读设置 fast 验证', () => {
  itCase('CX-NAV-001', '打开侧边栏', { tags: ['navigation', 'p0'] }, async () => {
    await NavigationFlow.openDrawer(account)
    await SideDrawerPage.close()
  })

  itCase('CX-NAV-002', '关闭侧边栏', { tags: ['navigation', 'p0'] }, async () => {
    await NavigationFlow.closeDrawer(account)
  })

  itCase('CX-NAV-003', '侧边栏进入个人信息', { tags: ['navigation', 'p0'] }, async () => {
    await NavigationFlow.goProfileFromDrawer(account)
  })

  itCase('CX-NAV-004', '侧边栏进入健康档案', { tags: ['navigation', 'p0'] }, async () => {
    await NavigationFlow.goMedicalRecordsFromDrawer(account)
  })

  itCase('CX-NAV-005', '侧边栏进入我的材料', { tags: ['navigation', 'p1'] }, async () => {
    await NavigationFlow.goMaterialsFromDrawer(account)
  })

  itCase('CX-NAV-006', '侧边栏新对话', { tags: ['navigation', 'p0'] }, async () => {
    await NavigationFlow.newChatFromDrawer(account)
  })

  itCase('CX-NAV-007', '侧边栏历史列表展示空态或列表', { tags: ['navigation', 'p1'] }, async () => {
    await NavigationFlow.showHistoryListOrEmpty(account)
  })

  itCase('CX-NAV-008', '侧边栏历史会话加载更多', { tags: ['navigation', 'history', 'p2'] }, async () => {
    await NavigationFlow.assertHistoryLoadMore(account)
  })

  itCase('CX-NAV-010', '侧边栏进入阅读设置', { tags: ['navigation', 'reading', 'p0'] }, async () => {
    await NavigationFlow.goReadingSettingsFromDrawer(account)
  })

  itCase('CX-NAV-011', '资料页返回侧栏中间态', { tags: ['navigation', 'p1'] }, async () => {
    await NavigationFlow.profileReturnToSidebar(account)
    await SideDrawerPage.close()
  })

  itCase('CX-NAV-012', '素材上传台入口可见性', { tags: ['navigation', 'p2'] }, async () => {
    await NavigationFlow.assertMaterialsAdminVisibility(account)
  })

  itCase('CX-NAV-013', '删除会话二次确认可打开并取消', { tags: ['navigation', 'p1', 'conditional'] }, async () => {
    await NavigationFlow.openDrawer(account)
    if (!(await SideDrawerPage.hasDeleteSessionButton())) {
      await ChatPage.closeDrawer().catch(() => undefined)
      skipCase('当前账号无历史会话，无法验证删除会话二次确认')
    }
    await SideDrawerPage.openFirstDeleteSessionConfirm()
    await SideDrawerPage.cancelDeleteSessionConfirm()
    await SideDrawerPage.close().catch(() => undefined)
  })

  itCase('CX-READ-001', '阅读设置页面进入', { tags: ['reading', 'p0'] }, async () => {
    await ReadingSettingsFlow.assertEntry(account)
  })

  itCase('CX-READ-002', '阅读设置三档切换选中态', { tags: ['reading', 'p0'] }, async () => {
    await ReadingSettingsFlow.open(account)
    await ReadingSettingsFlow.assertThreeScaleSwitch()
  })

  itCase('CX-READ-003', '阅读字号持久化', { tags: ['reading', 'p1'] }, async () => {
    await ReadingSettingsFlow.open(account)
    await ReadingSettingsFlow.assertPersistence()
  })

  itCase('CX-READ-004', '聊天与材料字号 CSS 变量生效', { tags: ['reading', 'p1'] }, async () => {
    await ReadingSettingsFlow.assertFontAffectsChatAndMaterials(account)
  })

  itCase('CX-READ-005', '阅读设置返回原会话侧栏', { tags: ['reading', 'p1'] }, async () => {
    await ReadingSettingsFlow.assertBackToSidebar(account)
    await SideDrawerPage.close()
  })

  itCase('CX-WV-COMPAT-003', '系统返回层级：阅读设置返回 Chat 且不白屏', { tags: ['webview', 'compat', 'p0'] }, async () => {
    await NavigationFlow.systemBackFromReadingSettings(account)
  })

  itCase('CX-NAV-009', '侧边栏退出登录', { tags: ['navigation', 'logout', 'p0'] }, async () => {
    await NavigationFlow.logoutFromDrawer(account)
  })
})
