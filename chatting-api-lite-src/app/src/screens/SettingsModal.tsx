import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal,
  Animated, PanResponder, Vibration,
} from 'react-native';
import { useChatContext } from '../context/ChatContext';
import { PROVIDERS } from '../services/providers';
import { estimateTokens } from '../services/tokens';
import { ProviderId, ApiConfig, SystemPrompt } from '../types/chat';

interface Props { visible: boolean; onClose: () => void; sessionId: string | null; }

const PROVIDER_LIST = Object.values(PROVIDERS).filter((p) => p.id !== 'custom');
const ITEM_H = 62;

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function getDefaultURL(pid: ProviderId): string { return PROVIDERS[pid]?.baseURL || ''; }

export function SettingsModal({ visible, onClose, sessionId }: Props) {
  const {
    apiConfigs, activeConfigId, saveConfig, deleteConfig, selectConfig, moveConfig, toggleSessionConfig,
    prompts, activePromptId, savePrompt, deletePrompt, selectPrompt, movePrompt, setSessionPrompt,
    validatePrompt, sessions, theme, setThemeMode, colors, toggleSessionStats, toggleSessionThinking, updateSessionOverflow,
  } = useChatContext();

  const isSessionMode = !!sessionId;
  const session = sessionId ? sessions.find((s) => s.id === sessionId) : null;
  const sessionConfigIds = session?.configIds || [];
  const sessionPromptId = session?.promptId || null;
  const sessionShowStats = session?.showStats || false;
  const sessionOverflow = session?.overflowStrategy || 'scroll';
  const sessionCriticalTokens = session?.criticalTokens || 1024;
  const sessionCustomOverflow = session?.customOverflowPrompt || '';

  // Token stats using accurate estimation
  const sessionMsgs = session?.messages || [];
  const totalOutputTokens = sessionMsgs.reduce((sum, m) => sum + (m.tokenCount || estimateTokens(m.content)), 0);
  const totalInputTokens = sessionMsgs.reduce((sum, m) => sum + (m.role === 'user' ? estimateTokens(m.content) : 0), 0);
  const totalTokens = totalInputTokens + totalOutputTokens;
  const effectiveConfig = (sessionConfigIds.length > 0 ? apiConfigs.find((c) => c.id === sessionConfigIds[0]) : null) || apiConfigs.find((c) => c.id === activeConfigId);
  const configMaxTokens = effectiveConfig?.maxTokens || 4096;

  // ---- API Config state ----
  const [provider, setProvider] = useState<ProviderId>('deepseek');
  const [apiKey, setApiKey] = useState(''); const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState(''); const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('4096'); const [configName, setConfigName] = useState('');
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  // ---- Prompt state ----
  const [promptName, setPromptName] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptInputHeight, setPromptInputHeight] = useState(120);

  // ---- Drag state (configs) ----
  const dragIdRef = useRef<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragAnim = useRef(new Animated.Value(0)).current;
  const dragStartY = useRef(0); const dragCurIdx = useRef(0);
  const configsSnap = useRef(apiConfigs); configsSnap.current = apiConfigs;

  // ---- Drag state (prompts) ----
  const pdragIdRef = useRef<string | null>(null);
  const [pdragId, setPdragId] = useState<string | null>(null);
  const pdragAnim = useRef(new Animated.Value(0)).current;
  const pdragStartY = useRef(0); const pdragCurIdx = useRef(0);
  const promptsSnap = useRef(prompts); promptsSnap.current = prompts;

  const configPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: () => dragIdRef.current !== null || pdragIdRef.current !== null,
    onPanResponderMove: (_, g) => {
      // Handle config drag
      if (dragIdRef.current) {
        dragAnim.setValue(g.dy);
        const cur = dragCurIdx.current;
        const currentY = dragStartY.current + g.dy;
        let newIdx = Math.round(currentY / ITEM_H);
        newIdx = Math.max(0, Math.min(configsSnap.current.length - 1, newIdx));
        if (newIdx !== cur) {
          const dir = newIdx > cur ? 'down' : 'up';
          for (let i = 0; i < Math.abs(newIdx - cur); i++) moveConfig(dragIdRef.current!, dir);
          dragCurIdx.current = newIdx; dragStartY.current = newIdx * ITEM_H; dragAnim.setValue(0);
        }
      }
      // Handle prompt drag
      if (pdragIdRef.current) {
        pdragAnim.setValue(g.dy);
        const cur = pdragCurIdx.current;
        const currentY = pdragStartY.current + g.dy;
        let newIdx = Math.round(currentY / ITEM_H);
        newIdx = Math.max(0, Math.min(promptsSnap.current.length - 1, newIdx));
        if (newIdx !== cur) {
          const dir = newIdx > cur ? 'down' : 'up';
          for (let i = 0; i < Math.abs(newIdx - cur); i++) movePrompt(pdragIdRef.current!, dir);
          pdragCurIdx.current = newIdx; pdragStartY.current = newIdx * ITEM_H; pdragAnim.setValue(0);
        }
      }
    },
    onPanResponderRelease: () => {
      dragAnim.setValue(0); pdragAnim.setValue(0);
      dragIdRef.current = null; setDragId(null);
      pdragIdRef.current = null; setPdragId(null);
    },
  }), [moveConfig, movePrompt]);

  useEffect(() => { if (visible) { resetConfigWorkspace(); resetPromptWorkspace(); } }, [visible]);

  // ---- Reset helpers ----
  const resetConfigWorkspace = () => {
    setProvider('deepseek'); setApiKey(''); setBaseURL(getDefaultURL('deepseek'));
    setModel(PROVIDERS.deepseek.models[0]?.id || ''); setTemperature('0.7');
    setMaxTokens('4096'); setConfigName(''); setEditingConfigId(null);
  };
  const resetPromptWorkspace = () => {
    setPromptName(''); setPromptContent(''); setEditingPromptId(null); setPromptInputHeight(120);
  };

  const populateConfigWorkspace = (cfg: ApiConfig) => {
    setEditingConfigId(cfg.id); setConfigName(cfg.name); setProvider(cfg.provider);
    setApiKey(cfg.apiKey); setBaseURL(cfg.baseURL || getDefaultURL(cfg.provider));
    setModel(cfg.model); setTemperature(String(cfg.temperature)); setMaxTokens(String(cfg.maxTokens));
  };
  const populatePromptWorkspace = (p: SystemPrompt) => {
    setEditingPromptId(p.id); setPromptName(p.name); setPromptContent(p.content);
    setPromptInputHeight(Math.max(120, Math.min(400, p.content.split('\n').length * 22 + 40)));
  };

  const handleProviderChange = (pid: ProviderId) => {
    setProvider(pid); setBaseURL(getDefaultURL(pid));
    if (pid !== 'custom' && PROVIDERS[pid].models.length > 0) setModel(PROVIDERS[pid].models[0].id);
    else setModel('');
  };

  // ---- Config clicks ----
  const handleConfigClick = (cfg: ApiConfig) => {
    if (dragIdRef.current) return;
    if (isSessionMode) {
      toggleSessionConfig(sessionId!, cfg.id);
    } else {
      if (editingConfigId === cfg.id) resetConfigWorkspace();
      else populateConfigWorkspace(cfg);
    }
  };

  const handleConfigLongPress = (cfg: ApiConfig) => {
    if (isSessionMode) return;
    Vibration.vibrate(50);
    const idx = configsSnap.current.findIndex((c) => c.id === cfg.id);
    if (idx < 0) return;
    // In global mode: long press = drag to reorder (or tap for edit)
    // Only start drag if not already editing this config
    dragIdRef.current = cfg.id; setDragId(cfg.id);
    dragStartY.current = idx * ITEM_H; dragCurIdx.current = idx; dragAnim.setValue(0);
  };

  // ---- Prompt clicks ----
  const handlePromptClick = (p: SystemPrompt) => {
    if (pdragIdRef.current) return;
    if (isSessionMode) {
      setSessionPrompt(sessionId!, sessionPromptId === p.id ? null : p.id);
    } else {
      if (editingPromptId === p.id) resetPromptWorkspace();
      else populatePromptWorkspace(p);
    }
  };

  const handlePromptLongPress = (p: SystemPrompt) => {
    if (isSessionMode) return;
    Vibration.vibrate(50);
    const idx = promptsSnap.current.findIndex((pr) => pr.id === p.id);
    if (idx < 0) return;
    pdragIdRef.current = p.id; setPdragId(p.id);
    pdragStartY.current = idx * ITEM_H; pdragCurIdx.current = idx; pdragAnim.setValue(0);
  };

  // ---- Save config ----
  const handleSaveConfig = () => {
    if (!configName.trim()) { Alert.alert('提示', '请输入配置名称'); return; }
    const temp = parseFloat(temperature);
    if (isNaN(temp) || temp < 0 || temp > 2) { Alert.alert('错误', 'Temperature 需在 0-2 之间'); return; }
    const mt = parseInt(maxTokens);
    if (isNaN(mt) || mt < 1 || mt > 131072) { Alert.alert('错误', 'Max Tokens 需在 1-131072 之间'); return; }
    saveConfig({ id: editingConfigId || genId(), name: configName.trim(), provider, apiKey: apiKey.trim(), baseURL: baseURL.trim(), model, temperature: temp, maxTokens: mt });
    if (isSessionMode && editingConfigId) toggleSessionConfig(sessionId!, editingConfigId);
    Alert.alert('已保存'); resetConfigWorkspace();
  };

  // ---- Save prompt ----
  const handleSavePrompt = () => {
    if (!promptName.trim()) { Alert.alert('提示', '请输入提示词名称'); return; }
    if (!promptContent.trim()) { Alert.alert('提示', '请输入提示词内容'); return; }
    const err = validatePrompt(promptContent);
    if (err) { Alert.alert('提示词格式错误', err); return; }
    savePrompt({ id: editingPromptId || genId(), name: promptName.trim(), content: promptContent.trim() });
    if (isSessionMode && editingPromptId) setSessionPrompt(sessionId!, editingPromptId);
    Alert.alert('已保存'); resetPromptWorkspace();
  };

  const isCustom = provider === 'custom';

  const renderConfigItem = (item: ApiConfig) => {
    const isDragging = dragId === item.id;
    const isSelected = isSessionMode ? sessionConfigIds.includes(item.id) : item.id === editingConfigId;
    const pName = PROVIDERS[item.provider]?.name || item.provider;
    return (
      <Animated.View style={isDragging ? { transform: [{ translateY: dragAnim }], zIndex: 100, elevation: 10, opacity: 0.9 } : undefined}>
        <TouchableOpacity style={[styles.savedItem, { backgroundColor: colors.bgCard, borderColor: colors.border }, isSelected && { borderColor: colors.accent, backgroundColor: colors.accent + '18' }]} onPress={() => handleConfigClick(item)} onLongPress={() => handleConfigLongPress(item)} activeOpacity={0.7}>
          <View style={styles.savedLeft}>
            <Text style={[styles.savedName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.savedMeta, { color: colors.textSecondary }]}>{pName} · {item.model}</Text>
          </View>
          {isSelected && <Text style={styles.activeMark}>✓</Text>}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderPromptItem = (item: SystemPrompt) => {
    const isDragging = pdragId === item.id;
    const isSelected = isSessionMode ? item.id === sessionPromptId : item.id === editingPromptId;
    return (
      <Animated.View style={isDragging ? { transform: [{ translateY: pdragAnim }], zIndex: 100, elevation: 10, opacity: 0.9 } : undefined}>
        <TouchableOpacity style={[styles.savedItem, { backgroundColor: colors.bgCard, borderColor: colors.border }, isSelected && { borderColor: colors.accent, backgroundColor: colors.accent + '18' }]} onPress={() => handlePromptClick(item)} onLongPress={() => handlePromptLongPress(item)} activeOpacity={0.7}>
          <View style={styles.savedLeft}>
            <Text style={[styles.savedName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.savedMeta, { color: colors.textSecondary }]} numberOfLines={1}>{item.content.replace(/\n/g, ' ').slice(0, 60)}</Text>
          </View>
          {isSelected && <Text style={styles.activeMark}>✓</Text>}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const title = isSessionMode ? '会话设置' : '全局设置';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.bg }]} {...configPan.panHandlers}>
        <View style={[styles.header, { backgroundColor: colors.bgHeader, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={onClose}><Text style={[styles.closeBtn, { color: colors.accent }]}>关闭</Text></TouchableOpacity>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false} scrollEnabled={dragId === null && pdragId === null}>

          {/* ========== API 配置 ========== */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>API 配置</Text>
          {apiConfigs.length === 0 ? <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>暂无配置</Text> : (
            <View style={{ minHeight: apiConfigs.length * ITEM_H + 8 }}>
              {apiConfigs.map((item) => <View key={item.id} style={{ height: ITEM_H }}>{renderConfigItem(item)}</View>)}
            </View>
          )}

          {!isSessionMode && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{editingConfigId ? '编辑 API 配置' : '新建 API 配置'}</Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>服务商</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.providerRow}>
                {PROVIDER_LIST.map((p) => (
                  <TouchableOpacity key={p.id} style={[styles.providerBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }, provider === p.id && styles.providerBtnActive]} onPress={() => handleProviderChange(p.id)}>
                    <Text style={[{ color: colors.text }, provider === p.id && styles.providerBtnTextActive]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.providerBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }, provider === 'custom' && styles.providerBtnActive]} onPress={() => handleProviderChange('custom')}>
                  <Text style={[{ color: colors.text }, provider === 'custom' && styles.providerBtnTextActive]}>自定义</Text>
                </TouchableOpacity>
              </View></ScrollView>
              <Text style={[styles.label, { color: colors.textSecondary }]}>配置名称</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]} value={configName} onChangeText={setConfigName} placeholder="例如: 我的 DeepSeek" placeholderTextColor={colors.textSecondary} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>API Key</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]} value={apiKey} onChangeText={setApiKey} placeholder="sk-xxxx" placeholderTextColor={colors.textSecondary} secureTextEntry autoCapitalize="none" />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Base URL</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]} value={baseURL} onChangeText={setBaseURL} placeholder={getDefaultURL(provider)} placeholderTextColor={colors.textSecondary} autoCapitalize="none" keyboardType="url" />
              <Text style={[styles.label, { color: colors.textSecondary }]}>模型</Text>
              {isCustom ? <TextInput style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]} value={model} onChangeText={setModel} placeholder="输入模型 ID" placeholderTextColor={colors.textSecondary} /> : (
                <View style={styles.modelGrid}>{PROVIDERS[provider].models.map((m) => <TouchableOpacity key={m.id} style={[styles.modelBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }, model === m.id && styles.modelBtnActive]} onPress={() => setModel(m.id)}><Text style={[{ color: colors.text }, model === m.id && styles.modelBtnTextActive]}>{m.name}</Text></TouchableOpacity>)}</View>
              )}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Temperature (0-2)</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]} value={temperature} onChangeText={setTemperature} placeholder="0.7" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Max Tokens</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]} value={maxTokens} onChangeText={setMaxTokens} placeholder="4096" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" />
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={handleSaveConfig}>
                <Text style={styles.saveBtnText}>{editingConfigId ? '更新配置' : '保存为新配置'}</Text>
              </TouchableOpacity>
              {editingConfigId && (
                <TouchableOpacity style={styles.cancelBtnWrap} onPress={() => {
                  Alert.alert('删除配置', `确定删除"${configName}"？`, [
                    { text: '取消', style: 'cancel' },
                    { text: '删除', style: 'destructive', onPress: () => { deleteConfig(editingConfigId); resetConfigWorkspace(); } },
                  ]);
                }}><Text style={[styles.cancelText, { color: colors.danger }]}>删除该项</Text></TouchableOpacity>
              )}
            </>
          )}
          {isSessionMode && sessionConfigIds.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => sessionConfigIds.forEach((cid) => toggleSessionConfig(sessionId!, cid))}><Text style={[styles.clearText, { color: colors.danger }]}>清除所有会话 API 配置</Text></TouchableOpacity>
          )}

          {/* ========== 系统提示词 ========== */}
          <View style={styles.bigDivider} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>系统提示词</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>提示词中的 <Text style={styles.codeText}>####正文####</Text> 标记会在发送时自动替换为用户输入的内容。整个提示词只能有 0 或 1 个标记。</Text>

          {prompts.length === 0 ? <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>暂无提示词</Text> : (
            <View style={{ minHeight: prompts.length * ITEM_H + 8 }}>
              {prompts.map((item) => <View key={item.id} style={{ height: ITEM_H }}>{renderPromptItem(item)}</View>)}
            </View>
          )}

          {!isSessionMode && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{editingPromptId ? '编辑提示词' : '新建提示词'}</Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>提示词名称</Text>
              <TextInput style={styles.input} value={promptName} onChangeText={setPromptName} placeholder="例如: 编程助手" placeholderTextColor="#b0b0b0" />
              <Text style={styles.label}>提示词内容</Text>
              <Text style={styles.hint}>输入提示词内容。需要插入用户消息的位置请使用 <Text style={styles.codeText}>####正文####</Text> 作为占位标记。</Text>
              <TextInput
                style={[styles.input, styles.promptInput, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
                value={promptContent} onChangeText={(t) => { setPromptContent(t); setPromptInputHeight(Math.max(120, Math.min(400, t.split('\n').length * 22 + 40))); }}
                placeholder={"你是一个专业的编程助手。\n\n用户的问题：####正文####\n\n请用简洁的中文回答。"}
                placeholderTextColor="#c0c0c0" multiline textAlignVertical="top"
              />
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={handleSavePrompt}>
                <Text style={styles.saveBtnText}>{editingPromptId ? '更新提示词' : '保存为新提示词'}</Text>
              </TouchableOpacity>
              {editingPromptId && (
                <TouchableOpacity style={styles.cancelBtnWrap} onPress={() => {
                  Alert.alert('删除提示词', `确定删除"${promptName}"？`, [
                    { text: '取消', style: 'cancel' },
                    { text: '删除', style: 'destructive', onPress: () => { deletePrompt(editingPromptId); resetPromptWorkspace(); } },
                  ]);
                }}><Text style={[styles.cancelText, { color: colors.danger }]}>删除该项</Text></TouchableOpacity>
              )}
            </>
          )}
          {isSessionMode && sessionPromptId && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setSessionPrompt(sessionId!, null)}><Text style={[styles.clearText, { color: colors.danger }]}>清除会话专属提示词</Text></TouchableOpacity>
          )}

          {/* ========== 内容溢出策略（仅会话模式） ========== */}
          {isSessionMode && (
            <>
              <View style={styles.bigDivider} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>内容溢出策略</Text>

              {/* Scroll */}
              <TouchableOpacity
                style={[styles.savedItem, { backgroundColor: colors.bgCard, borderColor: colors.border }, sessionOverflow === 'scroll' && { borderColor: colors.accent, backgroundColor: colors.accent + '18' }]}
                onPress={() => updateSessionOverflow(sessionId!, { overflowStrategy: 'scroll' })}
                activeOpacity={0.7}
              >
                <View style={styles.savedLeft}>
                  <Text style={[styles.savedName, { color: colors.text }]}>滚动刷新</Text>
                  <Text style={[styles.savedMeta, { color: colors.textSecondary }]}>上下文溢出时直接覆盖旧内容，模型丢失早期记忆。多 API 独立运作，互不影响。</Text>
                </View>
                {sessionOverflow === 'scroll' && <Text style={[styles.activeMark, { color: colors.accent }]}>✓</Text>}
              </TouchableOpacity>

              {/* Preset */}
              <TouchableOpacity
                style={[styles.savedItem, { backgroundColor: colors.bgCard, borderColor: colors.border, marginTop: 6 }, sessionOverflow === 'preset' && { borderColor: colors.accent, backgroundColor: colors.accent + '18' }]}
                onPress={() => updateSessionOverflow(sessionId!, { overflowStrategy: 'preset' })}
                activeOpacity={0.7}
              >
                <View style={styles.savedLeft}>
                  <Text style={[styles.savedName, { color: colors.text }]}>系统预设提示词</Text>
                  <Text style={[styles.savedMeta, { color: colors.textSecondary }]}>接近上限时自动请求模型总结对话主旨，下次消息附带连续性上下文。</Text>
                </View>
                {sessionOverflow === 'preset' && <Text style={[styles.activeMark, { color: colors.accent }]}>✓</Text>}
              </TouchableOpacity>

              {/* Custom */}
              <TouchableOpacity
                style={[styles.savedItem, { backgroundColor: colors.bgCard, borderColor: colors.border, marginTop: 6 }, sessionOverflow === 'custom' && { borderColor: colors.accent, backgroundColor: colors.accent + '18' }]}
                onPress={() => updateSessionOverflow(sessionId!, { overflowStrategy: 'custom' })}
                activeOpacity={0.7}
              >
                <View style={styles.savedLeft}>
                  <Text style={[styles.savedName, { color: colors.text }]}>自定义提示词</Text>
                  <Text style={[styles.savedMeta, { color: colors.textSecondary }]}>自行编写总结提示词，更具针对性的延续策略。</Text>
                </View>
                {sessionOverflow === 'custom' && <Text style={[styles.activeMark, { color: colors.accent }]}>✓</Text>}
              </TouchableOpacity>

              {/* Critical tokens input (for preset or custom) */}
              {sessionOverflow !== 'scroll' && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>临界 Tokens 剩余数</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
                    value={String(sessionCriticalTokens)}
                    onChangeText={(t) => {
                      const n = parseInt(t);
                      if (!isNaN(n) && n > 0) updateSessionOverflow(sessionId!, { criticalTokens: n });
                    }}
                    placeholder="1024"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    当已消耗 Token 超过 (MaxTokens - 临界值 - MaxTokens×10%) 时触发总结请求。
                    当前总消耗约 {totalInputTokens + totalOutputTokens} Tok。
                  </Text>

                  {sessionOverflow === 'custom' && (
                    <>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>自定义总结提示词</Text>
                      <TextInput
                        style={[styles.input, styles.promptInput, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text, height: 100 }]}
                        value={sessionCustomOverflow}
                        onChangeText={(t) => updateSessionOverflow(sessionId!, { customOverflowPrompt: t })}
                        placeholder="输入自定义的总结提示词..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        textAlignVertical="top"
                      />
                    </>
                  )}
                </View>
              )}
            </>
          )}
          {/* ========== 会话功能开关（仅会话模式） ========== */}
          {isSessionMode && (
            <>
              <View style={styles.bigDivider} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>会话功能</Text>
              <TouchableOpacity
                style={[styles.savedItem, { backgroundColor: colors.bgCard, borderColor: colors.border, marginTop: 8 }, sessionShowStats && { borderColor: colors.accent, backgroundColor: colors.accent + '18' }]}
                onPress={() => toggleSessionStats(sessionId!)}
                activeOpacity={0.7}
              >
                <View style={styles.savedLeft}>
                  <Text style={[styles.savedName, { color: colors.text }]}>显示系统信息</Text>
                  <Text style={[styles.savedMeta, { color: colors.textSecondary }]}>消息气泡下显示时间、Token、响应速度</Text>
                </View>
                {sessionShowStats && <Text style={[styles.activeMark, { color: colors.accent }]}>✓</Text>}
              </TouchableOpacity>

              {/* Show thinking toggle */}
              <TouchableOpacity
                style={[styles.savedItem, { backgroundColor: colors.bgCard, borderColor: colors.border, marginTop: 6 }, session?.showThinking && { borderColor: colors.accent, backgroundColor: colors.accent + '18' }]}
                onPress={() => toggleSessionThinking(sessionId!)}
                activeOpacity={0.7}
              >
                <View style={styles.savedLeft}>
                  <Text style={[styles.savedName, { color: colors.text }]}>显示思考过程</Text>
                  <Text style={[styles.savedMeta, { color: colors.textSecondary }]}>DeepSeek/Claude/Gemini 等模型的思考内容以折叠方式展示</Text>
                </View>
                {session?.showThinking && <Text style={[styles.activeMark, { color: colors.accent }]}>✓</Text>}
              </TouchableOpacity>

              {/* Quote display length */}
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>引用输入框显示长度</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
                  value={String(session?.quoteDisplayLength ?? 12)}
                  onChangeText={(t) => {
                    const n = parseInt(t);
                    if (!isNaN(n) && n > 0 && sessionId) updateSessionOverflow(sessionId, { quoteDisplayLength: n } as any);
                  }}
                  placeholder="12"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  引用标签中显示的最大字符数。超出以…替代。
                </Text>
              </View>

              {/* Quote length setting */}
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>引用转译字符长度</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
                  value={String(session?.quoteLength ?? 200)}
                  onChangeText={(t) => {
                    const n = parseInt(t);
                    if (!isNaN(n) && n > 0 && sessionId) updateSessionOverflow(sessionId, { quoteLength: n } as any);
                  }}
                  placeholder="200"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  引用消息时截取的最大字符数。超出部分以……替代。
                </Text>
              </View>

              {sessionShowStats && (
                <View style={{ marginTop: 12, backgroundColor: colors.bgCard, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={[styles.savedName, { color: colors.text, marginBottom: 8 }]}>Token 消耗统计</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[styles.savedMeta, { color: colors.textSecondary }]}>输入</Text>
                    <Text style={{ fontSize: 13, color: colors.text }}>{totalInputTokens} / {configMaxTokens}</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                    <View style={{ height: 6, width: `${Math.min(100, (totalInputTokens / configMaxTokens) * 100)}%` as any, backgroundColor: '#007aff', borderRadius: 3 }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[styles.savedMeta, { color: colors.textSecondary }]}>输出</Text>
                    <Text style={{ fontSize: 13, color: colors.text }}>{totalOutputTokens} / {configMaxTokens}</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                    <View style={{ height: 6, width: `${Math.min(100, (totalOutputTokens / configMaxTokens) * 100)}%` as any, backgroundColor: colors.accent, borderRadius: 3 }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.savedName, { color: colors.text }]}>总计</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{totalTokens} Tok</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* ========== 系统 UI (仅全局模式) ========== */}
          {!isSessionMode && (
            <>
              <View style={styles.bigDivider} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>系统 UI</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.themeBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }, theme === 'system' && styles.themeBtnActive]}
                  onPress={() => setThemeMode('system')}
                >
                  <Text style={[{ color: colors.text }, theme === 'system' && styles.themeBtnTextActive]}>📱 跟随系统</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }, theme === 'light' && styles.themeBtnActive]}
                  onPress={() => setThemeMode('light')}
                >
                  <Text style={[{ color: colors.text }, theme === 'light' && styles.themeBtnTextActive]}>☀️ 浅色</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }, theme === 'dark' && styles.themeBtnActive]}
                  onPress={() => setThemeMode('dark')}
                >
                  <Text style={[{ color: colors.text }, theme === 'dark' && styles.themeBtnTextActive]}>🌙 深色</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = {
  container: { flex: 1 },
  header: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 20, fontWeight: '700' as const },
  closeBtn: { fontSize: 16 },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, marginBottom: 10 },
  emptyHint: { fontSize: 14, marginBottom: 12 },
  hint: { fontSize: 12, marginBottom: 8, lineHeight: 18 },
  codeText: { fontFamily: 'monospace', fontWeight: '600' as const },
  savedItem: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 6, borderWidth: 1 },
  savedLeft: { flex: 1 },
  savedName: { fontSize: 16, fontWeight: '600' as const },
  savedMeta: { fontSize: 13, marginTop: 2 },
  activeMark: { fontSize: 18, fontWeight: '700' as const },
  divider: { height: 1, marginVertical: 14 },
  bigDivider: { height: 6, marginVertical: 20, borderRadius: 3 },
  label: { fontSize: 14, fontWeight: '600' as const, marginBottom: 6, marginTop: 14 },
  providerRow: { flexDirection: 'row' as const, gap: 8 as const },
  providerBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  providerBtnActive: { backgroundColor: '#07c160' as const, borderColor: '#07c160' as const },
  providerBtnTextActive: { color: '#ffffff' as const },
  input: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, borderWidth: StyleSheet.hairlineWidth },
  promptInput: { textAlignVertical: 'top' as const, minHeight: 120 },
  modelGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 as const },
  modelBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  modelBtnActive: { backgroundColor: '#07c160' as const, borderColor: '#07c160' as const },
  modelBtnTextActive: { color: '#ffffff' as const },
  saveBtn: { marginTop: 20, borderRadius: 8, paddingVertical: 14, alignItems: 'center' as const },
  saveBtnText: { fontSize: 17, fontWeight: '600' as const },
  cancelBtnWrap: { marginTop: 12, alignItems: 'center' as const },
  cancelText: { fontSize: 15 },
  clearBtn: { marginTop: 14, alignItems: 'center' as const, paddingVertical: 12 },
  clearText: { fontSize: 15 },
  themeBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  themeBtnActive: { borderColor: '#07c160' as const, backgroundColor: '#07c160' as const + '18' },
  themeBtnTextActive: { color: '#07c160' as const, fontWeight: '700' as const },
};
