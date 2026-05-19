import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useChatContext } from '../context/ChatContext';

interface Props { visible: boolean; onStart: (title: string, avatar: string, avatarType: 'emoji' | 'image') => void; onClose: () => void; }

const QUICK_AVATARS = ['😊','🤖','💬','🎯','🌟','💡','🔥','✨','🦊','🐱','🐶','🐼'];

export function NewSessionModal({ visible, onStart, onClose }: Props) {
  const { colors } = useChatContext();
  const [title, setTitle] = useState('');
  const [avatar, setAvatar] = useState('💬');
  const [avatarType, setAvatarType] = useState<'emoji' | 'image'>('emoji');
  const [avatarImage, setAvatarImage] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1,1], quality: 0.7 });
    if (!result.canceled && result.assets[0]) { setAvatarImage(result.assets[0].uri); setAvatarType('image'); }
  };

  const handleStart = () => { onStart(title.trim() || '新的对话', avatarType === 'image' ? avatarImage : avatar, avatarType); onClose(); };

  const s = {
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' as const },
    container: { backgroundColor: colors.bgHeader, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    header: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    headerTitle: { fontSize: 17, fontWeight: '600' as const, color: colors.text },
    cancelBtn: { fontSize: 16, color: colors.textSecondary },
    startBtn: { fontSize: 16, color: colors.accent, fontWeight: '600' as const },
    body: { padding: 20, paddingBottom: 40 },
    avatarWrap: { alignSelf: 'center' as const, alignItems: 'center' as const, marginBottom: 20 },
    avatarPreview: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.bg, justifyContent: 'center' as const, alignItems: 'center' as const },
    avatarPreviewText: { fontSize: 40 },
    avatarImg: { width: 72, height: 72, borderRadius: 12 },
    avatarHint: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
    label: { fontSize: 14, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: colors.bgInput, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    emojiRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    emojiBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.bg, justifyContent: 'center' as const, alignItems: 'center' as const },
    emojiBtnActive: { backgroundColor: colors.accent + '30', borderWidth: 2, borderColor: colors.accent },
    emojiText: { fontSize: 24 },
    photoBtn: { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' as const },
    photoBtnText: { fontSize: 20 },
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.header}>
            <TouchableOpacity onPress={onClose}><Text style={s.cancelBtn}>取消</Text></TouchableOpacity>
            <Text style={s.headerTitle}>新对话</Text>
            <TouchableOpacity onPress={handleStart}><Text style={s.startBtn}>开始</Text></TouchableOpacity>
          </View>
          <View style={s.body}>
            <TouchableOpacity onPress={pickImage} style={s.avatarWrap}>
              {avatarType === 'image' && avatarImage ? (
                <Image source={{ uri: avatarImage }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarPreview}><Text style={s.avatarPreviewText}>{avatar}</Text></View>
              )}
              <Text style={s.avatarHint}>点击设置头像</Text>
            </TouchableOpacity>
            <Text style={s.label}>标题</Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="输入对话标题" placeholderTextColor={colors.textSecondary} maxLength={30} autoFocus />
            <Text style={s.label}>选择 Emoji 头像</Text>
            <View style={s.emojiRow}>
              {QUICK_AVATARS.map((emoji) => (
                <TouchableOpacity key={emoji} style={[s.emojiBtn, avatar === emoji && avatarType === 'emoji' && s.emojiBtnActive]} onPress={() => { setAvatar(emoji); setAvatarType('emoji'); }}>
                  <Text style={s.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[s.emojiBtn, s.photoBtn]} onPress={pickImage}>
                <Text style={s.photoBtnText}>📷</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
