import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useChat } from '../hooks/useChat';
import { getColors } from '../theme/colors';

type ChatContextType = ReturnType<typeof useChat> & { colors: ReturnType<typeof getColors> };

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const chat = useChat();
  const systemScheme = useColorScheme();
  const effectiveMode = chat.theme === 'system' ? (systemScheme || 'light') : chat.theme;
  const colors = useMemo(() => getColors(effectiveMode as 'light' | 'dark'), [effectiveMode]);
  return <ChatContext.Provider value={{ ...chat, colors }}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextType {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}
