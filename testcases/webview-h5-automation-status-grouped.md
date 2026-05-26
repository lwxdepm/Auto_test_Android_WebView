# WebView H5 自动化用例：按大类分组

本文件按原 `webview-h5-test-cases.xlsx` 的大类顺序分组；CSV 已插入 `📂 大类` 分隔行，并删除 `原始序号` 列。

## 1. 数量概览

| 分组 | 数量 | 文件 |
| --- | ---: | --- |
| ❌ 未实现 | 53 | `webview-h5-automation-not-implemented-only.csv` |
| ✅ 已实现 | 168 | `webview-h5-automation-implemented-only.csv` |

## 2. 按细分状态统计

| 状态 | 数量 |
| --- | ---: |
| 已实现-常规自动化 | 127 |
| 已实现-条件自动化 | 32 |
| 未实现-半自动/建议手动专项 | 25 |
| 未实现-需专用账号/破坏性专项 | 11 |
| 已实现-原生/Bridge专项 | 5 |
| 未实现-慢速/nightly专项 | 4 |
| 已实现-破坏性/需专用账号 | 3 |
| 未实现-需接口辅助 | 3 |
| 未实现-建议接口自动化 | 3 |
| 未实现-需测试钩子 | 2 |
| 未实现-需预置数据 | 2 |
| 已实现-慢速/专项 | 1 |
| 未实现-平台受限/建议手动 | 1 |
| 未实现-需求待定/可手动验证 | 1 |
| 未实现-需专用账号/慢速专项 | 1 |

## ❌ 未实现用例清单

### 一、基础登录与 WebView 容器
| 用例ID | 模块 | 子功能 | 优先级 | 处理类型 | 后续建议 |
| --- | --- | --- | --- | --- | --- |
| CX-WV-BASE-013 | 登录 | 验证码超时（5分钟TTL） | P1 | 需测试钩子 | 需后端/测试环境提供 Redis 清理、验证码过期、版本变更等测试钩子后再补。 |
| CX-WV-BASE-015 | 登录 | 验证码发送限流与倒计时 | P1 | 需接口辅助 | 需增加接口辅助或测试环境开关，再补 UI 自动化验证。 |
| CX-WV-BASE-016 | 登录态 | 冷静期账号登录跳转 | P1 | 需预置数据 | 需预置 Redis/账号状态/服务端开关，再接入自动化。 |

### 二、首次个人信息完善 /profile
| 用例ID | 模块 | 子功能 | 优先级 | 处理类型 | 后续建议 |
| --- | --- | --- | --- | --- | --- |
| CX-PROFILE-017 | 个人信息 | 保存接口失败提示 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |

### 三、对话页基础功能 /chat
| 用例ID | 模块 | 子功能 | 优先级 | 处理类型 | 后续建议 |
| --- | --- | --- | --- | --- | --- |
| CX-CHAT-021 | 对话 | 流式网络中断错误气泡 | P1 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-CHAT-022 | 对话 | WebView流式异常同步降级 | P1 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-CHAT-023 | 对话 | 同步传输模式发送 | P1 | 需预置数据 | 需预置 Redis/账号状态/服务端开关，再接入自动化。 |
| CX-CHAT-027 | 对话 | 上下文压缩提示 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-CHAT-028 | 对话 | 用户限流错误展示 | P1 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |

### 四、输入框、图片、语音
| 用例ID | 模块 | 子功能 | 优先级 | 处理类型 | 后续建议 |
| --- | --- | --- | --- | --- | --- |
| CX-INPUT-015 | 输入框 | 多图总请求体超限 | P1 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-INPUT-016 | 输入框 | 粘贴图片上传 | P1 | 平台受限/建议手动 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-INPUT-018 | 语音 | 录音60秒自动停止 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |

### 六、健康档案授权
| 用例ID | 模块 | 子功能 | 优先级 | 处理类型 | 后续建议 |
| --- | --- | --- | --- | --- | --- |
| CX-CONSENT-005 | 健康授权 | 授权提交失败 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-CONSENT-007 | 健康授权 | 拒绝授权不写健康数据 | P1 | 需接口辅助 | 需增加接口辅助或测试环境开关，再补 UI 自动化验证。 |
| CX-CONSENT-008 | 健康授权 | 授权版本变更重新提示 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-CONSENT-009 | 健康授权 | 审批卡片触发授权 | P1 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-CONSENT-010 | 健康授权 | 审批授权拒绝后提醒 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |

