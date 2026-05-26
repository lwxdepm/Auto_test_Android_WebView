export interface ChatReadyState {
  href: string
  pathname: string
  title: string
  bodyText: string
  bodyTextLength: number
  hasRoot: boolean
  hasMenuButton: boolean
  hasNewChatButton: boolean
  hasInput: boolean
  hasWelcome: boolean
}

function isChatRoute(pathname: string): boolean {
  return pathname === '/chat' || pathname.startsWith('/chat/')
}

/**
 * Chat 页“已加载”的判定不要依赖单一文案。
 *
 * 2026-05-14 的 smoke-core 失败证明：页面已经进入 /chat，核心控件和欢迎语都已渲染，
 * 但“橙欣健康”只存在于 <title>，不在 body.innerText，旧判断会误报失败。
 *
 * 更稳的标准：
 * - 路由必须是 /chat 或 /chat/:sessionId；
 * - 输入框必须已出现；
 * - 顶部至少有对话记录按钮；
 * - 新对话按钮、欢迎语、或其它正文内容至少出现一个，避免把空壳/白屏误判为 ready。
 */
export function isChatPageReady(state: ChatReadyState): boolean {
  if (!isChatRoute(state.pathname)) return false
  if (!state.hasRoot) return false
  if (!state.hasInput) return false
  if (!state.hasMenuButton) return false
  return state.hasNewChatButton || state.hasWelcome || state.bodyTextLength > 0
}

export function describeChatReadyState(state: ChatReadyState | null | undefined): string {
  if (!state) return '未采集到 Chat 页面状态'
  const preview = state.bodyText.replace(/\s+/g, ' ').trim().slice(0, 160)
  return [
    `href=${state.href || '<empty>'}`,
    `pathname=${state.pathname || '<empty>'}`,
    `title=${state.title || '<empty>'}`,
    `bodyTextLength=${state.bodyTextLength}`,
    `hasRoot=${state.hasRoot}`,
    `hasMenuButton=${state.hasMenuButton}`,
    `hasNewChatButton=${state.hasNewChatButton}`,
    `hasInput=${state.hasInput}`,
    `hasWelcome=${state.hasWelcome}`,
    `bodyPreview=${preview || '<empty>'}`,
  ].join('；')
}
