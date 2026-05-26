import { itCase, skipCase } from '../core/case-runner.js'
import { accounts } from '../config/accounts.js'
import { AuthFlow } from '../flows/auth.flow.js'
import { ChatFastFlow } from '../flows/chat-fast.flow.js'
import { MaterialsFastFlow } from '../flows/materials-fast.flow.js'
import { MedicalFastFlow } from '../flows/medical-fast.flow.js'
import { NavigationFlow } from '../flows/navigation.flow.js'
import { WebViewFlow } from '../flows/webview.flow.js'

const account = accounts.normal
let chatPrecheckFailure: string | null = null

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function skipIfChatPrecheckFailed(): void {
  if (!chatPrecheckFailure) return
  skipCase(`前置登录/Chat 核心加载冒烟未通过，跳过依赖 Chat 的后续用例，避免同一根因级联失败。前置失败：${chatPrecheckFailure}`)
}

/**
 * 真正的 P0 冒烟子集：只验证“能打开、能登录、能进入核心页面、能发起一次对话”。
 *
 * 注意：不要把本文件命名为 *.spec.ts，避免 `test:android:all` 通过 specs glob
 * 重复执行这些已经在模块 spec 中存在的 caseId。本文件只通过 suite `smokeCore` 显式运行。
 */
describe('Android WebView P0 冒烟测试', () => {
  itCase('CX-WV-BASE-001', '冒烟：App 启动后 WebView 可切入且页面非白屏', { tags: ['android', 'smoke-core', 'webview', 'p0'] }, async () => {
    await WebViewFlow.assertStartupNotBlank()
  })

  itCase('CX-WV-BASE-004', '冒烟：登录页基础表单校验可用', { tags: ['android', 'smoke-core', 'login', 'p0'] }, async () => {
    await AuthFlow.assertInvalidPhone()
  })

  itCase('CX-WV-BASE-002', '冒烟：固定验证码账号可登录进入 Chat', { tags: ['android', 'smoke-core', 'login', 'p0'] }, async () => {
    try {
      await AuthFlow.loginExpectChat(account)
      chatPrecheckFailure = null
    } catch (err) {
      chatPrecheckFailure = `CX-WV-BASE-002 ${errorMessage(err)}`
      throw err
    }
  })

  itCase('CX-CHAT-001', '冒烟：Chat 页面核心元素加载', { tags: ['android', 'smoke-core', 'chat', 'p0'] }, async () => {
    skipIfChatPrecheckFailed()
    try {
      await ChatFastFlow.assertChatLoaded(account)
      chatPrecheckFailure = null
    } catch (err) {
      chatPrecheckFailure = `CX-CHAT-001 ${errorMessage(err)}`
      throw err
    }
  })

  itCase('CX-INPUT-001', '冒烟：Chat 输入框默认状态正常', { tags: ['android', 'smoke-core', 'input', 'p0'] }, async () => {
    skipIfChatPrecheckFailed()
    await ChatFastFlow.assertInputDefault(account)
  })

  itCase('CX-CHAT-004', '冒烟：可发送一条普通文字消息', { tags: ['android', 'smoke-core', 'chat', 'p0'] }, async () => {
    skipIfChatPrecheckFailed()
    await ChatFastFlow.assertTextSend(account)
  })

  itCase('CX-NAV-001', '冒烟：侧边栏可打开并展示关键入口', { tags: ['android', 'smoke-core', 'navigation', 'p0'] }, async () => {
    skipIfChatPrecheckFailed()
    await NavigationFlow.closeDrawer(account)
  })

  itCase('CX-MAT-001', '冒烟：我的材料页面可进入并展示列表或空态', { tags: ['android', 'smoke-core', 'materials', 'p1'] }, async () => {
    skipIfChatPrecheckFailed()
    await MaterialsFastFlow.assertEntry(account)
  })

  itCase('CX-MED-001', '冒烟：健康档案页面可进入并展示基础内容', { tags: ['android', 'smoke-core', 'medical', 'p0'] }, async () => {
    skipIfChatPrecheckFailed()
    await MedicalFastFlow.assertMedicalPage(account)
  })

  itCase('CX-WV-COMPAT-002', '冒烟：Chat 输入框不被软键盘明显遮挡', { tags: ['android', 'smoke-core', 'keyboard', 'p0'] }, async () => {
    skipIfChatPrecheckFailed()
    await WebViewFlow.assertKeyboardDoesNotCoverInput(account)
  })
})