### 七、健康档案页 /medical-records
| 用例ID | 模块 | 子功能 | 优先级 | 处理类型 | 后续建议 |
| --- | --- | --- | --- | --- | --- |
| CX-MED-021 | 病历档案 | 未保存返回提示 | P1/P0 | 需求待定/可手动验证 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-MED-023 | 清空后档案 | 清空后健康档案空态 | P1 | 需专用账号/破坏性专项 | 可补专项自动化，但必须使用专用账号并隔离破坏性数据。 |
| CX-MED-024 | 清空后档案 | 删除后重建结构化档案 | P1 | 需专用账号/破坏性专项 | 可补专项自动化，但必须使用专用账号并隔离破坏性数据。 |
| CX-MED-025 | 清空后档案 | 删除后重新上传文档 | P1 | 需专用账号/慢速专项 | 可补专项自动化，但必须使用专用账号并隔离破坏性数据。 |
| CX-MED-027 | 清空后档案 | 旧文档详情不可再访问 | P1 | 需接口辅助 | 需增加接口辅助或测试环境开关，再补 UI 自动化验证。 |
| CX-MED-028 | 病历档案 | 非法字段后端拒绝 | P2 | 建议接口自动化 | 优先补 API/契约层自动化；UI 只保留入口或错误提示抽样。 |
| CX-MED-032 | 病历档案 | 保存接口限流 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-MED-034 | 病历档案 | 未授权直接保存403 | P2 | 建议接口自动化 | 优先补 API/契约层自动化；UI 只保留入口或错误提示抽样。 |

### 八、病历文档上传 / OCR
| 用例ID | 模块 | 子功能 | 优先级 | 处理类型 | 后续建议 |
| --- | --- | --- | --- | --- | --- |
| CX-OCR-010 | OCR识别 | 正常病历识别 | P1 | 慢速/nightly专项 | 可补 nightly 慢速自动化，不建议进入 P0 fast。 |
| CX-OCR-011 | OCR识别 | 识别后生成文档 | P1 | 慢速/nightly专项 | 可补 nightly 慢速自动化，不建议进入 P0 fast。 |
| CX-OCR-012 | OCR识别 | 非健康图片 | P2 | 慢速/nightly专项 | 可补 nightly 慢速自动化，不建议进入 P0 fast。 |
| CX-OCR-013 | OCR识别 | 网络异常重试 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-OCR-016 | 病历文档 | 删除文档 | P1 | 需专用账号/破坏性专项 | 可补专项自动化，但必须使用专用账号并隔离破坏性数据。 |
| CX-OCR-017 | 病历上传 | 多图总请求体超过10MB | P1 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-OCR-018 | OCR识别 | OCR接口限流 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-OCR-019 | OCR识别 | 失败后重试保留预览 | P1 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-OCR-020 | OCR识别 | 成功后自动填充档案字段 | P1 | 慢速/nightly专项 | 可补 nightly 慢速自动化，不建议进入 P0 fast。 |
| CX-OCR-021 | OCR识别 | 提取性别后字段联动 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-OCR-023 | 病历文档 | 删除后刷新持久消失 | P1 | 需专用账号/破坏性专项 | 可补专项自动化，但必须使用专用账号并隔离破坏性数据。 |
| CX-OCR-025 | 聊天图片保存 | 保存聊天报告图片授权 gate | P1 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-OCR-026 | 聊天图片保存 | 保存任务去重 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |

### 九、我的材料 /materials
| 用例ID | 模块 | 子功能 | 优先级 | 处理类型 | 后续建议 |
| --- | --- | --- | --- | --- | --- |
| CX-MAT-014 | 我的材料 | 跟练素材不可用 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-MAT-015 | 我的材料 | 沟通卡保存失败 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |

