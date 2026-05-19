import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ChatScreen } from './src/screens/ChatScreen';
import { SessionListScreen } from './src/screens/SessionListScreen';
import { SettingsModal } from './src/screens/SettingsModal';
import { AboutModal } from './src/screens/AboutModal';
import { ChatProvider, useChatContext } from './src/context/ChatContext';

type Page = 'list' | 'chat';

function AppContent() {
  const [page, setPage] = useState<Page>('list');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [settingsSessionId, setSettingsSessionId] = useState<string | null>(null);
  const { currentSession, apiConfigs, colors } = useChatContext();

  const isChat = page === 'chat';

  useEffect(() => { if (isChat && !currentSession) setPage('list'); }, [currentSession, isChat]);

  const openGlobalSettings = () => { setSettingsSessionId(null); setSettingsVisible(true); };
  const openSessionSettings = () => { setSettingsSessionId(currentSession?.id || null); setSettingsVisible(true); };

  const effectiveConfigName = currentSession?.configIds?.length
    ? currentSession.configIds.map((cid) => apiConfigs.find((c) => c.id === cid)?.name).filter(Boolean).join(', ')
    : null;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingBottom: 10, paddingHorizontal: 16, backgroundColor: colors.bgHeader, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    sessionTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.text },
    backBtn: { flexDirection: 'row', alignItems: 'center' },
    backIcon: { fontSize: 28, color: colors.accent, fontWeight: '300', marginRight: 2, lineHeight: 28 },
    backText: { fontSize: 17, color: colors.accent },
    settingsBtn: { padding: 4 }, settingsIcon: { fontSize: 22, color: colors.text },
  });

  return (
    <View style={s.container}>
      <StatusBar style={colors.text === '#191919' ? 'dark' : 'light'} />
      <View style={s.header}>
        {isChat ? (
          <TouchableOpacity style={s.backBtn} onPress={() => setPage('list')} activeOpacity={0.7}>
            <Text style={s.backIcon}>‹</Text><Text style={s.backText}>会话</Text>
          </TouchableOpacity>
        ) : <Text style={s.title}>闲聊</Text>}
        {isChat && currentSession && (
          <Text style={s.sessionTitle} numberOfLines={1}>{currentSession.title}{effectiveConfigName ? ` · ${effectiveConfigName}` : ''}</Text>
        )}
        <View style={{ flex: 1 }} />
        {!isChat && (
          <TouchableOpacity style={s.settingsBtn} onPress={() => setAboutVisible(true)} activeOpacity={0.7}>
            <Text style={s.settingsIcon}>🖵</Text>
          </TouchableOpacity>
        )}
        {isChat ? (
          <TouchableOpacity style={s.settingsBtn} onPress={openSessionSettings} activeOpacity={0.7}><Text style={s.settingsIcon}>☰</Text></TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.settingsBtn} onPress={openGlobalSettings} activeOpacity={0.7}><Text style={s.settingsIcon}>⚙</Text></TouchableOpacity>
        )}
      </View>
      {isChat ? <ChatScreen /> : <SessionListScreen onEnterChat={() => setPage('chat')} />}
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} sessionId={settingsSessionId} />
      <AboutModal visible={aboutVisible} onClose={() => setAboutVisible(false)} />
    </View>
  );
}

export default function App() { return <ChatProvider><AppContent /></ChatProvider>; }
