# WebView / H5 自动化测试技术栈说明文档

> 项目：Androd_Auto_Test  
> 当前自动化模式：Appium + WebdriverIO + TypeScript + Mocha + Android WebView  
> 核心流程：启动 App → 进入 WebView → 切换到 WEBVIEW context → 使用 CSS / XPath / DOM / localStorage / window.location 操作 H5 页面  
> 生成日期：2026-05-07

---

## 1. 一句话总结

当前这套自动化测试不是传统意义上的“纯原生 App 自动化”，而是：

```text
通过 Appium 启动 Android App，进入 App 内嵌 WebView，
再把自动化上下文从 NATIVE_APP 切换到 WEBVIEW，
最后像测试浏览器网页一样测试 App 内的 H5 页面。
```

也就是说，表面上是在测手机 App，实际大量操作发生在 App 内部的 H5 页面中。

---

## 2. 当前自动化整体链路

完整链路可以理解为：

```text
测试脚本
  ↓
WebdriverIO / Mocha / TypeScript
  ↓
Appium Server
  ↓
UiAutomator2 Driver
  ↓
Android 手机 / 模拟器
  ↓
启动被测 App
  ↓
进入 App 内 WebView
  ↓
切换到 WEBVIEW context
  ↓
通过 CSS / XPath / JS 操作 H5 页面
  ↓
断言结果、生成报告、采集截图和日志
```

当前项目对应的关键文件大致是：

```text
wdio.android.conf.ts                 # WebdriverIO + Appium Android 配置
src/config/env.ts                    # 环境变量读取
src/core/webview-context.ts          # WebView context 查找与切换
src/core/h5-runtime.ts               # H5 JS 执行、localStorage、URL、DOM 操作
src/core/selectors.ts                # CSS / XPath 选择器封装
src/pages/                           # 页面对象
src/flows/                           # 业务流程封装
src/specs/                           # 测试用例入口
src/core/case-runner.ts              # 用例记录、summary 统计
src/core/artifacts.ts                # 失败截图、页面源码、日志采集
```

---

## 3. 技术栈组成

### 3.1 Appium

Appium 是移动端自动化测试框架，负责连接手机、启动 App、操作 App、切换上下文、执行自动化命令。

在当前项目里，Appium 的作用包括：

```text
连接 Android 设备
启动指定 App
管理自动化 session
获取 NATIVE_APP / WEBVIEW context
切换到 WebView
执行点击、输入、截图、获取页面源码等命令
```

当前配置中使用：

```ts
platformName: 'Android'
'appium:automationName': 'UiAutomator2'
```

也就是 Android 端使用 Appium 的 UiAutomator2 驱动。

---

### 3.2 UiAutomator2

UiAutomator2 是 Appium 在 Android 上使用的自动化驱动。

它负责和 Android 系统交互，例如：

```text
安装和启动 Appium 辅助服务
启动 App
控制原生页面
查找原生控件
执行点击、输入、返回等操作
切换 WebView context
执行 mobile: shell 命令
```

当前项目中 Android 专用能力包括：

```text
adb
am force-stop
am start
pm clear
logcat
adb forward
```

这些能力主要集中在：

```text
src/core/app-controller.ts
src/core/pre-run-reset.ts
src/scripts/doctor.ts
```

---

### 3.3 WebdriverIO

WebdriverIO 是测试脚本侧使用的 WebDriver 客户端。

简单理解：

```text
你的 TypeScript 测试代码不是直接操作手机，
而是通过 WebdriverIO 把命令发送给 Appium，
再由 Appium 去操作手机或 WebView。
```

例如当前代码里常见的写法：

```ts
await $('input[placeholder="请输入手机号"]').setValue(phone)
await selectors.exactText('登录', 'button').click()
await browser.execute(() => window.location.href)
await browser.saveScreenshot('screenshot.png')
```

这些都是 WebdriverIO 提供的能力。

---

### 3.4 TypeScript

TypeScript 是当前测试脚本的开发语言。

它相比纯 JavaScript 的好处是：