### 十、账号与安全
| 用例ID | 模块 | 子功能 | 优先级 | 处理类型 | 后续建议 |
| --- | --- | --- | --- | --- | --- |
| CX-SEC-005 | 清空档案 | 确认清空 | P2 | 需专用账号/破坏性专项 | 可补专项自动化，但必须使用专用账号并隔离破坏性数据。 |
| CX-SEC-008 | 注销账号 | 确认注销 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-SEC-012 | 清空档案 | 验证码超时 | P1 | 需测试钩子 | 需后端/测试环境提供 Redis 清理、验证码过期、版本变更等测试钩子后再补。 |
| CX-SEC-013 | 清空档案 | 验证码一次性 | P1 | 建议接口自动化 | 优先补 API/契约层自动化；UI 只保留入口或错误提示抽样。 |
| CX-SEC-014 | 清空档案 | 清空成功确认页 | P1 | 需专用账号/破坏性专项 | 可补专项自动化，但必须使用专用账号并隔离破坏性数据。 |
| CX-SEC-018 | 注销账号 | 注销验证码错误/超时 | P2 | 需专用账号/破坏性专项 | 可补专项自动化，但必须使用专用账号并隔离破坏性数据。 |
| CX-SEC-019 | 注销冷静期 | 业务页面拦截 | P1 | 需专用账号/破坏性专项 | 可补专项自动化，但必须使用专用账号并隔离破坏性数据。 |
| CX-SEC-020 | 注销冷静期 | 撤销注销恢复 | P1 | 需专用账号/破坏性专项 | 可补专项自动化，但必须使用专用账号并隔离破坏性数据。 |
| CX-SEC-021 | 注销冷静期 | 冷静期退出再登录 | P1 | 需专用账号/破坏性专项 | 可补专项自动化，但必须使用专用账号并隔离破坏性数据。 |
| CX-SEC-022 | 注销账号 | 完成页退出登录 | P2 | 需专用账号/破坏性专项 | 可补专项自动化，但必须使用专用账号并隔离破坏性数据。 |

### 十一、WebView 容器兼容性
| 用例ID | 模块 | 子功能 | 优先级 | 处理类型 | 后续建议 |
| --- | --- | --- | --- | --- | --- |
| CX-WV-COMPAT-007 | WebView兼容 | 无 visualViewport 兜底 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-WV-COMPAT-008 | WebView兼容 | 无 ResizeObserver 兜底 | P2 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |
| CX-WV-COMPAT-009 | WebView网络 | 弱网/断网恢复 | P1 | 半自动/建议手动专项 | 建议保留为半自动/手动专项；若要自动化，需增加网络异常、限流、降级或系统能力 Mock/测试钩子。 |

## ✅ 已实现用例清单

### 一、基础登录与 WebView 容器
| 用例ID | 模块 | 子功能 | 优先级 | 类型 | 推荐运行命令 |
| --- | --- | --- | --- | --- | --- |
| CX-WV-BASE-001 | 启动 | App 启动 WebView | P0 | 常规自动化 | pnpm run test:android:webview |
| CX-WV-BASE-002 | 登录 | 正确验证码登录 | P0 | 常规自动化 | pnpm run test:android:login |
| CX-WV-BASE-003 | 登录 | 错误验证码 | P0 | 常规自动化 | pnpm run test:android:login |
| CX-WV-BASE-004 | 登录 | 无效手机号 | P0 | 常规自动化 | pnpm run test:android:login |
| CX-WV-BASE-005 | 登录 | 重复获取验证码 | P0 | 常规自动化 | pnpm run test:android:login |
| CX-WV-BASE-006 | 登录 | 协议未勾选 | P0 | 常规自动化 | pnpm run test:android:login |
| CX-WV-BASE-007 | 登录 | 用户协议弹窗 | P1 | 常规自动化 | pnpm run test:android:login |
| CX-WV-BASE-008 | 登录 | 隐私政策弹窗 | P1 | 常规自动化 | pnpm run test:android:login |
| CX-WV-BASE-009 | 登录态 | App 数据清理后登录态 | P0 | 破坏性/需专用账号 | pnpm run test:android:auth-state |
| CX-WV-BASE-010 | 登出 | 正常退出登录 | P0 | 常规自动化 | pnpm run test:android:auth-state |
| CX-WV-BASE-011 | 登出 | 登出后返回 | P0 | 常规自动化 | pnpm run test:android:auth-state |
| CX-WV-BASE-012 | WebView | 页面刷新/重进 | P1 | 常规自动化 | pnpm run test:android:webview |
| CX-WV-BASE-014 | 登录 | 验证码一次性使用 | P1 | 常规自动化 | pnpm run test:android:login |
| CX-WV-BASE-017 | 登录态 | token失效自动退出 | P0 | 常规自动化 | pnpm run test:android:auth-state |
| CX-WV-BASE-018 | 登录态 | 切账号缓存隔离 | P0 | 常规自动化 | pnpm run test:android:auth-state |
| CX-WV-BASE-019 | 登录 | 验证码输入过滤 | P1 | 常规自动化 | pnpm run test:android:login |
| CX-WV-BASE-020 | WebView | 深链未登录重定向 | P0 | 常规自动化 | pnpm run test:android:auth-state |

