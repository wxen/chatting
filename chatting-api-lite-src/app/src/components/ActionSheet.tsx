import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useChatContext } from '../context/ChatContext';

interface ActionItem {
  text: string;
  danger?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  title: string;
  actions: ActionItem[];
  onClose: () => void;
}

export function ActionSheet({ visible, title, actions, onClose }: Props) {
  const { colors } = useChatContext();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.bgCard }]}>
          {title ? (
            <View style={[styles.titleRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.titleText, { color: colors.textSecondary }]}>{title}</Text>
            </View>
          ) : null}
          {actions.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionRow, { borderBottomColor: colors.border }]}
              onPress={() => { onClose(); setTimeout(a.onPress, 100); }}
              activeOpacity={0.6}
            >
              <Text style={[styles.actionText, { color: a.danger ? colors.danger : colors.text }]}>
                {a.text}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelRow} onPress={onClose} activeOpacity={0.6}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>取消</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingBottom: 34,
  },
  titleRow: {
    paddingVertical: 12, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleText: { fontSize: 13 },
  actionRow: {
    paddingVertical: 16, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionText: { fontSize: 18 },
  cancelRow: {
    marginTop: 8, marginHorizontal: 16, borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.12)', paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { fontSize: 18, fontWeight: '600' },
});