```text
有类型提示
代码结构更清晰
更适合封装 Page Object、Flow、Config
便于长期维护
```

当前项目中的文件大多是：

```text
.ts
```

例如：

```text
LoginPage.ts
ChatPage.ts
AuthFlow.ts
h5-runtime.ts
webview-context.ts
```

---

### 3.5 Mocha

Mocha 是测试框架，负责组织测试套件和测试用例。

当前项目中使用：

```ts
describe('基础登录', () => {
  itCase('CX-WV-BASE-002', '正确验证码登录成功', async () => {
    // 测试步骤
  })
})
```

其中：

```text
describe    表示测试套件
itCase      是项目自己封装的测试用例函数
```

`itCase` 在 Mocha 的基础上增加了：

```text
用例 ID
用例标题
标签 tags
执行状态记录
失败原因记录
summary.json 生成
失败 artifact 采集
```

---

## 4. WebView 是什么？

WebView 可以理解为 App 里面嵌入的一个“小浏览器”。

一个 App 既可以有原生页面，也可以内嵌 H5 页面。

例如：

```text
Android 原生 App 壳
  └── WebView
        └── H5 页面
              ├── 登录页
              ├── Chat 页面
              ├── 个人资料页
              ├── 材料页
              └── 健康档案页
```

当前项目的大部分自动化测试，其实是在测这个 WebView 里面加载的 H5 页面。

---

## 5. NATIVE_APP context 和 WEBVIEW context

### 5.1 context 是什么？

Appium 中的 context 可以理解为“当前自动化命令作用在哪一层”。

常见有两类：

```text
NATIVE_APP       原生 App 层
WEBVIEW_xxx      WebView / H5 页面层
```

---

### 5.2 NATIVE_APP context

`NATIVE_APP` 是默认上下文。

在这个上下文中，Appium 操作的是原生控件，例如：

```text
Android Button
Android TextView
Android EditText
iOS XCUIElementTypeButton
iOS XCUIElementTypeTextField
```

适合做：

```text
点击原生按钮
处理系统权限弹窗
操作相册、相机
操作 App 原生页面
按返回键
启动/关闭 App
```

---

### 5.3 WEBVIEW context

`WEBVIEW_xxx` 是 WebView/H5 上下文。

切换到这个上下文后，Appium 不再把页面当成原生控件树，而是当成浏览器网页来操作。

此时可以使用：

```text
CSS selector
XPath
document.querySelector
window.location
localStorage
sessionStorage
fetch
DOM innerText
```

当前项目主要依赖的就是 WEBVIEW context。

---

### 5.4 当前项目中的切换逻辑

当前项目里核心代码在：

```text
src/core/webview-context.ts
```

大致流程：

```ts
const contexts = await browser.getContexts()
const webview = contexts.find(ctx => ctx.includes('WEBVIEW'))
await browser.switchContext(webview)
```

含义是：

```text
1. 获取当前 Appium session 中所有 context
2. 找到名字里包含 WEBVIEW 的 context
3. 切换到 WebView
4. 后续操作都按网页自动化方式执行
```

---

## 6. 为什么要切换到 WEBVIEW context？

因为你的页面主体是 H5。

如果不切到 WebView，Appium 只能看到 WebView 这个原生容器，可能无法直接看到里面的 HTML 元素。

例如登录页面里有：

```html
<input placeholder="请输入手机号" />
<button>登录</button>
```

在 `NATIVE_APP` 中，Appium 可能只能看到一个 WebView 容器。

切到 `WEBVIEW` 后，才可以这样操作：

```ts
await $('input[placeholder="请输入手机号"]').setValue('13300000000')
await selectors.exactText('登录', 'button').click()
```

所以当前自动化的核心前提是：

```text
必须能找到 WEBVIEW context
必须能成功 switchContext 到 WebView
```

---

## 7. CSS Selector 在当前项目中的作用

CSS Selector 是网页自动化中最常用的元素定位方式。

当前项目大量使用类似写法：

