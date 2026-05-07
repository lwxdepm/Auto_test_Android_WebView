import { itCase } from '../core/case-runner.js'
import { accounts } from '../config/accounts.js'
import { ChatFastFlow } from '../flows/chat-fast.flow.js'

const account = accounts.normal

describe('Chat 与输入框 fast 验证', () => {
  itCase('CX-CHAT-001', '对话页加载', { tags: ['chat', 'p0'] }, async () => {
    await ChatFastFlow.assertChatLoaded(account)
  })

  itCase('CX-CHAT-004', '文字输入发送', { tags: ['chat', 'p0'] }, async () => {
    await ChatFastFlow.assertTextSend(account)
  })

  itCase('CX-CHAT-002', '欢迎建议问题展示', { tags: ['chat', 'p0'] }, async () => {
    await ChatFastFlow.assertWelcomeSuggestions(account)
  })

  itCase('CX-CHAT-003', '点击建议问题发送', { tags: ['chat', 'p0'] }, async () => {
    await ChatFastFlow.assertSuggestionSend(account)
  })

  itCase('CX-CHAT-007', '空消息不可发送', { tags: ['chat', 'input', 'p0'] }, async () => {
    await ChatFastFlow.assertEmptyMessageCannotSend(account)
  })

  itCase('CX-CHAT-010', '新对话回到欢迎态', { tags: ['chat', 'p0'] }, async () => {
    await ChatFastFlow.assertNewChat(account)
  })

  itCase('CX-CHAT-008', '停止生成', { tags: ['chat', 'p0'] }, async () => {
    await ChatFastFlow.assertStopGenerating(account)
  })

  itCase('CX-CHAT-009', '停止后重试', { tags: ['chat', 'p1'] }, async () => {
    await ChatFastFlow.assertStopThenRetry(account)
  })

  itCase('CX-CHAT-011', '消息复制', { tags: ['chat', 'p1'] }, async () => {
    await ChatFastFlow.assertAssistantCopy(account)
  })

  itCase('CX-CHAT-012', '点赞', { tags: ['chat', 'p1'] }, async () => {
    await ChatFastFlow.assertFeedbackLike(account)
  })

  itCase('CX-CHAT-013', '点踩', { tags: ['chat', 'p1'] }, async () => {
    await ChatFastFlow.assertFeedbackDislike(account)
  })

  itCase('CX-CHAT-014', '分享至此', { tags: ['chat', 'p1'] }, async () => {
    await ChatFastFlow.assertShareToHere(account)
  })

  itCase('CX-CHAT-015', '内容免责声明', { tags: ['chat', 'p1'] }, async () => {
    await ChatFastFlow.assertDisclaimer(account)
  })

  itCase('CX-CHAT-016', '长文本限制提示与发送禁用', { tags: ['chat', 'input', 'p1'] }, async () => {
    await ChatFastFlow.assertLongTextLimit(account)
  })

  itCase('CX-CHAT-005', 'Enter 发送', { tags: ['chat', 'input', 'p1'] }, async () => {
    await ChatFastFlow.assertEnterSend(account)
  })

  itCase('CX-CHAT-006', 'Shift+Enter 换行不直接发送', { tags: ['chat', 'input', 'p1'] }, async () => {
    await ChatFastFlow.assertShiftEnterNewline(account)
  })

  itCase('CX-CHAT-017', '历史会话恢复', { tags: ['chat', 'history', 'p1'] }, async () => {
    await ChatFastFlow.assertHistoryRestore(account)
  })

  itCase('CX-CHAT-018', '删除历史会话', { tags: ['chat', 'history', 'p1'] }, async () => {
    await ChatFastFlow.assertDeleteHistorySession(account)
  })

  itCase('CX-CHAT-019', '对话不存在', { tags: ['chat', 'p2'] }, async () => {
    await ChatFastFlow.assertSessionNotFound(account)
  })

  itCase('CX-CHAT-020', '新对话切换不串流', { tags: ['chat', 'p1'] }, async () => {
    await ChatFastFlow.assertNewChatSwitchNoCrossStream(account)
  })

  itCase('CX-CHAT-024', '仅图片消息发送', { tags: ['chat', 'image', 'p1'] }, async () => {
    await ChatFastFlow.assertImageOnlyMessageSend(account)
  })

  itCase('CX-CHAT-025', '加载更早历史消息', { tags: ['chat', 'history', 'slow', 'p1'] }, async () => {
    await ChatFastFlow.assertLoadEarlierHistory(account)
  })

  itCase('CX-CHAT-026', '删除当前会话后回新对话', { tags: ['chat', 'history', 'p1', 'destructive'] }, async () => {
    await ChatFastFlow.assertDeleteCurrentSessionBackToNewChat(account)
  })

  itCase('CX-CHAT-029', '中断后编辑重试', { tags: ['chat', 'p1'] }, async () => {
    await ChatFastFlow.assertEditRetryAfterInterrupt(account)
  })

  itCase('CX-INPUT-001', '输入框默认状态', { tags: ['input', 'p0'] }, async () => {
    await ChatFastFlow.assertInputDefault(account)
  })

  itCase('CX-INPUT-002', '输入文字后按钮切换为发送态', { tags: ['input', 'p0'] }, async () => {
    await ChatFastFlow.assertInputButtonChanges(account)
  })

  itCase('CX-INPUT-003', '发送后清空', { tags: ['input', 'p0'] }, async () => {
    await ChatFastFlow.assertInputClearsAfterSend(account)
  })

  itCase('CX-INPUT-004', '图片选择入口存在', { tags: ['input', 'p0'] }, async () => {
    await ChatFastFlow.assertUploadAndVoiceEntry(account)
  })

  itCase('CX-INPUT-005', '上传图片预览', { tags: ['input', 'p0'] }, async () => {
    await ChatFastFlow.assertImageUploadPreview(account)
  })

  itCase('CX-INPUT-006', '删除图片预览', { tags: ['input', 'image', 'p0'] }, async () => {
    await ChatFastFlow.assertImagePreviewRemoved(account)
  })

  itCase('CX-INPUT-007', '图片消息发送', { tags: ['input', 'image', 'p1'] }, async () => {
    await ChatFastFlow.assertImageMessageSend(account)
  })

  itCase('CX-INPUT-008', '不支持图片格式提示', { tags: ['input', 'image', 'p0'] }, async () => {
    await ChatFastFlow.assertUnsupportedImageFormat(account)
  })

  itCase('CX-INPUT-009', '单图大小限制', { tags: ['input', 'image', 'p1'] }, async () => {
    await ChatFastFlow.assertOversizeImageRejected(account)
  })

  itCase('CX-INPUT-010', '图片数量限制', { tags: ['input', 'image', 'p1'] }, async () => {
    await ChatFastFlow.assertImageCountLimit(account)
  })

  itCase('CX-INPUT-011', '语音按钮/录音入口存在', { tags: ['input', 'p1'] }, async () => {
    await ChatFastFlow.assertUploadAndVoiceEntry(account)
  })

  itCase('CX-INPUT-012', 'WebView 不支持录音提示', { tags: ['input', 'voice', 'conditional', 'p1'] }, async () => {
    await ChatFastFlow.assertVoiceUnsupportedHint(account)
  })

  itCase('CX-INPUT-014', '流式中按钮状态', { tags: ['input', 'chat', 'p0'] }, async () => {
    await ChatFastFlow.assertStreamingInputButtonState(account)
  })
})
