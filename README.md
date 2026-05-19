# 闲聊 Chatting — chatting-api-lite

A lightweight, cross-platform AI chat client that connects directly to model providers' APIs. No middleman server, no login, fully local storage.

一个轻量级跨平台 AI 聊天客户端，直连模型厂商 API。无中间服务器，无登录，全本地存储。

## Overview / 概述

Chatting is a React Native (Expo) app that serves as a universal API client for LLM services. It supports 10+ providers (DeepSeek, OpenAI, Claude, Gemini, Doubao, Kimi, MiniMax, Qwen, MiMo, and custom OpenAI-compatible endpoints) with multi-API parallel requests, system prompts, context overflow protection, message versioning, and more.

**chatting-api-lite** is the API-only branch — deliberately simplified UI, no local model loading.

## Features / 功能

- **10+ Providers / 多服务商** — DeepSeek, OpenAI, Claude, Gemini, Doubao, Kimi, MiniMax, Qwen, MiMo, Custom
- **Multi-API Parallel / 多 API 并发** — Send one message to multiple APIs, get independent replies labeled by source
- **Streaming & Abort / 流式与终止** — Real-time token streaming with abort button
- **Thinking Display / 思考过程** — Capture and display reasoning chains from DeepSeek V4, Claude, Gemini
- **System Prompts / 系统提示词** — Per-session prompt templates with `####正文####` placeholder
- **Context Overflow / 溢出保护** — Auto-summarize approaching context limits for continuity
- **Message Operations / 消息操作** — Edit, copy, quote, multi-select delete, regenerate with versioning
- **Dark Mode / 深色主题** — Light / Dark / Follow system
- **Fully Local / 全本地存储** — All data stored on-device only

## Supported Providers / 支持的服务商

| Provider | Base URL | Format |
|----------|----------|--------|
| DeepSeek | api.deepseek.com | OpenAI |
| OpenAI | api.openai.com/v1 | OpenAI |
| Claude | api.anthropic.com | Anthropic |
| Gemini | generativelanguage.googleapis.com | Gemini |
| Doubao (豆包) | ark.cn-beijing.volces.com/api/v3 | OpenAI |
| Kimi (月之暗面) | api.moonshot.cn/v1 | OpenAI |
| MiniMax | api.minimax.chat/v1 | OpenAI |
| MiMo (小米) | api.mimo.xiaomi.com/v1 | OpenAI |
| Qwen (通义千问) | dashscope.aliyuncs.com/compatible-mode/v1 | OpenAI |
| Custom / 自定义 | Any OpenAI-compatible | OpenAI |

## Quick Start / 快速开始

```bash
# Prerequisites
node >= 18, JDK 17, Android SDK

# Install
cd app
npm install

# Android build
npx expo prebuild --platform android
export ANDROID_HOME=~/Android/Sdk
export JAVA_HOME=~/jdk-17
./android/gradlew -p android app:assembleRelease -x lint -x test

# Output
# android/app/build/outputs/apk/release/app-release.apk
```

## Tech Stack / 技术栈

| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo) |
| Language | TypeScript |
| API Clients | openai, @anthropic-ai/sdk, @google/genai |
| Storage | AsyncStorage, expo-secure-store |
| UI | React Native core components |

## Links / 链接

- GitHub: [github.com/wxen/chatting](https://github.com/wxen/chatting)
- Gitee: [gitee.com/fruit-whisperer/app](https://gitee.com/fruit-whisperer/app)

## License / 协议

Apache 2.0

---

**Developer / 开发者**: wx
**Version / 版本**: v0.0.1 (chatting-api-lite)