```ts
$('input[placeholder="请输入手机号"]')
$('input[placeholder="请输入验证码"]')
$('textarea[placeholder="输入您的问题..."]')
$('button[title="新对话"]')
$('button[aria-label="关闭对话记录"]')
$('#agreement-checkbox')
$('[data-testid="xxx"]')
```

这些选择器的意思是：

| 写法 | 含义 |
|---|---|
| `input[placeholder="请输入手机号"]` | 找 placeholder 为“请输入手机号”的 input |
| `textarea[placeholder="输入您的问题..."]` | 找 Chat 输入框 |
| `button[title="新对话"]` | 找 title 为“新对话”的按钮 |
| `#agreement-checkbox` | 找 id 为 agreement-checkbox 的元素 |
| `[data-testid="xxx"]` | 找 data-testid 为 xxx 的元素 |

---

## 8. XPath 在当前项目中的作用

XPath 也是一种元素定位方式，适合按文本查找元素。

当前项目中封装在：

```text
src/core/selectors.ts
```

例如：

```ts
selectors.exactText('登录', 'button')
selectors.containsText('个人信息', 'button')
selectors.containsText('退出登录', 'button')
```

内部类似：

```ts
//button[normalize-space(.)='登录']
//button[contains(normalize-space(.), '个人信息')]
```

含义是：

```text
找文本刚好等于“登录”的 button
找文本包含“个人信息”的 button
```

XPath 的优点：

```text
按中文文案查找很方便
适合没有 id / data-testid 的按钮
```

XPath 的缺点：

```text
文案变了就会失败
页面结构复杂时性能较差
过度依赖文本会降低稳定性
```

---

## 9. DOM 操作是什么？

DOM 是浏览器中表示页面结构的对象模型。

H5 页面加载后，页面上的元素都会变成 DOM 节点。

例如页面 HTML：

```html
<body>
  <button>登录</button>
  <textarea placeholder="输入您的问题..."></textarea>
</body>
```

在自动化里就可以通过 JS 操作：

```ts
document.body.innerText
document.querySelector('textarea')
document.querySelector('button')
```

当前项目中经常通过 `browser.execute` 执行 JS：

```ts
await browser.execute(() => document.body?.innerText || '')
```

这表示：

```text
在 WebView 页面内部执行 JavaScript，读取当前页面文本。
```

---

## 10. browser.execute 的作用

`browser.execute` 是当前项目非常关键的能力。

它可以让测试脚本把一段 JavaScript 发送到 WebView 里执行。

例如：

```ts
await browser.execute(() => window.location.href)
```

表示读取当前 H5 页面的完整 URL。

```ts
await browser.execute(() => window.location.pathname)
```

表示读取当前路由路径。

```ts
await browser.execute(() => document.body.innerText)
```

表示读取页面上所有可见文本。

```ts
await browser.execute(() => localStorage.getItem('cx-token'))
```

表示读取登录 token。

---

## 11. H5Runtime 是什么？

当前项目把常用 H5 操作封装到了：

```text
src/core/h5-runtime.ts
```

它的作用是：

```text
确保当前在 WebView context
然后执行 H5 页面里的 JavaScript
```

常见能力包括：

```ts
H5Runtime.getCurrentUrl()
H5Runtime.getPathname()
H5Runtime.goto('/login')
H5Runtime.reload()
H5Runtime.getBodyText()
H5Runtime.getHtml()
H5Runtime.setLocalStorage(key, value)
H5Runtime.getLocalStorage(key)
H5Runtime.removeLocalStorage(key)
H5Runtime.clearLoginStorage()
H5Runtime.dumpLocalStorage()
H5Runtime.expectNotBlank()
```

这些方法的本质都是：

```text
在 WebView 中执行 JavaScript，读取或修改 H5 页面状态。
```

---

## 12. localStorage 在当前测试中的作用

`localStorage` 是浏览器/H5 页面本地存储。

当前项目中，它主要用于保存登录态和用户状态。

例如：

```ts
localStorage.getItem('cx-token')
localStorage.removeItem('cx-token')
```

当前项目中常见的 key 包括：

