import { useRef, useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, Keyboard, Platform, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useChatContext } from '../context/ChatContext';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { StreamBubble } from '../components/StreamBubble';
import { Message } from '../types/chat';

export function ChatScreen() {
  const { currentSession, isStreaming, streamingContent, sendMessage, editMessage, deleteMessages, colors, switchMessageVersion, abort } = useChatContext();
  const listRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [editingMsg, setEditingMsg] = useState<{ id: string; content: string } | null>(null);
  const [multiSelectIds, setMultiSelectIds] = useState<Set<string>>(new Set());
  const [quoteText, setQuoteText] = useState('');

  const messages = currentSession?.messages || [];
  const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === 'assistant' && !m.deleted);
  const avatar = currentSession?.avatar || '🤖';
  const showStats = currentSession?.showStats || false;
  const sessionId = currentSession?.id;
  const quoteLength = currentSession?.quoteLength ?? 200;

  const displayData: (Message & { _streaming?: boolean })[] = [...messages];
  if (isStreaming) displayData.push({ id: '__streaming__', role: 'assistant', content: streamingContent, timestamp: Date.now(), _streaming: true });

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => { setKeyboardHeight(e.endCoordinates.height + 20); setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150); });
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => { if (displayData.length > 0) requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false })); }, [displayData.length, isStreaming, streamingContent.length]);

  const handleSend = (content: string) => {
    if (editingMsg) {
      if (!content.trim()) {
        // Empty edit → prompt delete
        Alert.alert('是否删除本条信息', '编辑内容为空，确认删除该消息？', [
          { text: '取消', style: 'cancel', onPress: () => setEditingMsg(null) },
          { text: '确认删除', style: 'destructive', onPress: () => { deleteMessages(sessionId!, [editingMsg.id]); setEditingMsg(null); } },
        ]);
        return;
      }
      editMessage(sessionId!, editingMsg.id, content);
      setEditingMsg(null);
      return;
    }
    sendMessage(content);
    setQuoteText('');
  };

  const handleEditStart = (messageId: string, content: string) => setEditingMsg({ id: messageId, content });

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('已复制', '消息内容已复制到剪贴板');
  };

  const handleQuote = (content: string, role: string) => {
    const truncated = content.length > quoteLength ? content.slice(0, quoteLength) + '……' : content;
    setQuoteText((prev) => prev + `[被引用的信息（${role === 'user' ? '用户' : '助手'}）：${truncated}]`);
  };

  const handleToggleSelect = (messageId: string) => {
    setMultiSelectIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

  const handleBatchDelete = () => {
    if (multiSelectIds.size === 0) return;
    Alert.alert('确认删除', `删除选中的 ${multiSelectIds.size} 条消息？`, [
      { text: '取消', style: 'cancel' },
      { text: '确认删除', style: 'destructive', onPress: () => { deleteMessages(sessionId!, [...multiSelectIds]); setMultiSelectIds(new Set()); } },
    ]);
  };

  const handleBatchCopy = async () => {
    const selectedMsgs = messages.filter((m) => multiSelectIds.has(m.id));
    const text = selectedMsgs.map((m) => m.content).join('\n\n');
    await Clipboard.setStringAsync(text);
    Alert.alert('已复制', `已复制 ${multiSelectIds.size} 条消息`);
    setMultiSelectIds(new Set());
  };

  const isMultiSelect = multiSelectIds.size > 0;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    messages: { flex: 1 },
    list: { flexGrow: 1, paddingVertical: 12 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyTitle: { fontSize: 32, fontWeight: '700', color: colors.text, marginBottom: 8 },
    emptySubtitle: { fontSize: 16, color: colors.textSecondary },
    loadingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4 },
    loadingText: { marginLeft: 8, fontSize: 13, color: colors.textSecondary },
    batchBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.danger },
    batchText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    batchActions: { flexDirection: 'row', gap: 16 },
  });

  return (
    <View style={s.container}>
      {isMultiSelect && (
        <View style={s.batchBar}>
          <Text style={s.batchText}>已选 {multiSelectIds.size} 条</Text>
          <View style={s.batchActions}>
            <TouchableOpacity onPress={handleBatchCopy}><Text style={s.batchText}>一并复制</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleBatchDelete}><Text style={s.batchText}>一并删除</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setMultiSelectIds(new Set())}><Text style={[s.batchText, { opacity: 0.7 }]}>取消</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {currentSession ? (
        <FlatList ref={listRef} data={displayData} keyExtractor={(i) => i.id}
          renderItem={({ item }) => item._streaming ? <StreamBubble content={item.content} avatar={avatar} /> : (
            <MessageBubble message={item} sessionAvatar={avatar} showStats={showStats} sessionId={sessionId}
              isLatestAssistant={item.id === messages[lastAssistantIdx === 0 ? messages.length - 1 : messages.length - 1 - lastAssistantIdx]?.id}
              onEditStart={handleEditStart} onCopy={(text) => handleCopy(text)} onQuote={(text, role) => handleQuote(text, role)}
              onVersionSwitch={(msgId, dir) => switchMessageVersion(sessionId!, msgId, dir)}
              multiSelectMode={isMultiSelect} isSelected={multiSelectIds.has(item.id)}
              onToggleSelect={handleToggleSelect}
            />
          )}
          contentContainerStyle={s.list} style={s.messages}
        />
      ) : (
        <View style={s.emptyContainer}><Text style={s.emptyTitle}>闲聊</Text><Text style={s.emptySubtitle}>下方输入消息开始对话</Text></View>
      )}
      {isStreaming && !streamingContent && <View style={s.loadingRow}><ActivityIndicator size="small" color={colors.accent} /><Text style={s.loadingText}>思考中...</Text></View>}
      <View style={{ paddingBottom: keyboardHeight }}>
        <ChatInput onSend={handleSend} disabled={isStreaming} editingContent={editingMsg?.content ?? null}
          onConfirmEdit={() => setEditingMsg(null)} onCancelEdit={() => setEditingMsg(null)}
          quoteText={quoteText} onQuoteTextChange={setQuoteText} />
      </View>
    </View>
  );
}
