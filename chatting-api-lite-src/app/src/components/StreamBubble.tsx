import { View, Text, StyleSheet } from 'react-native';
import { useChatContext } from '../context/ChatContext';

interface Props { content: string; avatar: string; }

export function StreamBubble({ content, avatar }: Props) {
  const { colors } = useChatContext();
  if (!content) return null;
  const s = StyleSheet.create({
    row: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 4, alignItems: 'flex-end' },
    avatarBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    avatarText: { fontSize: 18 },
    bubble: { maxWidth: '72%', borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.bgBubbleAssistant, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', flexWrap: 'wrap' },
    text: { fontSize: 16, lineHeight: 23, color: colors.bubbleTextAssistant },
    cursor: { width: 2, height: 16, backgroundColor: colors.accent, marginLeft: 2, alignSelf: 'flex-end' },
  });
  return (
    <View style={s.row}>
      <View style={s.avatarBox}><Text style={s.avatarText}>{avatar}</Text></View>
      <View style={s.bubble}><Text style={s.text}>{content}</Text><View style={s.cursor} /></View>
    </View>
  );
}
