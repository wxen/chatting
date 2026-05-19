export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  responseTimeMs?: number;
  tokenCount?: number;
  apiConfigId?: string;
  apiConfigName?: string;
  deleted?: boolean;
  notForModel?: boolean;
  versions?: { content: string; responseTimeMs?: number; tokenCount?: number }[];
  currentVersion?: number;
  thinkingContent?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  avatar: string;
  avatarType: 'emoji' | 'image';
  messages: Message[];
  unreadCount: number;
  pinned: boolean;
  configIds: string[];
  promptId: string | null;
  showStats: boolean;
  showThinking: boolean;
  overflowStrategy: 'scroll' | 'preset' | 'custom';
  criticalTokens: number;
  customOverflowPrompt: string;
  continuitySummary: string;
  quoteLength: number;
  quoteDisplayLength: number;
  createdAt: number;
  updatedAt: number;
}

export type ProviderId = 'deepseek' | 'openai' | 'claude' | 'gemini' | 'doubao' | 'kimi' | 'minimax' | 'mimo' | 'qwen' | 'custom';

export interface ModelOption {
  id: string;
  name: string;
}

export interface ProviderDef {
  id: ProviderId;
  name: string;
  baseURL: string;
  models: ModelOption[];
  apiFormat: 'openai' | 'anthropic' | 'gemini';
}

export interface ApiConfig {
  id: string;
  name: string;
  provider: ProviderId;
  apiKey: string;
  baseURL: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
