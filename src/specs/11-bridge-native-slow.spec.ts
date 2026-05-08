import { itCase } from '../core/case-runner.js'
import { accounts } from '../config/accounts.js'
import { BridgeNativeFlow } from '../flows/bridge-native.flow.js'

const account = accounts.normal

describe('Android WebView Bridge / 原生化慢速专项', () => {
  itCase('CX-WV-COMPAT-006', '相机拍照 capture：真实原生相机返回 OCR 上传预览', { tags: ['bridge', 'native', 'camera', 'capture', 'slow', 'p1'] }, async () => {
    await BridgeNativeFlow.assertNativeCameraCapture(account)
  })
})
