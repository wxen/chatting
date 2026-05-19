// Token estimation: CJK chars ~0.7t, ASCII words ~1.3t, mixed handling
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let tokens = 0;
  let asciiWord = '';

  for (const ch of text) {
    const code = ch.charCodeAt(0);
    // CJK Unified Ideographs + Extensions + Compatibility
    const isCJK =
      (code >= 0x4E00 && code <= 0x9FFF) ||
      (code >= 0x3400 && code <= 0x4DBF) ||
      (code >= 0x20000 && code <= 0x2A6DF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      // Hiragana + Katakana
      (code >= 0x3040 && code <= 0x309F) ||
      (code >= 0x30A0 && code <= 0x30FF) ||
      // Hangul
      (code >= 0xAC00 && code <= 0xD7AF);
    const isWhitespace = /\s/.test(ch);
    const isPunct = /[^\w\s\u4e00-\u9fff\u3400-\u4dbf]/.test(ch) && !isCJK;

    if (isCJK) {
      // Flush ASCII word first
      if (asciiWord.length > 0) {
        tokens += Math.max(1, Math.round(asciiWord.length / 3.8));
        asciiWord = '';
      }
      tokens += 0.65; // CJK char ≈ 0.65 tokens
    } else if (isWhitespace || isPunct) {
      if (asciiWord.length > 0) {
        tokens += Math.max(1, Math.round(asciiWord.length / 3.8));
        asciiWord = '';
      }
      if (isPunct && !isWhitespace) tokens += 0.3;
    } else {
      asciiWord += ch;
    }
  }
  if (asciiWord.length > 0) {
    tokens += Math.max(1, Math.round(asciiWord.length / 3.8));
  }
  return Math.max(1, Math.round(tokens));
}

// Count tokens in array of messages
export function countMessageTokens(
  messages: { role: string; content: string }[],
): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}
