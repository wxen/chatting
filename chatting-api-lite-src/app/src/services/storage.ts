import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatSession, ApiConfig, SystemPrompt, ProviderId } from '../types/chat';

const SESSIONS_KEY = 'chat_sessions_v4';
const API_CONFIGS_KEY = 'api_configs_v1';
const ACTIVE_CONFIG_KEY = 'active_config_id';
const PROMPTS_KEY = 'prompts_v1';
const ACTIVE_PROMPT_KEY = 'active_prompt_id';
const THEME_KEY = 'theme_mode';

// --- Sessions ---

export async function saveSessions(sessions: ChatSession[]): Promise<void> {
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function loadSessions(): Promise<ChatSession[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  if (raw) {
    const sessions = JSON.parse(raw) as ChatSession[];
    return sessions.map((s) => ({
      ...s,
      unreadCount: s.unreadCount ?? 0,
      pinned: s.pinned ?? false,
      configIds: Array.isArray((s as any).configIds) ? (s as any).configIds : ((s as any).configId ? [(s as any).configId] : []),
      promptId: s.promptId ?? null,
      showStats: s.showStats ?? false,
      showThinking: (s as any).showThinking ?? false,
      overflowStrategy: (s as any).overflowStrategy || 'scroll',
      criticalTokens: (s as any).criticalTokens ?? 1024,
      customOverflowPrompt: (s as any).customOverflowPrompt || '',
      continuitySummary: (s as any).continuitySummary || '',
      quoteLength: (s as any).quoteLength ?? 200,
      quoteDisplayLength: (s as any).quoteDisplayLength ?? 12,
      avatarType: s.avatarType ?? 'emoji',
    }));
  }
  return [];
}

// --- API Configs ---

export function createDefaultConfig(name: string, provider: ProviderId = 'deepseek'): ApiConfig {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    provider,
    apiKey: '',
    baseURL: '',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 4096,
  };
}

export async function loadApiConfigs(): Promise<ApiConfig[]> {
  const raw = await AsyncStorage.getItem(API_CONFIGS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function loadActiveConfigId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_CONFIG_KEY);
}

export async function saveApiConfigs(configs: ApiConfig[]): Promise<void> {
  await AsyncStorage.setItem(API_CONFIGS_KEY, JSON.stringify(configs));
}

export async function saveActiveConfigId(id: string | null): Promise<void> {
  if (id) {
    await AsyncStorage.setItem(ACTIVE_CONFIG_KEY, id);
  } else {
    await AsyncStorage.removeItem(ACTIVE_CONFIG_KEY);
  }
}

// --- System Prompts ---

export async function loadPrompts(): Promise<SystemPrompt[]> {
  const raw = await AsyncStorage.getItem(PROMPTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function savePrompts(prompts: SystemPrompt[]): Promise<void> {
  await AsyncStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
}

export async function loadActivePromptId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_PROMPT_KEY);
}

export async function saveActivePromptId(id: string | null): Promise<void> {
  if (id) { await AsyncStorage.setItem(ACTIVE_PROMPT_KEY, id); }
  else { await AsyncStorage.removeItem(ACTIVE_PROMPT_KEY); }
}

// --- Theme ---
import { ThemeMode } from '../types/chat';
export async function loadTheme(): Promise<ThemeMode> {
  const raw = await AsyncStorage.getItem(THEME_KEY);
  if (raw === 'dark' || raw === 'light' || raw === 'system') return raw;
  return 'system'; // default to system on first launch
}
export async function saveTheme(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, mode);
}
