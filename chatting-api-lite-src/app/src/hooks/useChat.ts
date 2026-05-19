import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, ChatSession, ApiConfig, SystemPrompt, ThemeMode } from '../types/chat';
import { streamChat } from '../services/api';
import { estimateTokens } from '../services/tokens';
import { PROVIDERS } from '../services/providers';
import {
  loadSessions, saveSessions, loadApiConfigs, loadActiveConfigId, saveApiConfigs, saveActiveConfigId,
  loadPrompts, savePrompts, loadActivePromptId, saveActivePromptId, loadTheme, saveTheme,
} from '../services/storage';

function generateId(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
const DEFAULT_AVATARS = ['😊','🤖','💬','🎯','🌟','💡','🔥','✨','🦊','🐱'];
function randomAvatar(): string { return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]; }

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('light');

  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;

  useEffect(() => {
    (async () => {
      const [loaded, configs, acId, prs, apId, thm]: [ChatSession[], ApiConfig[], string | null, SystemPrompt[], string | null, ThemeMode] = await Promise.all([
        loadSessions(), loadApiConfigs(), loadActiveConfigId(), loadPrompts(), loadActivePromptId(), loadTheme(),
      ]);
      setSessions(loaded); setApiConfigs(configs); setPrompts(prs); setTheme(thm);
      if (acId && configs.find((c) => c.id === acId)) setActiveConfigId(acId);
      else if (configs.length > 0) setActiveConfigId(configs[0].id);
      if (apId && prs.find((p) => p.id === apId)) setActivePromptId(apId);
    })();
  }, []);

  const updateSessions = useCallback((updater: (prev: ChatSession[]) => ChatSession[]) => {
    setSessions((prev) => { const next = updater(prev); saveSessions(next); return next; });
  }, []);

  // --- Sessions ---
  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const createSession = useCallback((title?: string, avatar?: string, avatarType?: 'emoji' | 'image') => {
    const s: ChatSession = {
      id: generateId(), title: title || '新的对话', avatar: avatar || randomAvatar(),
      avatarType: avatarType || 'emoji', messages: [], unreadCount: 0, pinned: false,
      configIds: activeConfigId ? [activeConfigId] : [],
      promptId: activePromptId, showStats: false, showThinking: false,
      overflowStrategy: 'scroll' as const, criticalTokens: 1024, customOverflowPrompt: '', continuitySummary: '', quoteLength: 200, quoteDisplayLength: 12,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    updateSessions((prev) => [s, ...prev]);
    return s;
  }, [activeConfigId, activePromptId, updateSessions]);

  const enterSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    updateSessions((prev) => prev.map((s) => (s.id === id ? { ...s, unreadCount: 0 } : s)));
  }, [updateSessions]);

  const updateSessionMeta = useCallback((id: string, title: string, avatar: string, avatarType?: 'emoji' | 'image') => {
    updateSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title, avatar, avatarType: avatarType || s.avatarType, updatedAt: Date.now() } : s)));
  }, [updateSessions]);

  const togglePinSession = useCallback((id: string) => updateSessions((prev) => prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))), [updateSessions]);
  const markUnread = useCallback((id: string) => updateSessions((prev) => prev.map((s) => (s.id === id ? { ...s, unreadCount: 1 } : s))), [updateSessions]);

  const deleteSession = useCallback((id: string) => {
    updateSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) setCurrentSessionId(null);
  }, [currentSessionId, updateSessions]);

  const moveSession = useCallback((id: string, dir: 'up' | 'down') => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === id); if (idx < 0) return prev;
      const nidx = dir === 'up' ? idx - 1 : idx + 1; if (nidx < 0 || nidx >= prev.length) return prev;
      const next = [...prev]; [next[idx], next[nidx]] = [next[nidx], next[idx]]; saveSessions(next); return next;
    });
  }, []);

  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

  // --- API Configs ---
  const saveConfig = useCallback((config: ApiConfig) => {
    setApiConfigs((prev) => { const idx = prev.findIndex((c) => c.id === config.id); const next = idx >= 0 ? prev.map((c) => (c.id === config.id ? config : c)) : [...prev, config]; saveApiConfigs(next); return next; });
    setActiveConfigId(config.id); saveActiveConfigId(config.id);
  }, []);
  const deleteConfig = useCallback((id: string) => {
    setApiConfigs((prev) => { const next = prev.filter((c) => c.id !== id); saveApiConfigs(next); if (activeConfigId === id) { const na = next.length > 0 ? next[0].id : null; setActiveConfigId(na); saveActiveConfigId(na); } return next; });
    // Remove from session configIds
    updateSessions((prev) => prev.map((s) => ({ ...s, configIds: s.configIds.filter((cid) => cid !== id) })));
  }, [activeConfigId, updateSessions]);
  const selectConfig = useCallback((id: string) => { setActiveConfigId(id); saveActiveConfigId(id); }, []);
  const moveConfig = useCallback((id: string, dir: 'up' | 'down') => {
    setApiConfigs((prev) => { const idx = prev.findIndex((c) => c.id === id); if (idx < 0) return prev; const nidx = dir === 'up' ? idx - 1 : idx + 1; if (nidx < 0 || nidx >= prev.length) return prev; const next = [...prev]; [next[idx], next[nidx]] = [next[nidx], next[idx]]; saveApiConfigs(next); return next; });
  }, []);

  // Toggle a config on/off for a session (multi-select)
  const toggleSessionConfig = useCallback((sid: string, configId: string) => {
    updateSessions((prev) => prev.map((s) => {
      if (s.id !== sid) return s;
      const has = s.configIds.includes(configId);
      const next = has ? s.configIds.filter((c) => c !== configId) : [...s.configIds, configId];
      return { ...s, configIds: next };
    }));
  }, [updateSessions]);

  // --- System Prompts ---
  const savePrompt = useCallback((prompt: SystemPrompt) => {
    setPrompts((prev) => { const idx = prev.findIndex((p) => p.id === prompt.id); const next = idx >= 0 ? prev.map((p) => (p.id === prompt.id ? prompt : p)) : [...prev, prompt]; savePrompts(next); return next; });
    setActivePromptId(prompt.id); saveActivePromptId(prompt.id);
  }, []);
  const deletePrompt = useCallback((id: string) => {
    setPrompts((prev) => { const next = prev.filter((p) => p.id !== id); savePrompts(next); if (activePromptId === id) { const na = next.length > 0 ? next[0].id : null; setActivePromptId(na); saveActivePromptId(na); } return next; });
  }, [activePromptId]);
  const selectPrompt = useCallback((id: string) => { setActivePromptId(id); saveActivePromptId(id); }, []);
  const movePrompt = useCallback((id: string, dir: 'up' | 'down') => {
    setPrompts((prev) => { const idx = prev.findIndex((p) => p.id === id); if (idx < 0) return prev; const nidx = dir === 'up' ? idx - 1 : idx + 1; if (nidx < 0 || nidx >= prev.length) return prev; const next = [...prev]; [next[idx], next[nidx]] = [next[nidx], next[idx]]; savePrompts(next); return next; });
  }, []);
  const setSessionPrompt = useCallback((sid: string, promptId: string | null) => {
    updateSessions((prev) => prev.map((s) => (s.id === sid ? { ...s, promptId } : s)));
  }, [updateSessions]);
  const toggleSessionStats = useCallback((sid: string) => {
    updateSessions((prev) => prev.map((s) => (s.id === sid ? { ...s, showStats: !s.showStats } : s)));
  }, [updateSessions]);

  const toggleSessionThinking = useCallback((sid: string) => {
    updateSessions((prev) => prev.map((s) => (s.id === sid ? { ...s, showThinking: !s.showThinking } : s)));
  }, [updateSessions]);

  const updateSessionOverflow = useCallback((sid: string, data: Partial<Pick<ChatSession, 'overflowStrategy' | 'criticalTokens' | 'customOverflowPrompt'>>) => {
    updateSessions((prev) => prev.map((s) => (s.id === sid ? { ...s, ...data } : s)));
  }, [updateSessions]);

  const PRESET_OVERFLOW_PROMPT = `因为当前的模型对话内容即将超出支持的最大范围。现在你需要去总结一段在下一次新的会话中，能够保证平滑延续当前会话的一些中心主旨、历史内容记忆。还有一些被明确要求保持遵守的一些规范要求。请输出可直接用作新会话系统提示词的内容。`;

  // --- Message edit & delete ---
  const editMessage = useCallback((sessionId: string, messageId: string, newContent: string) => {
    updateSessions((prev) => prev.map((s) => {
      if (s.id !== sessionId) return s;
      return { ...s, messages: s.messages.map((m) => m.id === messageId ? { ...m, content: newContent.trim(), timestamp: Date.now() } : m), updatedAt: Date.now() };
    }));
  }, [updateSessions]);

  const deleteMessage = useCallback((sessionId: string, messageId: string) => {
    updateSessions((prev) => prev.map((s) => {
      if (s.id !== sessionId) return s;
      const msgs = s.messages.map((m) => {
        if (m.id !== messageId) return m;
        return { ...m, deleted: true, content: '该信息已被用户自行删除' };
      });
      // Auto cleanup: if a user+assistant pair are both deleted, remove both
      const cleaned: Message[] = [];
      let i = 0;
      while (i < msgs.length) {
        const curr = msgs[i];
        const next = msgs[i + 1];
        if (curr.deleted && next && next.deleted && curr.role === 'user' && next.role === 'assistant') {
          i += 2; // skip both
        } else {
          cleaned.push(curr);
          i += 1;
        }
      }
      return { ...s, messages: cleaned, updatedAt: Date.now() };
    }));
  }, [updateSessions]);

  const deleteMessages = useCallback((sessionId: string, messageIds: string[]) => {
    updateSessions((prev) => prev.map((s) => {
      if (s.id !== sessionId) return s;
      const msgs = s.messages.map((m) => {
        if (!messageIds.includes(m.id)) return m;
        return { ...m, deleted: true, content: '该信息已被用户自行删除' };
      });
      const cleaned: Message[] = [];
      let i = 0;
      while (i < msgs.length) {
        const curr = msgs[i];
        const next = msgs[i + 1];
        if (curr.deleted && next && next.deleted && curr.role === 'user' && next.role === 'assistant') {
          i += 2;
        } else { cleaned.push(curr); i += 1; }
      }
      return { ...s, messages: cleaned, updatedAt: Date.now() };
    }));
  }, [updateSessions]);

  function validatePrompt(content: string): string | null {
    if (!content) return null;
    const count = (content.match(/####正文####/g) || []).length;
    if (count > 1) return `检测到 ${count} 个 "####正文####" 标记，最多只能有 1 个。`;
    return null;
  }

  function applyPrompt(prompt: SystemPrompt | null, userContent: string): { systemMsg?: Message } {
    if (!prompt || !prompt.content) return {};
    if (prompt.content.includes('####正文####')) {
      return { systemMsg: { id: generateId(), role: 'system', content: prompt.content.replace(/####正文####/g, userContent), timestamp: Date.now() } };
    }
    return { systemMsg: { id: generateId(), role: 'system', content: prompt.content, timestamp: Date.now() } };
  }

  // --- Send Message (multi-API) ---
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;
    let session = currentSession;
    if (!session) session = createSession();

    const userMsg: Message = { id: generateId(), role: 'user', content: content.trim(), timestamp: Date.now() };
    const effectivePromptId = session?.promptId ?? activePromptId;
    const effectivePrompt = prompts.find((p) => p.id === effectivePromptId) || null;

    if (effectivePrompt) {
      const err = validatePrompt(effectivePrompt.content);
      if (err) {
        const errMsg: Message = { id: generateId(), role: 'assistant', content: `⚠️ 提示词错误：${err}`, timestamp: Date.now(), notForModel: true };
        updateSessions((prev) => prev.map((s) => s.id === session!.id ? { ...s, messages: [...s.messages, userMsg, errMsg], updatedAt: Date.now() } : s));
        return;
      }
    }

    const { systemMsg } = applyPrompt(effectivePrompt, content.trim());

    // Get selected configs
    const configIds = session?.configIds || [];
    if (configIds.length === 0) {
      const errMsg: Message = { id: generateId(), role: 'assistant', content: `⚠️ 未选择 API 配置。请在会话设置中选择至少一个 API 配置。`, timestamp: Date.now(), notForModel: true };
      updateSessions((prev) => prev.map((s) => s.id === session!.id ? { ...s, messages: [...s.messages, userMsg, errMsg], updatedAt: Date.now() } : s));
      return;
    }

    updateSessions((prev) => prev.map((s) => s.id === session!.id ? { ...s, messages: [...s.messages, userMsg], updatedAt: Date.now() } : s));

    setIsStreaming(true); setStreamingContent('');

    // Create abort controller for this request
    const controller = new AbortController();
    abortRef.current = controller;

    // --- Overflow check ---
    const strategy = session?.overflowStrategy || 'scroll';
    const criticalTokens = session?.criticalTokens || 1024;

    if (strategy !== 'scroll') {
      const totalEstimate = estimateTokens(
        [...session!.messages, userMsg].map((m) => m.content).join(' ')
      );
      // Use the smallest maxTokens among selected configs as reference
      let minMaxTokens = 131072;
      for (const cid of configIds) {
        const c = apiConfigs.find((x) => x.id === cid);
        if (c && c.maxTokens < minMaxTokens) minMaxTokens = c.maxTokens;
      }
      const triggerThreshold = minMaxTokens - criticalTokens - minMaxTokens * 0.1;

      if (totalEstimate > triggerThreshold && !session?.continuitySummary) {
        // Need to generate continuity summary first
        const overflowPrompt = strategy === 'custom' ? (session?.customOverflowPrompt || PRESET_OVERFLOW_PROMPT) : PRESET_OVERFLOW_PROMPT;
        const summaryReq: Message = { id: generateId(), role: 'user', content: overflowPrompt, timestamp: Date.now() };

        for (const cid of configIds) {
          const cfg = apiConfigs.find((c) => c.id === cid);
          if (!cfg || !cfg.apiKey) continue;
          const effective = { provider: cfg.provider, apiKey: cfg.apiKey, model: cfg.model, temperature: 0.3, maxTokens: cfg.maxTokens, baseURL: cfg.baseURL || PROVIDERS[cfg.provider].baseURL };
          let fullContent = '';
          try {
            for await (const delta of streamChat(effective, [summaryReq])) { fullContent += delta; setStreamingContent('📝 正在生成连续性总结...\n' + fullContent); }
          } catch { fullContent = ''; }
          if (fullContent) {
            updateSessions((prev) => prev.map((s) => s.id === session!.id ? { ...s, continuitySummary: fullContent } : s));
            break; // One summary is enough
          }
        }
      }
    }
    setStreamingContent('');

    // Build API messages with continuity context
    let continuityMsg: Message | undefined;
    if (strategy !== 'scroll' && session?.continuitySummary) {
      continuityMsg = { id: generateId(), role: 'system', content: `[会话连续性上下文]\n${session.continuitySummary}\n\n以下是最新的对话：`, timestamp: Date.now() };
    }

    // Filter out error/system messages that shouldn't go to the model
    const allMsgs = session!.messages.filter((m) => !m.notForModel);
    const apiMessages = [
      ...(systemMsg ? [systemMsg] : []),
      ...(continuityMsg ? [continuityMsg] : []),
      ...allMsgs,
      userMsg,
    ];

    // Process each config sequentially (streaming one at a time)
    for (const cid of configIds) {
      const cfg = apiConfigs.find((c) => c.id === cid);
      if (!cfg || !cfg.apiKey) {
        const skipMsg: Message = { id: generateId(), role: 'assistant', content: `⚠️ 配置「${cfg?.name || cid}」缺少 API Key，已跳过。`, timestamp: Date.now(), apiConfigId: cid, apiConfigName: cfg?.name || cid };
        updateSessions((prev) => prev.map((s) => s.id === session!.id ? { ...s, messages: [...s.messages, skipMsg], updatedAt: Date.now() } : s));
        continue;
      }
      // Show which config is responding
      setStreamingContent(`[${cfg.name}] 正在生成...`);
      const effective = { provider: cfg.provider, apiKey: cfg.apiKey, model: cfg.model, temperature: cfg.temperature, maxTokens: cfg.maxTokens, baseURL: cfg.baseURL || PROVIDERS[cfg.provider].baseURL, signal: controller.signal };
      let fullContent = '';
      let thinkingContent = '';
      const startTime = Date.now();
      try {
        for await (const chunk of streamChat(effective, apiMessages)) {
          if (chunk.text) { fullContent += chunk.text; setStreamingContent(fullContent); }
          if (chunk.thinking) { thinkingContent += chunk.thinking; }
        }
      } catch (e: any) {
        if (e.name === 'AbortError' || String(e.message || '').includes('abort')) {
          fullContent = fullContent || '(已终止)';
        } else {
          const errMsg = e.message || '请求失败';
          if (errMsg.includes('401')) fullContent = `🔑 API Key 无效。`;
          else if (errMsg.includes('429')) fullContent = `⏳ 请求过于频繁。`;
          else fullContent = `❌ ${errMsg}`;
          setStreamingContent(fullContent);
        }
      }
      const elapsed = Date.now() - startTime;
      const estimatedTokens = estimateTokens(fullContent);
      const finalMsg: Message = { id: generateId(), role: 'assistant', content: fullContent, timestamp: Date.now(), responseTimeMs: elapsed, tokenCount: estimatedTokens, apiConfigId: cid, apiConfigName: cfg.name, thinkingContent: thinkingContent || undefined };
      updateSessions((prev) => prev.map((s) => s.id === session!.id ? { ...s, messages: [...s.messages, finalMsg], updatedAt: Date.now() } : s));
    }

    setIsStreaming(false); setStreamingContent('');
    updateSessions((prev) => prev.map((s) => s.id === session!.id ? { ...s, title: s.messages.length === 0 ? content.trim().slice(0, 20) : s.title, updatedAt: Date.now() } : s));
  }, [currentSession, activePromptId, apiConfigs, prompts, isStreaming, createSession, updateSessions]);

  const switchMessageVersion = useCallback((sessionId: string, messageId: string, direction: 'prev' | 'next') => {
    updateSessions((prev) => prev.map((s) => {
      if (s.id !== sessionId) return s;
      return { ...s, messages: s.messages.map((m) => {
        if (m.id !== messageId || !m.versions) return m;
        const cur = m.currentVersion ?? 0;
        const newVer = direction === 'prev' ? Math.max(0, cur - 1) : Math.min(m.versions.length - 1, cur + 1);
        const v = m.versions[newVer];
        return { ...m, content: v.content, responseTimeMs: v.responseTimeMs, tokenCount: v.tokenCount, currentVersion: newVer };
      }) };
    }));
  }, [updateSessions]);

  const setThemeMode = useCallback((mode: ThemeMode) => { setTheme(mode); saveTheme(mode); }, []);

  // Regenerate a specific assistant message
  const regenerateMessage = useCallback(async (sessionId: string, messageId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const msg = session.messages.find((m) => m.id === messageId);
    if (!msg || msg.role !== 'assistant' || !msg.apiConfigId) return;
    const cfg = apiConfigs.find((c) => c.id === msg.apiConfigId);
    if (!cfg || !cfg.apiKey) return;

    // Find the user message that preceded this assistant message
    const msgIdx = session.messages.findIndex((m) => m.id === messageId);
    const contextMsgs = session.messages.slice(0, msgIdx).filter((m) => !m.notForModel);
    const lastUserMsg = [...contextMsgs].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    setIsStreaming(true); setStreamingContent('🔄 重新生成中...');
    const effective = { provider: cfg.provider, apiKey: cfg.apiKey, model: cfg.model, temperature: cfg.temperature, maxTokens: cfg.maxTokens, baseURL: cfg.baseURL || PROVIDERS[cfg.provider].baseURL };
    const apiMessages = [...contextMsgs, lastUserMsg];

    let fullContent = '';
    const startTime = Date.now();
    try {
      for await (const delta of streamChat(effective, apiMessages)) { fullContent += delta; setStreamingContent(fullContent); }
    } catch (e: any) { fullContent = `❌ ${e.message || '请求失败'}`; setStreamingContent(fullContent); }
    const elapsed = Date.now() - startTime;
    const estimatedTokens = estimateTokens(fullContent);

    // Add as new version
    const existingVersions = msg.versions || [{ content: msg.content, responseTimeMs: msg.responseTimeMs, tokenCount: msg.tokenCount }];
    const newVersion = { content: fullContent, responseTimeMs: elapsed, tokenCount: estimatedTokens };
    updateSessions((prev) => prev.map((s) => {
      if (s.id !== sessionId) return s;
      return { ...s, messages: s.messages.map((m) => {
        if (m.id !== messageId) return m;
        return { ...m, content: fullContent, responseTimeMs: elapsed, tokenCount: estimatedTokens, versions: [...existingVersions, newVersion], currentVersion: existingVersions.length };
      }), updatedAt: Date.now() };
    }));

    setIsStreaming(false); setStreamingContent('');
  }, [sessions, apiConfigs, updateSessions]);

  return {
    sessions: sortedSessions, currentSession, isStreaming, streamingContent,
    apiConfigs, activeConfig: apiConfigs.find((c) => c.id === activeConfigId) || null, activeConfigId,
    prompts, activePrompt: prompts.find((p) => p.id === activePromptId) || null, activePromptId,
    sendMessage, createSession, deleteSession, enterSession, updateSessionMeta,
    togglePinSession, markUnread, moveSession,
    saveConfig, deleteConfig, selectConfig, moveConfig, toggleSessionConfig,
    savePrompt, deletePrompt, selectPrompt, movePrompt, setSessionPrompt, validatePrompt,
    toggleSessionStats,
    toggleSessionThinking,
    editMessage, deleteMessage, deleteMessages,
    updateSessionOverflow,
    regenerateMessage,
    switchMessageVersion,
    abort,
    theme, setThemeMode,
  };
}