```text
cx-token
cx-consents
cx-needs-profile
cx-require-complete-profile
```

自动化测试会通过 localStorage 做这些事情：

```text
判断是否登录成功
清理登录态
验证 token 是否写入
切换账号时清理旧账号缓存
验证授权状态是否保存
```

例如：

```ts
await H5Runtime.getLocalStorage('cx-token')
await H5Runtime.clearLoginStorage()
await H5Runtime.expectLocalStorageMissing('cx-token')
```

---

## 13. window.location 在当前测试中的作用

`window.location` 表示当前 H5 页面的 URL 和路由。

当前项目中，很多断言不是通过原生页面判断，而是通过 H5 路由判断。

例如：

```ts
await H5Runtime.getPathname()
```

返回可能是：

```text
/login
/chat
/profile
/materials
/medical-records
/account-security
/reading-settings
```

测试中会判断：

```text
登录后是否进入 /chat
未完善资料是否进入 /profile
未登录访问深链是否重定向到 /login
点击材料入口是否进入 /materials
点击健康档案是否进入 /medical-records
```

示例：

```ts
const path = await H5Runtime.getPathname()
assert.equal(path, '/login')
```

---

## 14. fetch 在当前测试中的作用

当前项目中部分测试数据准备和验证，会通过 WebView 中的 `fetch` 调用后端接口。

相关封装在：

```text
src/core/h5-api-client.ts
```

大致逻辑：

```ts
const token = localStorage.getItem('cx-token')
fetch('/api/xxx', {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
```

它的作用包括：

```text
读取当前登录用户相关数据
准备测试数据
创建或修改沟通卡
准备健康档案状态
验证服务端数据是否符合预期
```

优点：

```text
使用当前 WebView 登录态
和前端请求环境一致
不需要测试脚本单独维护 token
```

缺点：

```text
强依赖 WebView 和 localStorage
如果以后变成纯原生 App，这部分需要迁移到 Node 侧 API Client
```

---

## 15. Page Object 在当前项目中的作用

`src/pages` 目录中是页面对象。

页面对象负责把具体页面元素和操作封装起来。

例如：

```text
LoginPage.ts
ChatPage.ts
ProfilePage.ts
MaterialsPage.ts
MedicalRecordsPage.ts
SideDrawerPage.ts
```

以登录页为例，它封装了：

```ts
phoneInput
codeInput
agreementCheckbox
getCodeButton
loginButton
inputPhone()
inputCode()
checkAgreement()
submitLogin()
expectLoginSuccess()
```

这样测试流程中不用到处写选择器，而是调用：

```ts
await LoginPage.inputPhone(phone)
await LoginPage.inputCode(code)
await LoginPage.submitLogin()
```

优点：

```text
减少重复代码
页面元素集中维护
业务流程更清晰
```

---

## 16. Flow 在当前项目中的作用

`src/flows` 目录中是业务流程封装。

页面对象关注“页面怎么操作”，Flow 关注“业务怎么走”。

例如：

```text
AuthFlow.ts
ChatFastFlow.ts
NavigationFlow.ts
ProfileFastFlow.ts
MaterialsFastFlow.ts
MedicalFastFlow.ts
```

以登录流程为例：

```ts
await AuthFlow.loginWithFixedCode(account)
```

内部可能包含：

```text
进入登录页
输入手机号
点击获取验证码
输入固定验证码
勾选协议
点击登录
等待跳转
检查 token
```

这种分层可以让测试用例更简洁。

---

## 17. Spec 在当前项目中的作用

`src/specs` 目录是测试用例入口。

它负责组织测试套件和用例 ID。

例如：

```ts
describe('基础登录', () => {
  itCase('CX-WV-BASE-002', '正确验证码登录成功', async () => {
    await AuthFlow.loginWithFixedCode(account)
  })
})
```

Spec 层应该尽量少写细节，主要表达：

```text
测什么
用例 ID 是什么
调用哪个业务流程
预期是什么
```

---

## 18. 当前自动化流程拆解

以“登录成功”为例，当前流程可以拆解为：

