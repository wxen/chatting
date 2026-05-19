import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Message } from '../types/chat';
import { useChatContext } from '../context/ChatContext';
import { ActionSheet } from './ActionSheet';

interface Props {
  message: Message;
  sessionAvatar: string;
  showStats?: boolean;
  sessionId?: string;
  isLatestAssistant?: boolean;
  onEditStart?: (messageId: string, content: string) => void;
  onQuote?: (content: string, role: string) => void;
  onCopy?: (text: string) => void;
  multiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (messageId: string) => void;
  onVersionSwitch?: (messageId: string, direction: 'prev' | 'next') => void;
}

export function MessageBubble({ message, sessionAvatar, showStats, sessionId, isLatestAssistant, onEditStart, onQuote, onCopy, multiSelectMode, isSelected, onToggleSelect, onVersionSwitch }: Props) {
  const { colors, deleteMessage, regenerateMessage } = useChatContext();
  const [menuVisible, setMenuVisible] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const isUser = message.role === 'user';
  const isDeleted = message.deleted;
  const showAvatar = !isUser && !isDeleted && message.content.length > 0;
  const showInfo = showStats && !isDeleted && message.responseTimeMs != null;
  const showUserInfo = showStats && !isDeleted && isUser;
  const showApiLabel = !isUser && !isDeleted && !!message.apiConfigName && !message.content.startsWith('⚠️');
  const hasVersions = !isUser && !isDeleted && message.versions && message.versions.length > 1;
  const curVersion = message.currentVersion ?? 0;

  const handleLongPress = () => {
    if (!sessionId || multiSelectMode) return;
    setMenuVisible(true);
  };

  const handlePress = () => {
    if (multiSelectMode && onToggleSelect) onToggleSelect(message.id);
  };

  const menuActions = isDeleted ? [] : [
    { text: '编辑', onPress: () => onEditStart?.(message.id, message.content) },
    { text: '复制', onPress: () => onCopy?.(message.content) },
    { text: '引用', onPress: () => onQuote?.(message.content, message.role) },
    { text: '多选', onPress: () => onToggleSelect?.(message.id) },
    { text: '删除', danger: true, onPress: () => {
      setMenuVisible(false);
      setTimeout(() => {
        Alert.alert('确认删除', '删除后占位文本替代', [
          { text: '取消', style: 'cancel' },
          { text: '确认删除', style: 'destructive', onPress: () => deleteMessage(sessionId!, message.id) },
        ]);
      }, 200);
    }},
  ];

  const s = StyleSheet.create({
    row: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 4, alignItems: 'flex-end' },
    userRow: { justifyContent: 'flex-end' },
    avatarBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    avatarText: { fontSize: 18 }, avatarSpacer: { width: 44 },
    bubble: { maxWidth: '72%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    userBubble: { backgroundColor: colors.bgBubbleUser, borderBottomRightRadius: 4 },
    assistantBubble: { backgroundColor: colors.bgBubbleAssistant, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
    selectedBubble: { opacity: 0.35 },
    deletedBubble: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' as const, opacity: 0.6 },
    text: { fontSize: 16, lineHeight: 23 },
    userText: { color: colors.bubbleTextUser }, assistantText: { color: colors.bubbleTextAssistant },
    deletedText: { color: colors.textSecondary, fontStyle: 'italic' as const },
    statsRow: { flexDirection: 'row', marginTop: 4, paddingLeft: 48, gap: 6 },
    userStatsRow: { flexDirection: 'row', marginTop: 4, justifyContent: 'flex-end', paddingRight: 14, gap: 6 },
    statText: { fontSize: 10, color: colors.textSecondary },
    apiLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 4, paddingLeft: 48, fontStyle: 'italic' as const },
    regenRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 48, marginTop: 4, gap: 6 },
    regenBtn: { paddingHorizontal: 6, paddingVertical: 2 },
    regenText: { fontSize: 14, color: colors.textSecondary },
    regenActive: { color: colors.accent },
  });

  return (
    <View>
      <TouchableOpacity activeOpacity={0.8} onLongPress={handleLongPress} onPress={handlePress}>
        <View style={[s.row, isUser && s.userRow]}>
          {showAvatar && <View style={s.avatarBox}><Text style={s.avatarText}>{sessionAvatar}</Text></View>}
          {!isUser && !isDeleted && !showAvatar && <View style={s.avatarSpacer} />}
          {isDeleted && <View style={s.avatarSpacer} />}
          <View style={[s.bubble, isDeleted ? s.deletedBubble : isSelected ? s.selectedBubble : (isUser ? s.userBubble : s.assistantBubble)]}>
            <Text style={[s.text, isDeleted ? s.deletedText : (isUser ? s.userText : s.assistantText)]}>{message.content}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Thinking content */}
      {!isUser && !isDeleted && message.thinkingContent && (
        <View style={{ paddingLeft: 48, marginTop: 4 }}>
          <TouchableOpacity onPress={() => setShowThinking(!showThinking)} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[s.statText, { color: colors.textSecondary }]}>
              {showThinking ? '▾' : '▸'} 思考过程
            </Text>
          </TouchableOpacity>
          {showThinking && (
            <View style={{ backgroundColor: colors.bgCard, borderRadius: 8, padding: 10, marginTop: 4, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20, fontStyle: 'italic' }}>
                {message.thinkingContent}
              </Text>
            </View>
          )}
        </View>
      )}

      {isLatestAssistant && !isDeleted && !isUser && (
        <View style={s.regenRow}>
          <TouchableOpacity onPress={() => regenerateMessage(sessionId!, message.id)} style={s.regenBtn}>
            <Text style={s.regenText}>↻</Text>
          </TouchableOpacity>
          {hasVersions && (
            <>
              <TouchableOpacity onPress={() => onVersionSwitch?.(message.id, 'prev')} style={s.regenBtn}>
                <Text style={[s.regenText, curVersion > 0 && s.regenActive]}>◀</Text>
              </TouchableOpacity>
              <Text style={[s.statText, { color: colors.textSecondary }]}>{curVersion + 1}/{message.versions!.length}</Text>
              <TouchableOpacity onPress={() => onVersionSwitch?.(message.id, 'next')} style={s.regenBtn}>
                <Text style={[s.regenText, curVersion < (message.versions?.length || 1) - 1 && s.regenActive]}>▶</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
      {showApiLabel && <Text style={s.apiLabel}>via {message.apiConfigName}</Text>}
      {showInfo && (
        <View style={s.statsRow}>
          <Text style={s.statText}>{new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
          <Text style={s.statText}>·</Text><Text style={s.statText}>{message.tokenCount} Tok</Text>
          <Text style={s.statText}>·</Text><Text style={s.statText}>{(message.responseTimeMs! / 1000).toFixed(1)}s</Text>
          <Text style={s.statText}>·</Text><Text style={s.statText}>{(message.tokenCount! / (message.responseTimeMs! / 1000)).toFixed(1)} t/s</Text>
        </View>
      )}
      {showUserInfo && (
        <View style={s.userStatsRow}>
          <Text style={s.statText}>{new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
          <Text style={s.statText}>·</Text><Text style={s.statText}>~{Math.max(1, Math.round(message.content.length / 3.2))} Tok</Text>
        </View>
      )}
      <ActionSheet visible={menuVisible} title="消息操作" actions={menuActions} onClose={() => setMenuVisible(false)} />
    </View>
  );
}
