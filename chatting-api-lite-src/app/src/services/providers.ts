import { ProviderDef, ProviderId } from '../types/chat';

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    apiFormat: 'openai',
    models: [
      { id: 'deepseek-v4-pro', name: 'V4 Pro (1.6T MoE, 1M ctx)' },
      { id: 'deepseek-v4-flash', name: 'V4 Flash (284B, 1M ctx)' },
      { id: 'deepseek-chat', name: 'V3.2 (→V4 Flash, 7月停用)' },
      { id: 'deepseek-reasoner', name: 'R1 (→V4 Flash Think, 7月停用)' },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    apiFormat: 'openai',
    models: [
      { id: 'gpt-5.4-pro', name: 'GPT-5.4 Pro' },
      { id: 'gpt-5.4', name: 'GPT-5.4' },
      { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
      { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano' },
      { id: 'gpt-4.1', name: 'GPT-4.1 (1M ctx)' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
      { id: 'o4-mini', name: 'o4 Mini (推理)' },
    ],
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    baseURL: 'https://api.anthropic.com',
    apiFormat: 'anthropic',
    models: [
      { id: 'claude-opus-4-7-20260416', name: 'Claude Opus 4.7' },
      { id: 'claude-sonnet-4-6-20260217', name: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5-20251015', name: 'Claude Haiku 4.5' },
      { id: 'claude-opus-4-6-20260205', name: 'Claude Opus 4.6' },
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    baseURL: 'https://generativelanguage.googleapis.com',
    apiFormat: 'gemini',
    models: [
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (预览)' },
      { id: 'gemini-3-pro', name: 'Gemini 3 Pro' },
      { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    ],
  },
  doubao: {
    id: 'doubao',
    name: '豆包 (火山引擎)',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    apiFormat: 'openai',
    models: [
      { id: 'doubao-seed-2.0-pro', name: 'Seed 2.0 Pro (旗舰)' },
      { id: 'doubao-seed-2.0-lite', name: 'Seed 2.0 Lite (性价比)' },
      { id: 'doubao-seed-2.0-mini', name: 'Seed 2.0 Mini (低延迟)' },
      { id: 'doubao-seed-2.0-code', name: 'Seed 2.0 Code (编程)' },
      { id: 'doubao-seed-1.8', name: 'Seed 1.8 (多模态Agent)' },
    ],
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    baseURL: 'https://api.moonshot.cn/v1',
    apiFormat: 'openai',
    models: [
      { id: 'kimi-k2.6', name: 'Kimi K2.6 (最新旗舰, 256K)' },
      { id: 'kimi-k2.5', name: 'Kimi K2.5 (多模态)' },
      { id: 'kimi-k2-thinking', name: 'Kimi K2 Thinking (推理)' },
      { id: 'kimi-for-coding', name: 'Kimi Code (编程专用)' },
    ],
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    baseURL: 'https://api.minimax.chat/v1',
    apiFormat: 'openai',
    models: [
      { id: 'MiniMax-M2.5', name: 'M2.5 (最新, 230B, 200K)' },
      { id: 'MiniMax-M2', name: 'M2 (196K ctx)' },
      { id: 'MiniMax-M1', name: 'M1 (456B, 1M ctx, 推理)' },
      { id: 'abab7.0', name: 'ABAB7 (245K, Agent)' },
    ],
  },
  mimo: {
    id: 'mimo',
    name: '小米 MiMo',
    baseURL: 'https://api.mimo.xiaomi.com/v1',
    apiFormat: 'openai',
    models: [
      { id: 'mimo-chat', name: 'MiMo Chat' },
      { id: 'mimo-pro', name: 'MiMo Pro' },
    ],
  },
  qwen: {
    id: 'qwen',
    name: '通义千问',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiFormat: 'openai',
    models: [
      { id: 'qwen3.6-max-preview', name: 'Qwen3.6 Max (旗舰)' },
      { id: 'qwen3.6-plus', name: 'Qwen3.6 Plus (1M ctx)' },
      { id: 'qwen3.6-flash', name: 'Qwen3.6 Flash (低价)' },
      { id: 'qwen3-max', name: 'Qwen3 Max (稳定版)' },
    ],
  },
  custom: {
    id: 'custom',
    name: '自定义',
    baseURL: '',
    apiFormat: 'openai',
    models: [],
  },
};

export function getProvider(id: ProviderId): ProviderDef {
  return PROVIDERS[id];
}

export function getEffectiveBaseURL(provider: ProviderId, customBaseURL: string): string {
  if (provider === 'custom') return customBaseURL || 'http://localhost:11434/v1';
  return customBaseURL || PROVIDERS[provider].baseURL;
}
