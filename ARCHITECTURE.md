# 闲聊 Chatting — 项目解构与二次开发指南

## 项目定位

这是一个基于 React Native (Expo) 的纯 API 客户端，直连各大模型厂商 API。**无自有后端、无用户系统、纯本地存储。**

v0.0.1 `chatting-api-lite` 为 API 分支版本，刻意简化 UI，仅保留对话核心功能。后续版本可能在此基础上扩展本地模型 (GGUF + llama.cpp) 支持。

---

## 一、目录结构

```
/home/wx/peojects/mine/chatting/
├── README.md                    # 项目介绍（中英双语）
├── ARCHITECTURE.md              # 本文件
├── Neko-Chat_latest.gguf        # 预置 GGUF 模型（当前版本未启用）
└── app/                         # React Native (Expo) 应用
    ├── App.tsx                  # 根组件：导航、标题栏、设置入口
    ├── app.json                 # Expo 配置文件
    ├── package.json             # 依赖管理
    ├── tsconfig.json            # TypeScript 配置
    ├── src/
    │   ├── types/chat.ts        # 全局类型定义（消息、会话、配置等）
    │   ├── theme/colors.ts      # 浅色/深色主题色彩常量
    │   ├── context/ChatContext.tsx  # 全局状态上下文
    │   ├── hooks/useChat.ts     # 核心业务逻辑 Hook（状态管理、API 调用）
    │   ├── services/
    │   │   ├── api.ts           # 统一 API 接口（OpenAI/Anthropic/Gemini）
    │   │   ├── providers.ts     # 服务商定义（模型列表、Base URL）
    │   │   ├── storage.ts       # 本地持久化（AsyncStorage）
    │   │   └── tokens.ts        # Token 估算工具
    │   ├── screens/
    │   │   ├── SessionListScreen.tsx  # 会话列表页
    │   │   ├── ChatScreen.tsx         # 对话页
    │   │   ├── SettingsModal.tsx      # 设置页（全局/会话）
    │   │   └── AboutModal.tsx         # 关于页
    │   └── components/
    │       ├── MessageBubble.tsx      # 聊天气泡
    │       ├── ChatInput.tsx          # 输入框
    │       ├── StreamBubble.tsx       # 流式输出气泡
    │       ├── SessionItem.tsx        # 会话列表项
    │       ├── SessionEditModal.tsx   # 会话编辑弹窗
    │       ├── NewSessionModal.tsx    # 新建会话弹窗
    │       └── ActionSheet.tsx       # 底部操作菜单
    └── android/                 # Android 原生工程（prebuild 自动生成）
```

---

## 二、核心架构

### 状态管理

```
ChatProvider (Context)
  └── useChat() Hook
        ├── sessions: ChatSession[]       // 所有会话
        ├── apiConfigs: ApiConfig[]       // 所有 API 配置
        ├── prompts: SystemPrompt[]       // 所有提示词
        ├── theme: ThemeMode              // 主题模式
        ├── isStreaming/streamingContent  // 流式状态
        └── ...操作函数
```

所有组件通过 `useChatContext()` 获取全局状态。**不使用 Redux/Zustand**，状态直接由 Context + useReducer 模式管理。

### 数据流（发送消息）

```
用户输入
  → ChatInput.onSend(text)
  → ChatScreen.handleSend(text)
  → useChat.sendMessage(content)
     ├─ 解析提示词（替换 ####正文####）
     ├─ 检查溢出策略（是否需要总结）
     ├─ 构建 API 消息数组（过滤 notForModel）
     ├─ for each selected configId:
     │    ├─ 创建 AbortController
     │    ├─ streamChat(effectiveConfig, messages)
     │    │    └─ api.ts → chatOpenAI / chatAnthropic / chatGemini
     │    ├─ 收集文本 + 思考内容
     │    └─ 更新会话消息列表
     └─ 更新 UI 状态
```

### 多 API 并发

`ChatSession.configIds: string[]` — 会话可绑定多个 API 配置。发送消息时依次（串行）请求，每个回复独立存储为一条 Message，标注 `apiConfigId` + `apiConfigName`。各 API 上下文独立，互不可见对方回复。

---

## 三、关键类型定义