### 二、首次个人信息完善 /profile
| 用例ID | 模块 | 子功能 | 优先级 | 类型 | 推荐运行命令 |
| --- | --- | --- | --- | --- | --- |
| CX-PROFILE-001 | 个人信息 | 首次登录跳转 | P0 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-002 | 个人信息 | 页面元素展示 | P0 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-003 | 个人信息 | 必填为空校验 | P0 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-004 | 个人信息 | 昵称填写 | P0 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-005 | 个人信息 | 出生日期选择 | P0 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-006 | 个人信息 | 当前关注情况选择 | P0 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-007 | 个人信息 | 性别选择 | P0 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-008 | 个人信息 | 完整保存 | P0 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-009 | 个人信息 | 非首次可跳过 | P1 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-010 | 个人信息 | 跳过进入对话 | P1 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-011 | 个人信息 | 编辑模式返回 | P1 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-012 | 个人信息 | 编辑保存 | P1 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-013 | 个人信息 | 首次强制资料不可跳过 | P0 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-014 | 个人信息 | 首次部分保存拦截 | P0 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-015 | 个人信息 | 带 returnSessionId 返回 | P1 | 常规自动化 | pnpm run test:android:profile-fast |
| CX-PROFILE-016 | 个人信息 | 关注情况改变联动健康档案字段 | P1 | 常规自动化 | pnpm run test:android:profile-fast |

### 三、对话页基础功能 /chat
| 用例ID | 模块 | 子功能 | 优先级 | 类型 | 推荐运行命令 |
| --- | --- | --- | --- | --- | --- |
| CX-CHAT-001 | 对话 | 对话页加载 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-002 | 对话 | 欢迎建议问题展示 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-003 | 对话 | 点击建议问题发送 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-004 | 对话 | 文字输入发送 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-005 | 对话 | Enter 发送 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-006 | 对话 | Shift+Enter 换行 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-007 | 对话 | 空消息不可发送 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-008 | 对话 | 停止生成 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-009 | 对话 | 停止后重试 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-010 | 对话 | 新对话 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-011 | 对话 | 消息复制 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-012 | 对话 | 点赞 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-013 | 对话 | 点踩 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-014 | 对话 | 分享至此 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-015 | 对话 | 内容免责声明 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-016 | 对话 | 长文本限制 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-017 | 对话 | 历史会话恢复 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-018 | 对话 | 删除历史会话 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-019 | 对话 | 对话不存在 | P2 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-020 | 对话 | 新对话切换不串流 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-024 | 对话 | 仅图片消息发送 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-CHAT-025 | 对话 | 加载更早历史消息 | P1 | 慢速/专项 | pnpm run test:android:chat-fast |
| CX-CHAT-026 | 对话 | 删除当前会话后回新对话 | P1 | 破坏性/需专用账号 | pnpm run test:android:chat-fast |
| CX-CHAT-029 | 对话 | 中断后编辑重试 | P1 | 常规自动化 | pnpm run test:android:chat-fast |

### 四、输入框、图片、语音
| 用例ID | 模块 | 子功能 | 优先级 | 类型 | 推荐运行命令 |
| --- | --- | --- | --- | --- | --- |
| CX-INPUT-001 | 输入框 | 默认状态 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-INPUT-002 | 输入框 | 输入后按钮变化 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-INPUT-003 | 输入框 | 发送后清空 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-INPUT-004 | 输入框 | 图片选择入口 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-INPUT-005 | 输入框 | 上传图片预览 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-INPUT-006 | 输入框 | 删除图片预览 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-INPUT-007 | 输入框 | 图片消息发送 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-INPUT-008 | 输入框 | 不支持格式 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-INPUT-009 | 输入框 | 单图大小限制 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-INPUT-010 | 输入框 | 图片数量限制 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-INPUT-011 | 输入框 | 语音按钮存在 | P1 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-INPUT-012 | 输入框 | WebView 不支持录音提示 | P1 | 条件自动化 | pnpm run test:android:chat-fast |
| CX-INPUT-013 | 输入框 | 录音开始/停止 | P2 | 原生/Bridge专项 | pnpm run test:android:bridge |
| CX-INPUT-014 | 输入框 | 流式中按钮状态 | P0 | 常规自动化 | pnpm run test:android:chat-fast |
| CX-INPUT-017 | 语音 | 麦克风权限拒绝 | P2 | 原生/Bridge专项 | pnpm run test:android:bridge |

