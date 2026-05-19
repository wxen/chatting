import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useChatContext } from '../context/ChatContext';

interface Props {
  visible: boolean; title: string; avatar: string; avatarType: 'emoji' | 'image';
  canMoveUp?: boolean; canMoveDown?: boolean;
  onSave: (title: string, avatar: string, avatarType: 'emoji' | 'image') => void;
  onMoveUp?: () => void; onMoveDown?: () => void; onClose: () => void;
}

const AVATAR_OPTIONS = ['😊','🤖','💬','🎯','🌟','💡','🔥','✨','🦊','🐱','🐶','🐼','🦁','🐸','🐵','🦄','🐙','🌺','🍀','🌈','🎮','🎵','📚','☕','🍕','🚀','⚡','💎','🎪','🌙'];

export function SessionEditModal({ visible, title, avatar, avatarType, canMoveUp, canMoveDown, onSave, onMoveUp, onMoveDown, onClose }: Props) {
  const { colors } = useChatContext();
  const [editTitle, setEditTitle] = useState(title);
  const [editAvatar, setEditAvatar] = useState(avatar);
  const [editAvatarType, setEditAvatarType] = useState<'emoji' | 'image'>(avatarType);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1,1], quality: 0.7 });
    if (!result.canceled && result.assets[0]) { setEditAvatar(result.assets[0].uri); setEditAvatarType('image'); }
  };

  const handleSave = () => { onSave(editTitle.trim() || '未命名对话', editAvatar, editAvatarType); onClose(); };

  const s = {
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' as const },
    container: { backgroundColor: colors.bgHeader, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' as const },
    header: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    headerTitle: { fontSize: 17, fontWeight: '600' as const, color: colors.text },
    cancelBtn: { fontSize: 16, color: colors.textSecondary },
    saveBtn: { fontSize: 16, color: colors.accent, fontWeight: '600' as const },
    body: { padding: 20 },
    avatarWrap: { alignSelf: 'center' as const, alignItems: 'center' as const, marginBottom: 20 },
    avatarPreview: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.bg, justifyContent: 'center' as const, alignItems: 'center' as const },
    avatarPreviewText: { fontSize: 40 },
    avatarImg: { width: 72, height: 72, borderRadius: 12 },
    avatarHint: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
    label: { fontSize: 14, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: colors.bgInput, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    moveRow: { marginTop: 8 },
    moveBtns: { flexDirection: 'row' as const, gap: 10 },
    moveBtn: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 8, paddingVertical: 12, alignItems: 'center' as const, borderWidth: 1, borderColor: colors.border },
    moveBtnDisabled: { opacity: 0.3 },
    moveBtnText: { fontSize: 15, color: colors.text, fontWeight: '500' as const },
    avatarRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    avatarOption: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.bg, justifyContent: 'center' as const, alignItems: 'center' as const },
    avatarOptionActive: { backgroundColor: colors.accent + '30', borderWidth: 2, borderColor: colors.accent },
    avatarOptionText: { fontSize: 24 },
    photoOption: { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' as const },
    photoOptionText: { fontSize: 20 },
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.header}>
            <TouchableOpacity onPress={onClose}><Text style={s.cancelBtn}>取消</Text></TouchableOpacity>
            <Text style={s.headerTitle}>编辑对话</Text>
            <TouchableOpacity onPress={handleSave}><Text style={s.saveBtn}>保存</Text></TouchableOpacity>
          </View>
          <View style={s.body}>
            <TouchableOpacity onPress={pickImage} style={s.avatarWrap}>
              {editAvatarType === 'image' ? <Image source={{ uri: editAvatar }} style={s.avatarImg} /> : <View style={s.avatarPreview}><Text style={s.avatarPreviewText}>{editAvatar}</Text></View>}
              <Text style={s.avatarHint}>点击更换头像</Text>
            </TouchableOpacity>
            <Text style={s.label}>标题</Text>
            <TextInput style={s.input} value={editTitle} onChangeText={setEditTitle} placeholder="输入标题" placeholderTextColor={colors.textSecondary} maxLength={30} />
            {(canMoveUp || canMoveDown) && (
              <View style={s.moveRow}>
                <Text style={s.label}>排序</Text>
                <View style={s.moveBtns}>
                  <TouchableOpacity style={[s.moveBtn, !canMoveUp && s.moveBtnDisabled]} onPress={onMoveUp} disabled={!canMoveUp}><Text style={s.moveBtnText}>↑ 上移</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.moveBtn, !canMoveDown && s.moveBtnDisabled]} onPress={onMoveDown} disabled={!canMoveDown}><Text style={s.moveBtnText}>↓ 下移</Text></TouchableOpacity>
                </View>
              </View>
            )}
            <Text style={s.label}>选择头像</Text>
            <View style={s.avatarRow}>
              <TouchableOpacity style={[s.avatarOption, s.photoOption]} onPress={pickImage}><Text style={s.photoOptionText}>📷</Text></TouchableOpacity>
              {AVATAR_OPTIONS.map((emoji) => (
                <TouchableOpacity key={emoji} style={[s.avatarOption, editAvatar === emoji && editAvatarType === 'emoji' && s.avatarOptionActive]} onPress={() => { setEditAvatar(emoji); setEditAvatarType('emoji'); }}>
                  <Text style={s.avatarOptionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
