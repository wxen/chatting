import { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Animated,
  PanResponder, Vibration,
} from 'react-native';
import { useChatContext } from '../context/ChatContext';
import { SessionItem } from '../components/SessionItem';
import { SessionEditModal } from '../components/SessionEditModal';
import { NewSessionModal } from '../components/NewSessionModal';
import { ChatSession } from '../types/chat';

interface Props { onEnterChat: () => void; }
const ITEM_H = 78;

export function SessionListScreen({ onEnterChat }: Props) {
  const {
    sessions, currentSession, createSession, deleteSession, enterSession,
    updateSessionMeta, togglePinSession, markUnread, moveSession, colors,
  } = useChatContext();

  const [editTarget, setEditTarget] = useState<{ id: string; title: string; avatar: string; avatarType: 'emoji' | 'image'; index: number; total: number; } | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const dragIdRef = useRef<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragAnim = useRef(new Animated.Value(0)).current;
  const dragStartY = useRef(0); const dragCurIdx = useRef(0);
  const sessionsSnap = useRef(sessions); sessionsSnap.current = sessions;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: () => dragIdRef.current !== null,
    onPanResponderMove: (_, g) => {
      const id = dragIdRef.current; if (!id) return;
      dragAnim.setValue(g.dy);
      const cur = dragCurIdx.current;
      const currentY = dragStartY.current + g.dy;
      let newIdx = Math.round(currentY / ITEM_H);
      newIdx = Math.max(0, Math.min(sessionsSnap.current.length - 1, newIdx));
      if (newIdx !== cur) {
        const dir = newIdx > cur ? 'down' : 'up';
        for (let i = 0; i < Math.abs(newIdx - cur); i++) moveSession(id, dir);
        dragCurIdx.current = newIdx; dragStartY.current = newIdx * ITEM_H; dragAnim.setValue(0);
      }
    },
    onPanResponderRelease: () => { dragAnim.setValue(0); dragIdRef.current = null; setDragId(null); },
  }), [moveSession]);

  const handlePress = useCallback((id: string) => { if (dragIdRef.current) return; enterSession(id); onEnterChat(); }, [enterSession, onEnterChat]);
  const handleLongPress = useCallback((id: string) => {
    Vibration.vibrate(50);
    const idx = sessionsSnap.current.findIndex((s) => s.id === id);
    if (idx < 0) return;
    dragIdRef.current = id; setDragId(id); dragStartY.current = idx * ITEM_H; dragCurIdx.current = idx; dragAnim.setValue(0);
  }, []);

  const handleNewSession = (title: string, avatar: string, avatarType: 'emoji' | 'image') => {
    const s = createSession(title, avatar, avatarType); enterSession(s.id); onEnterChat();
  };

  const totalItems = sessions.length;

  const renderItem = useCallback(({ item, index }: { item: ChatSession; index: number }) => {
    const isDragging = dragId === item.id;
    return (
      <Animated.View style={isDragging ? { transform: [{ translateY: dragAnim }], zIndex: 100, elevation: 10, opacity: 0.9 } : undefined}>
        <SessionItem session={item} isActive={false} onPress={() => handlePress(item.id)} onLongPress={() => handleLongPress(item.id)}
          onEdit={() => setEditTarget({ id: item.id, title: item.title, avatar: item.avatar, avatarType: item.avatarType, index, total: totalItems })}
          onPin={() => togglePinSession(item.id)} onMarkUnread={() => markUnread(item.id)}
          onDelete={() => {
            Alert.alert('删除会话', `确定删除"${item.title}"？`, [
              { text: '取消', style: 'cancel' },
              { text: '删除', style: 'destructive', onPress: () => { Alert.alert('再次确认', '删除后无法恢复', [{ text: '取消', style: 'cancel' }, { text: '确认删除', style: 'destructive', onPress: () => deleteSession(item.id) }]); } },
            ]);
          }}
        />
      </Animated.View>
    );
  }, [dragId, dragAnim, totalItems, handlePress, handleLongPress, togglePinSession, markUnread, deleteSession]);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    listContainer: { flex: 1 }, list: { paddingBottom: 80 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyIcon: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: colors.textSecondary },
    fabWrap: { position: 'absolute', right: 16, bottom: 30 },
    fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    fabIcon: { color: '#ffffff', fontSize: 28, fontWeight: '300', lineHeight: 30 },
    dragHintWrap: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
    dragHint: { backgroundColor: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: 13, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },
  });

  return (
    <View style={s.container} {...panResponder.panHandlers}>
      {dragId && <View style={s.dragHintWrap} pointerEvents="none"><Text style={s.dragHint}>拖拽排序中...</Text></View>}
      {sessions.length === 0 ? (
        <View style={s.empty}><Text style={s.emptyIcon}>💬</Text><Text style={s.emptyTitle}>暂无对话</Text><Text style={s.emptySubtitle}>点击 ＋ 开始新对话</Text></View>
      ) : (
        <FlatList data={sessions} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={s.list} style={s.listContainer} scrollEnabled={dragId === null} extraData={dragId} />
      )}
      <View style={s.fabWrap}><TouchableOpacity onPress={() => setShowNewSession(true)} activeOpacity={0.8} style={s.fab}><Text style={s.fabIcon}>＋</Text></TouchableOpacity></View>
      {editTarget && <SessionEditModal visible={true} title={editTarget.title} avatar={editTarget.avatar} avatarType={editTarget.avatarType} canMoveUp={editTarget.index > 0} canMoveDown={editTarget.index < editTarget.total - 1} onSave={(t, a, at) => updateSessionMeta(editTarget.id, t, a, at)} onMoveUp={() => moveSession(editTarget.id, 'up')} onMoveDown={() => moveSession(editTarget.id, 'down')} onClose={() => setEditTarget(null)} />}
      {showNewSession && <NewSessionModal visible={true} onStart={handleNewSession} onClose={() => setShowNewSession(false)} />}
    </View>
  );
}