### 五、侧边栏与导航
| 用例ID | 模块 | 子功能 | 优先级 | 类型 | 推荐运行命令 |
| --- | --- | --- | --- | --- | --- |
| CX-NAV-001 | 侧边栏 | 打开侧边栏 | P0 | 常规自动化 | pnpm run test:android:navigation |
| CX-NAV-002 | 侧边栏 | 关闭侧边栏 | P0 | 常规自动化 | pnpm run test:android:navigation |
| CX-NAV-003 | 侧边栏 | 进入个人信息 | P0 | 常规自动化 | pnpm run test:android:navigation |
| CX-NAV-004 | 侧边栏 | 进入健康档案 | P0 | 常规自动化 | pnpm run test:android:navigation |
| CX-NAV-005 | 侧边栏 | 进入我的材料 | P1 | 常规自动化 | pnpm run test:android:navigation |
| CX-NAV-006 | 侧边栏 | 新对话 | P0 | 常规自动化 | pnpm run test:android:navigation |
| CX-NAV-007 | 侧边栏 | 历史列表展示 | P1 | 常规自动化 | pnpm run test:android:navigation |
| CX-NAV-008 | 侧边栏 | 历史会话加载更多 | P2 | 常规自动化 | pnpm run test:android:navigation |
| CX-NAV-009 | 侧边栏 | 退出登录 | P0 | 常规自动化 | pnpm run test:android:navigation |
| CX-NAV-010 | 侧边栏 | 进入阅读设置 | P0 | 常规自动化 | pnpm run test:android:navigation |
| CX-NAV-011 | 侧边栏 | 资料页返回侧栏中间态 | P1 | 常规自动化 | pnpm run test:android:navigation |
| CX-NAV-012 | 侧边栏 | 素材上传台入口可见性 | P2 | 常规自动化 | pnpm run test:android:navigation |
| CX-NAV-013 | 侧边栏 | 删除会话二次确认 | P1 | 条件自动化 | pnpm run test:android:navigation |

### 六、健康档案授权
| 用例ID | 模块 | 子功能 | 优先级 | 类型 | 推荐运行命令 |
| --- | --- | --- | --- | --- | --- |
| CX-CONSENT-001 | 健康授权 | 首次进入弹窗 | P0 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-CONSENT-002 | 健康授权 | 同意授权 | P0 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-CONSENT-003 | 健康授权 | 不同意授权 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-CONSENT-004 | 健康授权 | 已授权不再弹 | P1 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-CONSENT-006 | 健康授权 | 本地授权丢失远端同步 | P1 | 常规自动化 | pnpm run test:android:medical-fast |

### 七、健康档案页 /medical-records
| 用例ID | 模块 | 子功能 | 优先级 | 类型 | 推荐运行命令 |
| --- | --- | --- | --- | --- | --- |
| CX-MED-001 | 健康档案 | 页面加载 | P0 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-MED-002 | 健康档案 | 返回对话 | P0 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-MED-003 | 病历档案 | 卡片展示 | P0 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-MED-004 | 病历档案 | 编辑入口 | P0 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-MED-005 | 病历档案 | 取消编辑 | P0 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-MED-006 | 病历档案 | 月经状态选择 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-MED-007 | 病历档案 | 肿瘤分型选择 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-MED-008 | 病历档案 | 确诊时长选择 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-MED-009 | 病历档案 | 治疗阶段选择 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-MED-010 | 病历档案 | 用药情况选择 | P0 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-MED-011 | 病历档案 | 自定义用药 | P0 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-MED-012 | 病历档案 | 自定义用药 Emoji | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-MED-013 | 病历档案 | 自定义药名超长 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-MED-014 | 病历档案 | 暂未用药 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-MED-015 | 病历档案 | 不确定 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-MED-016 | 病历档案 | 用药时长选择 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-MED-017 | 病历档案 | 保存修改 | P0 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-MED-018 | 病历档案 | 多字段保存 | P1 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-MED-019 | 病历档案 | 男性隐藏月经状态 | P1 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-MED-020 | 病历档案 | 不同关注情况字段变化 | P1 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-MED-022 | MVP限制 | 单档案限制 | P1 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-MED-026 | 清空后档案 | 清空不影响个人信息授权对话 | P1 | 破坏性/需专用账号 | pnpm run test:android:medical-fast |
| CX-MED-029 | 病历档案 | 关注情况切换隐藏旧扩展字段 | P1 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-MED-030 | 病历档案 | 自定义用药分隔去重 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-MED-031 | 病历档案 | 未点添加的自定义药随保存提交 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-MED-033 | 病历档案 | 折叠/取消丢弃未保存变更 | P1 | 常规自动化 | pnpm run test:android:medical-fast |

