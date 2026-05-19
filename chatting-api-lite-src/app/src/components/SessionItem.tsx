import { useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated, PanResponder } from 'react-native';
import { ChatSession } from '../types/chat';
import { useChatContext } from '../context/ChatContext';

const ACTION_WIDTH = 180;

interface Props {
  session: ChatSession; isActive: boolean;
  onPress: () => void; onLongPress: () => void;
  onEdit: () => void; onPin: () => void; onMarkUnread: () => void; onDelete: () => void;
}

export function SessionItem({ session, onPress, onLongPress, onEdit, onPin, onMarkUnread, onDelete }: Props) {
  const { colors } = useChatContext();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const swipePan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => { const base = isOpen.current ? -ACTION_WIDTH : 0; slideAnim.setValue(Math.min(0, Math.max(-ACTION_WIDTH, base + g.dx))); },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -50 && !isOpen.current) { Animated.spring(slideAnim, { toValue: -ACTION_WIDTH, useNativeDriver: true }).start(); isOpen.current = true; }
      else if (g.dx > 50 && isOpen.current) { Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start(); isOpen.current = false; }
      else { Animated.spring(slideAnim, { toValue: isOpen.current ? -ACTION_WIDTH : 0, useNativeDriver: true }).start(); }
    },
  })).current;

  const closeSwipe = () => { Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start(); isOpen.current = false; };

  const lastMsg = session.messages.length > 0 ? session.messages[session.messages.length - 1] : null;
  const preview = lastMsg ? lastMsg.content.replace(/\n/g, ' ').slice(0, 50) : '点击开始对话';
  const time = new Date(session.updatedAt);
  const timeStr = time.toDateString() === new Date().toDateString()
    ? time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : time.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  const showBadge = session.unreadCount > 0;

  const s = StyleSheet.create({
    wrapper: { position: 'relative', backgroundColor: colors.border },
    actions: { position: 'absolute', right: 0, top: 0, bottom: 0, width: ACTION_WIDTH, flexDirection: 'row', alignItems: 'stretch' },
    actionEdit: { backgroundColor: '#007aff', justifyContent: 'center', alignItems: 'center', flex: 1 },
    actionPin: { backgroundColor: '#ff9500', justifyContent: 'center', alignItems: 'center', flex: 1 },
    actionUnread: { backgroundColor: '#5856d6', justifyContent: 'center', alignItems: 'center', flex: 1 },
    actionDelete: { backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center', flex: 1 },
    actionText: { color: '#ffffff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
    content: { backgroundColor: colors.bgCard, zIndex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    pinnedRow: { backgroundColor: colors.bgPinned },
    avatar: { width: 48, height: 48, borderRadius: 6, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 26 },
    info: { flex: 1 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    titleRow: { flexDirection: 'row', alignItems: 'center', maxWidth: '70%' },
    pinMark: { fontSize: 12 },
    title: { fontSize: 16, fontWeight: '600', color: colors.text },
    time: { fontSize: 12, color: colors.textSecondary },
    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    preview: { fontSize: 14, color: colors.textSecondary, flex: 1 },
    badge: { backgroundColor: colors.danger, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, marginLeft: 8 },
    badgeText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
  });

  return (
    <View style={s.wrapper}>
      <View style={s.actions}>
        <TouchableOpacity style={s.actionEdit} onPress={() => { closeSwipe(); onEdit(); }}><Text style={s.actionText}>编辑</Text></TouchableOpacity>
        <TouchableOpacity style={s.actionPin} onPress={() => { closeSwipe(); onPin(); }}><Text style={s.actionText}>{session.pinned ? '取消置顶' : '置顶'}</Text></TouchableOpacity>
        <TouchableOpacity style={s.actionUnread} onPress={() => { closeSwipe(); onMarkUnread(); }}><Text style={s.actionText}>未读</Text></TouchableOpacity>
        <TouchableOpacity style={s.actionDelete} onPress={() => { closeSwipe(); onDelete(); }}><Text style={s.actionText}>删除</Text></TouchableOpacity>
      </View>
      <Animated.View style={[s.content, { transform: [{ translateX: slideAnim }] }]} {...swipePan.panHandlers}>
        <TouchableOpacity style={[s.row, session.pinned && s.pinnedRow]} onPress={() => { if (!isOpen.current) onPress(); }} onLongPress={onLongPress} activeOpacity={0.7}>
          <View style={s.avatar}><Text style={s.avatarText}>{session.avatar}</Text></View>
          <View style={s.info}>
            <View style={s.topRow}>
              <View style={s.titleRow}>{session.pinned && <Text style={s.pinMark}>📌 </Text>}<Text style={s.title} numberOfLines={1}>{session.title}</Text></View>
              <Text style={s.time}>{timeStr}</Text>
            </View>
            <View style={s.bottomRow}>
              <Text style={s.preview} numberOfLines={1}>{preview}</Text>
              {showBadge && <View style={s.badge}><Text style={s.badgeText}>{session.unreadCount > 99 ? '99+' : session.unreadCount}</Text></View>}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
