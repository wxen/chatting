import { useState, useEffect, useRef, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useChatContext } from '../context/ChatContext';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onAbort?: () => void;
  editingContent?: string | null;
  onConfirmEdit?: () => void;
  onCancelEdit?: () => void;
  quoteText?: string;
  onQuoteTextChange?: (text: string) => void;
}

// Quote format: [引用（角色）："内容"]
function makeQuoteTag(role: string, fullText: string, displayLen: number): string {
  const short = fullText.length > displayLen ? fullText.slice(0, displayLen) + '…' : fullText;
  return `[引用（${role}）："${short}"]`;
}

function findQuotePositions(text: string): { start: number; end: number }[] {
  const re = /\[引用（.+?）：".+?"\]/g;
  const positions: { start: number; end: number }[] = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    positions.push({ start: m.index, end: m.index + m[0].length });
  }
  return positions;
}

export function ChatInput({ onSend, disabled, isStreaming, onAbort, editingContent, onConfirmEdit, onCancelEdit, quoteText, onQuoteTextChange }: Props) {
  const { colors, currentSession } = useChatContext();
  const [text, setText] = useState('');
  const isEditing = editingContent != null;
  const inputRef = useRef<TextInput>(null);
  const displayLen = currentSession?.quoteDisplayLength ?? 12;

  useEffect(() => {
    if (editingContent != null) setText(editingContent);
  }, [editingContent]);

  // Insert quote tag when quoteText arrives
  useEffect(() => {
    if (quoteText && quoteText.length > 0) {
      const match = quoteText.match(/\[被引用的信息（(.+?)）：(.+?)\]/);
      if (match) {
        const role = match[1];
        const fullText = match[2];
        const tag = makeQuoteTag(role, fullText, displayLen);
        setText((prev) => prev + tag);
        onQuoteTextChange?.('');
      }
    }
  }, [quoteText]);

  const handleChangeText = useCallback((newText: string) => {
    // Block-level delete detection: if a quote tag was partially removed
    const oldPos = findQuotePositions(text);
    const newPos = findQuotePositions(newText);

    if (newPos.length < oldPos.length) {
      // Find which tag was removed/broken
      for (const op of oldPos) {
        const stillExists = newPos.find((np) => np.start === op.start && np.end === op.end);
        if (!stillExists) {
          // Remove the broken remains of this tag
          const before = newText.slice(0, op.start);
          const after = newText.slice(op.start).replace(/^\[引用[^\]]*\]?\s*/, '');
          setText(before + after);
          return;
        }
      }
    }
    setText(newText);
  }, [text]);

  const handlePress = () => {
    const userText = text.trim();
    if (!userText || disabled) return;
    // Expand quote tags back to full text
    let finalContent = userText;
    const re = /\[引用（(.+?)）："(.+?)"\]/g;
    finalContent = finalContent.replace(re, (_, role, _short) => {
      // We lost the full text; use what's available
      return `[被引用的信息（${role}）：${_short}]`;
    });
    onSend(finalContent);
    setText('');
    if (isEditing && onConfirmEdit) onConfirmEdit();
  };

  const s = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.bgHeader, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    editBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, backgroundColor: colors.accent + '20' },
    editText: { flex: 1, fontSize: 12, color: colors.accent },
    editCancel: { fontSize: 12, color: colors.textSecondary, marginLeft: 8 },
    inputWrap: { flex: 1, backgroundColor: colors.bgInput, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    input: { paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, maxHeight: 120, color: colors.text },
    button: { marginLeft: 8, backgroundColor: isStreaming ? colors.danger : (isEditing ? '#ff9500' : colors.accent), borderRadius: 6, paddingHorizontal: isStreaming ? 12 : 16, paddingVertical: 9, justifyContent: 'center', alignSelf: 'flex-end', marginBottom: 2 },
    buttonDisabled: { opacity: 0.4 },
    buttonText: { color: colors.textInverse, fontSize: 15, fontWeight: '600' },
  });

  return (
    <View>
      {isEditing && (
        <View style={s.editBanner}>
          <Text style={s.editText}>正在编辑消息</Text>
          <TouchableOpacity onPress={() => { setText(''); onCancelEdit?.(); }}>
            <Text style={s.editCancel}>取消</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={s.container}>
        <View style={s.inputWrap}>
          <TextInput
            ref={inputRef}
            style={s.input}
            value={text}
            onChangeText={handleChangeText}
            placeholder={isEditing ? '编辑消息...' : '输入消息...'}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={8192}
            editable={!disabled}
            onSubmitEditing={handlePress}
            blurOnSubmit={false}
            returnKeyType="send"
          />
        </View>
        <TouchableOpacity
          style={[s.button, !isStreaming && (!text.trim() || disabled) && s.buttonDisabled]}
          onPress={isStreaming ? onAbort : handlePress}
          disabled={!isStreaming && (!text.trim() || disabled)}
          activeOpacity={0.7}
        >
          <Text style={s.buttonText}>{isStreaming ? '终止' : isEditing ? '✓' : '发送'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