### 八、病历文档上传 / OCR
| 用例ID | 模块 | 子功能 | 优先级 | 类型 | 推荐运行命令 |
| --- | --- | --- | --- | --- | --- |
| CX-OCR-001 | 病历上传 | 进入上传页 | P0 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-OCR-002 | 病历上传 | 上传页元素 | P0 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-OCR-003 | 病历上传 | 取消上传 | P0 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-OCR-004 | 病历上传 | 选择图片预览 | P0 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-OCR-005 | 病历上传 | 删除图片 | P1 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-OCR-006 | 病历上传 | 开始识别按钮 | P0 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-OCR-007 | 病历上传 | 不支持格式 | P0 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-OCR-008 | 病历上传 | 单张超过 10MB | P1 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-OCR-009 | 病历上传 | 最多 10 张 | P1 | 常规自动化 | pnpm run test:android:medical-fast |
| CX-OCR-014 | 病历文档 | 查看详情 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-OCR-015 | 病历文档 | 图片预览 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-OCR-022 | 病历文档 | 删除文档二次确认取消 | P1 | 条件自动化 | pnpm run test:android:medical-fast |
| CX-OCR-024 | 病历文档 | 详情大图关闭与切换 | P1 | 条件自动化 | pnpm run test:android:medical-fast |

### 九、我的材料 /materials
| 用例ID | 模块 | 子功能 | 优先级 | 类型 | 推荐运行命令 |
| --- | --- | --- | --- | --- | --- |
| CX-MAT-001 | 我的材料 | 页面进入 | P1 | 常规自动化 | pnpm run test:android:materials-fast |
| CX-MAT-002 | 我的材料 | 沟通卡空状态 | P1 | 条件自动化 | pnpm run test:android:materials-fast |
| CX-MAT-003 | 我的材料 | 列表展示 | P1 | 条件自动化 | pnpm run test:android:materials-fast |
| CX-MAT-004 | 我的材料 | 查看详情 | P1 | 条件自动化 | pnpm run test:android:materials-fast |
| CX-MAT-005 | 我的材料 | 编辑卡片 | P1 | 条件自动化 | pnpm run test:android:materials-fast |
| CX-MAT-006 | 我的材料 | 保存修改 | P1 | 条件自动化 | pnpm run test:android:materials-fast |
| CX-MAT-007 | 我的材料 | 取消编辑 | P1 | 条件自动化 | pnpm run test:android:materials-fast |
| CX-MAT-008 | 我的材料 | 返回列表 | P1 | 条件自动化 | pnpm run test:android:materials-fast |
| CX-MAT-009 | 我的材料 | 返回聊天 | P1 | 常规自动化 | pnpm run test:android:materials-fast |
| CX-MAT-010 | 我的材料 | Tab切换 | P1 | 常规自动化 | pnpm run test:android:materials-fast |
| CX-MAT-011 | 我的材料 | 跟练卡空状态 | P1 | 条件自动化 | pnpm run test:android:materials-fast |
| CX-MAT-012 | 我的材料 | 跟练卡列表展示 | P1 | 条件自动化 | pnpm run test:android:materials-fast |
| CX-MAT-013 | 我的材料 | 跟练卡详情 | P1 | 条件自动化 | pnpm run test:android:materials-fast |
| CX-MAT-016 | 我的材料 | 沟通卡编辑取消恢复 | P1 | 条件自动化 | pnpm run test:android:materials-fast |
| CX-MAT-017 | 我的材料 | 返回原会话并打开侧栏 | P1 | 常规自动化 | pnpm run test:android:materials-fast |

