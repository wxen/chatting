export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  bgHeader: string;
  bgCard: string;
  bgInput: string;
  bgBubbleUser: string;
  bgBubbleAssistant: string;
  bgPinned: string;
  text: string;
  textSecondary: string;
  textInverse: string;
  border: string;
  accent: string;
  danger: string;
  bubbleTextUser: string;
  bubbleTextAssistant: string;
}

export const LIGHT_COLORS: ThemeColors = {
  bg: '#ededed',
  bgHeader: '#ffffff',
  bgCard: '#ffffff',
  bgInput: '#ffffff',
  bgBubbleUser: '#95ec69',
  bgBubbleAssistant: '#ffffff',
  bgPinned: '#f5f7fa',
  text: '#191919',
  textSecondary: '#8e8e93',
  textInverse: '#ffffff',
  border: '#e5e5e5',
  accent: '#07c160',
  danger: '#ff3b30',
  bubbleTextUser: '#000000',
  bubbleTextAssistant: '#1e293b',
};

export const DARK_COLORS: ThemeColors = {
  bg: '#111111',
  bgHeader: '#1c1c1e',
  bgCard: '#1c1c1e',
  bgInput: '#2c2c2e',
  bgBubbleUser: '#2e7d32',
  bgBubbleAssistant: '#2c2c2e',
  bgPinned: '#252525',
  text: '#e5e5e7',
  textSecondary: '#8e8e93',
  textInverse: '#ffffff',
  border: '#38383a',
  accent: '#34c759',
  danger: '#ff453a',
  bubbleTextUser: '#ffffff',
  bubbleTextAssistant: '#e5e5e7',
};

export function getColors(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}