```text
1. WebdriverIO 启动测试
2. Appium 创建 Android session
3. UiAutomator2 启动被测 App
4. WebView 页面加载
5. WebViewContext 查找 WEBVIEW context
6. browser.switchContext(WEBVIEW_xxx)
7. H5Runtime.goto('/login') 进入登录页
8. CSS selector 找到手机号 input
9. 输入手机号
10. 点击获取验证码
11. 输入固定验证码
12. 点击协议 checkbox
13. 点击登录按钮
14. 读取 window.location.pathname
15. 判断是否进入 /chat 或 /profile
16. 读取 localStorage.cx-token
17. 判断 token 是否写入
18. 用例通过，写入 summary
```

---

## 19. 为什么这套方案适合当前项目？

因为当前 App 的主体业务页面是 H5/WebView。

这套方案的优势是：

```text
比原生控件定位更接近前端页面结构
可以直接使用 CSS selector
可以读取 URL 和路由
可以操作 localStorage
可以执行 JS
可以复用大量 Web 自动化经验
适合验证 H5 页面逻辑
适合验证 WebView 容器兼容性
```

例如以下能力在原生 App 自动化中很难直接做到：

```ts
window.location.pathname
localStorage.getItem('cx-token')
document.body.innerText
fetch('/api/xxx')
```

但在 WebView context 下，这些都可以直接执行。

---

## 20. 当前方案的限制

这套方案也有明显限制。

### 20.1 依赖 WebView 可调试

Android App 必须开启：

```java
WebView.setWebContentsDebuggingEnabled(true)
```

否则 Appium 可能找不到 `WEBVIEW_xxx` context。

---

### 20.2 依赖 Chromedriver / WebView 版本匹配

Android WebView 自动化底层通常需要 Chromedriver 与系统 WebView/Chrome 版本匹配。

如果版本不匹配，可能出现：

```text
找不到 WebView
切换 WebView 失败
WebDriver command timeout
元素查找失败
```

当前项目也预留了：

```env
CHROMEDRIVER_EXECUTABLE_DIR=
```

用于手动指定 Chromedriver 目录。

---

### 20.3 对 H5 页面结构敏感

当前用例依赖：

```text
placeholder
title
aria-label
中文按钮文案
DOM 结构
localStorage key
路由路径
```

如果前端改了这些内容，用例可能失败。

---

### 20.4 不适合直接测试原生控件

如果页面变成原生 App 页面，以下能力就不能直接使用：

```text
CSS selector
DOM
localStorage
window.location
fetch('/api')
```

那时需要改成：

```text
accessibility id
原生控件定位
原生页面对象
原生断言方式
```

---

## 21. 当前方案和原生 App 自动化的区别

| 对比项 | 当前 WebView/H5 自动化 | 原生 App 自动化 |
|---|---|---|
| 操作对象 | HTML DOM | Android/iOS 原生控件 |
| 上下文 | WEBVIEW_xxx | NATIVE_APP |
| 定位方式 | CSS / XPath / data-testid | accessibility id / resource-id / predicate |
| 状态判断 | URL / localStorage / DOM text | 原生页面元素 / App 状态 |
| JS 执行 | 可以大量使用 | 基本不能依赖 |
| 页面跳转 | window.location | 原生导航栈 |
| 登录态 | localStorage token | App 内部存储 / Keychain / SharedPreferences |
| 跨平台复用 | H5 页面较容易复用 | Android/iOS 原生差异较大 |

---

## 22. 迁移到 iOS WebView 的关系

当前方案迁移到 iOS WebView 是比较自然的。

因为 iOS 侧如果也是 WebView/H5 页面，那么核心思想不变：

```text
启动 iOS App
找到 WEBVIEW context
切换 WEBVIEW context
用 CSS / XPath / DOM / localStorage / window.location 操作 H5
```

需要变化的是底层驱动：

```text
Android: UiAutomator2
IOS:     XCUITest
```

以及设备控制层：

```text
Android: adb / pm clear / am force-stop / logcat
IOS:     WebDriverAgent / xcrun simctl / terminateApp / activateApp
```