### 十、账号与安全
| 用例ID | 模块 | 子功能 | 优先级 | 类型 | 推荐运行命令 |
| --- | --- | --- | --- | --- | --- |
| CX-SEC-001 | 账号安全 | 页面进入 | P1 | 常规自动化 | pnpm run test:android:account-fast |
| CX-SEC-002 | 账号安全 | 返回个人信息 | P1 | 常规自动化 | pnpm run test:android:account-fast |
| CX-SEC-003 | 清空档案 | 打开清空弹窗 | P1 | 常规自动化 | pnpm run test:android:account-fast |
| CX-SEC-004 | 清空档案 | 取消清空 | P1 | 常规自动化 | pnpm run test:android:account-fast |
| CX-SEC-006 | 注销账号 | 打开注销流程 | P2 | 常规自动化 | pnpm run test:android:account-fast |
| CX-SEC-007 | 注销账号 | 取消注销 | P2 | 常规自动化 | pnpm run test:android:account-fast |
| CX-SEC-009 | 清空档案 | 发送清空验证码与倒计时 | P1 | 常规自动化 | pnpm run test:android:account-fast |
| CX-SEC-010 | 清空档案 | 验证码为空拦截 | P1 | 常规自动化 | pnpm run test:android:account-fast |
| CX-SEC-011 | 清空档案 | 错误验证码 | P1 | 常规自动化 | pnpm run test:android:account-fast |
| CX-SEC-015 | 注销账号 | 风险阅读倒计时 | P2 | 常规自动化 | pnpm run test:android:account-fast |
| CX-SEC-016 | 注销账号 | 确认短语校验 | P2 | 常规自动化 | pnpm run test:android:account-fast |
| CX-SEC-017 | 注销账号 | 注销短信重发倒计时 | P2 | 常规自动化 | pnpm run test:android:account-fast |

### 十一、WebView 容器兼容性
| 用例ID | 模块 | 子功能 | 优先级 | 类型 | 推荐运行命令 |
| --- | --- | --- | --- | --- | --- |
| CX-WV-COMPAT-001 | WebView兼容 | 首屏高度与白屏兜底 | P0 | 常规自动化 | pnpm run test:android:webview |
| CX-WV-COMPAT-002 | WebView兼容 | 软键盘不遮挡输入框 | P0 | 常规自动化 | pnpm run test:android:webview |
| CX-WV-COMPAT-003 | WebView兼容 | 系统返回层级 | P0 | 常规自动化 | pnpm run test:android:navigation |
| CX-WV-COMPAT-004 | WebView兼容 | 深链刷新/重进 | P0 | 常规自动化 | pnpm run test:android:webview |
| CX-WV-COMPAT-005 | WebView文件 | 相册选择文件 | P0 | 原生/Bridge专项 | pnpm run test:android:bridge |
| CX-WV-COMPAT-006 | WebView文件 | 相机拍照 capture | P1 | 原生/Bridge专项 | pnpm run test:android:bridge-slow |
| CX-WV-COMPAT-010 | WebView交互 | 复制/长按后输入不被遮挡 | P1 | 原生/Bridge专项 | pnpm run test:android:bridge |

### 十二、阅读设置 /reading-settings
| 用例ID | 模块 | 子功能 | 优先级 | 类型 | 推荐运行命令 |
| --- | --- | --- | --- | --- | --- |
| CX-READ-001 | 阅读设置 | 页面进入 | P0 | 常规自动化 | pnpm run test:android:reading |
| CX-READ-002 | 阅读设置 | 三档切换选中态 | P0 | 常规自动化 | pnpm run test:android:reading |
| CX-READ-003 | 阅读设置 | 字号持久化 | P1 | 常规自动化 | pnpm run test:android:reading |
| CX-READ-004 | 阅读设置 | 聊天与材料字号生效 | P1 | 常规自动化 | pnpm run test:android:reading |
| CX-READ-005 | 阅读设置 | 返回原会话侧栏 | P1 | 常规自动化 | pnpm run test:android:reading |