```typescript
// 消息
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  responseTimeMs?: number;      // 响应耗时
  tokenCount?: number;           // Token 估算
  apiConfigId?: string;          // 来源 API 配置 ID
  apiConfigName?: string;        // 来源 API 配置名称
  notForModel?: boolean;         // 不入模型上下文（错误提示等）
  deleted?: boolean;             // 已删除标记
  thinkingContent?: string;      // 思考过程内容
  versions?: Array<{...}>;       // 多版本（重新生成）
  currentVersion?: number;       // 当前版本索引
}

// 会话
interface ChatSession {
  id: string;
  configIds: string[];           // 多 API 配置
  promptId: string | null;       // 系统提示词
  showStats: boolean;            // 是否显示系统信息
  showThinking: boolean;         // 是否显示思考过程
  overflowStrategy: 'scroll' | 'preset' | 'custom';
  criticalTokens: number;
  continuitySummary: string;
  quoteLength: number;           // 引用转译长度
  quoteDisplayLength: number;    // 引用显示长度
  // ...
}

// API 配置
interface ApiConfig {
  id: string;
  name: string;                  // 用户命名
  provider: ProviderId;          // 服务商
  apiKey: string;
  baseURL: string;
  model: string;
  temperature: number;
  maxTokens: number;
}
```

---

## 四、添加新服务商

1. 在 `src/types/chat.ts` 的 `ProviderId` 中添加新 ID
2. 在 `src/services/providers.ts` 的 `PROVIDERS` 对象中添加配置：

```typescript
newProvider: {
  id: 'newProvider',
  name: '新服务商名称',
  baseURL: 'https://api.example.com/v1',
  apiFormat: 'openai', // 或 'anthropic' | 'gemini'
  models: [
    { id: 'model-id', name: '模型显示名' },
  ],
}
```

3. 如果 `apiFormat` 是 'openai'，无需额外代码。如果是新格式，需在 `src/services/api.ts` 中新增对应的 `chat*` 函数。

---

## 五、添加新功能

### 全局设置项

在 `useChat` 中新增状态和操作函数 → 在 `SettingsModal` 中添加 UI → 在 `ChatContext` 中暴露。

### 消息气泡行为

在 `MessageBubble` 中修改，通过 Props 接收回调。复杂交互（多选、引用）的状态提升到 `ChatScreen` 管理。

### 流式处理

- `src/services/api.ts` 中的 `streamChat` 返回 `AsyncGenerator<StreamChunk>`
- `StreamChunk = { text?: string; thinking?: string }`
- 文本和思考内容分离，分别累积

---

## 六、构建与部署

```bash
# 开发环境
cd app
npm install
npx expo start

# Android 发布构建
export ANDROID_HOME=~/Android/Sdk
export JAVA_HOME=~/jdk-17
npx expo prebuild --platform android
./android/gradlew -p android app:assembleRelease -x lint -x test

# APK 输出
# android/app/build/outputs/apk/release/app-release.apk

# 安装到设备
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

**构建环境要求**：
- Node.js >= 18
- JDK 17
- Android SDK (API 36 + Build Tools 36+)
- Android NDK 27.x

**国内镜像配置**（Gradle + Maven）：
- `android/build.gradle`：将 `google()`/`mavenCentral()` 替换为阿里云镜像
- `android/gradle/wrapper/gradle-wrapper.properties`：将 Gradle 分发 URL 改为腾讯云镜像

---

## 七、文件命名规范

| 类型 | 命名 | 示例 |
|------|------|------|
| 页面级组件 | `XxxScreen.tsx` | `ChatScreen.tsx` |
| 弹窗组件 | `XxxModal.tsx` | `SettingsModal.tsx` |
| 通用组件 | `Xxx.tsx` | `MessageBubble.tsx` |
| 服务/Hook | `xxx.ts` / `useXxx.ts` | `api.ts` / `useChat.ts` |
| 类型定义 | `chat.ts` | `types/chat.ts` |

---

## 八、注意事项

1. **不要**在 `node_modules` 中修改代码。所有定制通过 `src/` 完成。
2. Android 原生配置修改后需重新 `npx expo prebuild --platform android --clean`。
3. 当前签名使用 debug keystore，生产发布需替换。
4. `notForModel: true` 的消息不会被发送到 API，用于错误提示等。
5. Token 估算为近似值（CJK: 0.65t/字, ASCII: 1t/3.8字符），非精确计数。