但 H5 页面层的很多代码可以继续复用。

---

## 23. 迁移到原生 App 的关系

如果未来 App 从 WebView/H5 改成原生 App，则当前用例思路可以复用，但 H5 操作层需要重写。

可复用：

```text
用例 ID
测试流程设计
测试账号
测试数据准备思路
报告体系
Mocha/WebdriverIO/Appium 基础框架
部分 Flow 业务编排
```

需要重写：

```text
CSS selector
XPath DOM 查询
H5Runtime
localStorage 判断
window.location 路由判断
fetch in WebView
页面对象 Page Object
```

未来原生 App 推荐使用：

```text
Android content-desc / resource-id
iOS accessibilityIdentifier
Appium accessibility id: $('~login.phoneInput')
```

---

## 24. 当前技术栈的优点

```text
1. 非常适合测试 App 内 H5 页面
2. 可以复用 Web 自动化中的 CSS / XPath / DOM 能力
3. 可以直接验证 H5 路由、localStorage、页面文本
4. Page Object + Flow 分层比较清晰
5. 测试报告和失败 artifact 已有基础
6. 对 iOS WebView 迁移友好
7. 对业务流程自动化覆盖较快
```

---

## 25. 当前技术栈的缺点

```text
1. 强依赖 WebView context 能被识别
2. Android 侧依赖 Chromedriver/WebView 版本匹配
3. 对 H5 DOM 结构和文案变化敏感
4. 对原生 App 页面复用程度有限
5. localStorage/window.location 等能力无法直接迁移到原生 App
6. 图片上传、系统权限、相册、相机等原生场景适配成本较高
```

---

## 26. 建议后续优化方向

### 26.1 增加稳定的 data-testid

建议前端页面尽量加：

```html
<button data-testid="login.submitButton">登录</button>
<input data-testid="login.phoneInput" />
<textarea data-testid="chat.input" />
```

测试中优先使用：

```ts
selectors.byTestId('login.submitButton')
```

少依赖中文文案和复杂 XPath。

---

### 26.2 抽象 Runtime

当前是：

```text
H5Runtime
```

未来可以抽象为：

```text
AppRuntime
  ├── WebViewRuntime
  └── NativeRuntime
```

这样以后如果迁移原生 App，可以减少 Flow 层改动。

---

### 26.3 抽象 Screen/Page 接口

例如登录页可以抽象为：

```text
LoginScreen
  ├── WebViewLoginScreen
  ├── AndroidNativeLoginScreen
  └── IOSNativeLoginScreen
```

业务流程只依赖接口：

```ts
await loginScreen.inputPhone(phone)
await loginScreen.inputCode(code)
await loginScreen.submit()
```

而不是直接依赖 CSS selector。

---

### 26.4 测试数据 API 从 WebView 中独立出来

当前部分测试数据通过 WebView 内 `fetch` 完成。

未来建议逐步迁移到 Node 侧：

```text
src/core/test-api-client.ts
```

这样 WebView、Android 原生、iOS 原生都可以复用测试数据准备逻辑。

---

## 27. 最终总结

当前自动化测试流程的本质是：

```text
Appium 负责启动和连接手机 App，
WebdriverIO 负责发送自动化命令，
UiAutomator2 负责 Android 设备驱动，
WebViewContext 负责切换到 H5 页面，
H5Runtime 负责在 H5 页面中执行 JavaScript，
CSS / XPath 负责定位 HTML 元素，
localStorage / window.location 负责验证登录态和路由状态，
Page Object 和 Flow 负责封装页面操作和业务流程，
Mocha / itCase 负责组织用例和记录结果。
```

可以用一句更简单的话概括：

```text
这是一套“移动 App 壳 + 内嵌 H5 页面”的自动化测试方案。
它用 Appium 进入 App，用 WebView context 把 App 内页面当成网页来测。
```

这套方案非常适合当前 WebView/H5 App，也比较容易迁移到 iOS WebView；但如果未来迁移到纯原生 App，需要重写页面操作层和状态判断层。

