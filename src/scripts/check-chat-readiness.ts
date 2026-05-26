import assert from 'node:assert/strict'
import { describeChatReadyState, isChatPageReady, type ChatReadyState } from '../pages/chat-readiness.js'

function state(overrides: Partial<ChatReadyState> = {}): ChatReadyState {
  return {
    href: 'https://dev-cx.senzco.com/chat',
    pathname: '/chat',
    title: '橙欣健康',
    bodyText: '',
    bodyTextLength: 0,
    hasRoot: true,
    hasMenuButton: false,
    hasNewChatButton: false,
    hasInput: false,
    hasWelcome: false,
    ...overrides,
  }
}

assert.equal(
  isChatPageReady(state({
    // 复现 2026-05-14 smoke-core 误判：App 名只在 <title>，不在 body.innerText。
    bodyText: '你好，我是橙小欣\n今天感觉怎么样，可以说说吗？',
    bodyTextLength: 28,
    hasMenuButton: true,
    hasNewChatButton: true,
    hasInput: true,
    hasWelcome: true,
  })),
  true,
  '已进入 /chat 且核心控件/欢迎语出现时，即使 body 不包含“橙欣健康”，也应判定 Chat 已加载',
)

assert.equal(
  isChatPageReady(state({
    href: 'https://dev-cx.senzco.com/chat/session-123',
    pathname: '/chat/session-123',
    bodyText: '用户历史消息\n内容由AI生成仅供参考',
    bodyTextLength: 18,
    hasMenuButton: true,
    hasNewChatButton: true,
    hasInput: true,
  })),
  true,
  '历史会话路由 /chat/:id 只要核心控件出现，也应判定 Chat 已加载',
)

assert.equal(
  isChatPageReady(state({
    href: 'https://dev-cx.senzco.com/login',
    pathname: '/login',
    bodyText: '登录',
    bodyTextLength: 2,
    hasMenuButton: true,
    hasNewChatButton: true,
    hasInput: true,
  })),
  false,
  '即使存在相似控件，不在 /chat 路由也不能判定 Chat 已加载',
)

const diagnostic = describeChatReadyState(state({
  pathname: '/chat',
  bodyText: '你好，我是橙小欣',
  bodyTextLength: 8,
  hasMenuButton: true,
  hasInput: false,
}))

assert.match(diagnostic, /pathname=\/chat/)
assert.match(diagnostic, /hasInput=false/)
assert.match(diagnostic, /你好，我是橙小欣/)

console.log('chat readiness checks passed')
