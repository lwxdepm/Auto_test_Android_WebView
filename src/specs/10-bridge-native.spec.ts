import { itCase } from '../core/case-runner.js'
import { accounts } from '../config/accounts.js'
import { BridgeNativeFlow } from '../flows/bridge-native.flow.js'

const account = accounts.normal

describe('Android WebView Bridge / 原生化专项', () => {
  itCase('CX-WV-COMPAT-005', '相册选择文件：真实原生 file chooser 返回图片预览', { tags: ['bridge', 'native', 'file', 'p0'] }, async () => {
    await BridgeNativeFlow.assertNativeAlbumFileChooser(account)
  })

  itCase('CX-INPUT-017', '麦克风权限拒绝后提示并恢复输入态', { tags: ['bridge', 'native', 'voice', 'permission', 'p2'] }, async () => {
    await BridgeNativeFlow.assertMicrophonePermissionDenied(account)
  })

  itCase('CX-INPUT-013', '麦克风授权后录音开始/停止 UI 状态', { tags: ['bridge', 'native', 'voice', 'p2'] }, async () => {
    await BridgeNativeFlow.assertMicrophoneStartStop(account)
  })

  itCase('CX-WV-COMPAT-010', '复制/长按后输入不被遮挡且页面仍可交互', { tags: ['bridge', 'native-like', 'clipboard', 'input', 'p1'] }, async () => {
    await BridgeNativeFlow.assertCopyThenInputStillInteractive(account)
  })
})
