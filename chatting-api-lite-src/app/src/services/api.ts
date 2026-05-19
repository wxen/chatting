import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { Message, ProviderId } from '../types/chat';
import { getEffectiveBaseURL, PROVIDERS } from './providers';

export interface ChatConfig {
  provider: ProviderId;
  apiKey: string;
  baseURL: string;
  model: string;
  temperature: number;
  maxTokens: number;
  signal?: AbortSignal;
}

// ====== Provider-specific parameter normalization ======

function buildOpenAIParams(config: ChatConfig, messages: Message[]): any {
  const pid = config.provider;
  const base: any = {
    model: config.model,
    messages: messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    stream: true as const,
  };

  // --- Doubao Seed 2.0: temp/top_p fixed, freq/presence forbidden ---
  if (pid === 'doubao' && (config.model.startsWith('doubao-seed-2') || config.model.startsWith('doubao-seed-1.8'))) {
    // temperature & top_p are fixed by the model; sending custom values causes errors
    base.max_tokens = config.maxTokens;
    // explicitly omit temperature, top_p, frequency_penalty, presence_penalty
    return base;
  }

  // --- GPT-5.x: temperature must be 1.0, use max_completion_tokens ---
  if (pid === 'openai' && /^gpt-5/.test(config.model)) {
    base.max_completion_tokens = config.maxTokens;
    // GPT-5.x requires temperature=1.0; other values throw errors
    // omit temperature to let API use default (1.0)
    return base;
  }

  // --- GPT-4.1 / GPT-4o / o-series: standard params ---
  if (pid === 'openai') {
    base.temperature = config.temperature;
    base.max_completion_tokens = config.maxTokens;
    return base;
  }

  // --- DeepSeek V4: temp=1.0 recommended; thinking_mode via extra_body ---
  if (pid === 'deepseek' && /v4/.test(config.model)) {
    base.temperature = config.temperature;
    base.max_tokens = config.maxTokens;
    // V4 models support thinking_mode via extra_body; keep streaming compatible
    base.extra_body = { thinking_mode: 'non-thinking' };
    return base;
  }

  // --- DeepSeek legacy: standard params ---
  if (pid === 'deepseek') {
    base.temperature = config.temperature;
    base.max_tokens = config.maxTokens;
    return base;
  }

  // --- Kimi K2.x: thinking mode fixes temp to 1.0 ---
  if (pid === 'kimi' && /^kimi-k2/.test(config.model)) {
    base.temperature = config.temperature;
    base.max_tokens = config.maxTokens;
    return base;
  }

  // --- Default OpenAI-compatible: standard params ---
  base.temperature = config.temperature;
  base.max_tokens = config.maxTokens;
  return base;
}

export interface StreamChunk {
  text?: string;
  thinking?: string;
}

// ====== OpenAI-compatible ======

export async function* chatOpenAI(
  config: ChatConfig,
  messages: Message[],
): AsyncGenerator<StreamChunk> {
  const baseURL = config.baseURL || getEffectiveBaseURL(config.provider, '');
  const client = new OpenAI({
    baseURL,
    apiKey: config.apiKey || 'sk-placeholder',
    dangerouslyAllowBrowser: true,
    timeout: 60000,
    fetchOptions: config.signal ? { signal: config.signal } as any : undefined,
  });

  const params = buildOpenAIParams(config, messages);

  try {
    const stream: any = await client.chat.completions.create(params as any);
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content;
      if (delta) yield { text: delta };
      if (reasoning) yield { thinking: reasoning };
    }
  } catch (e: any) {
    const msg = e.message || '';
    // Streaming rejected → fall back to non-streaming
    if (
      msg.includes('stream') ||
      msg.includes('not support') ||
      msg.includes('does not support') ||
      msg.includes('Streaming is not supported')
    ) {
      const { stream: _, extra_body: __, ...rest } = params;
      const resp = await client.chat.completions.create({
        ...rest,
        stream: false,
      } as any);
      const text = (resp as any).choices?.[0]?.message?.content || '';
      if (text) yield { text };
    } else {
      throw e;
    }
  }
}

// ====== Anthropic (Claude) ======

export async function* chatAnthropic(
  config: ChatConfig,
  messages: Message[],
): AsyncGenerator<StreamChunk> {
  const client = new Anthropic({
    apiKey: config.apiKey || 'sk-placeholder',
    dangerouslyAllowBrowser: true,
    timeout: 60000,
    ...(config.signal ? { httpAgent: undefined } : {}),
  } as any);

  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const streamParams: any = {
    model: config.model,
    messages: chatMessages,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
  };
  if (systemMsg?.content) streamParams.system = systemMsg.content;

  try {
    const stream: any = client.messages.stream(streamParams);

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') yield { text: event.delta.text };
        if (event.delta.type === 'thinking_delta') yield { thinking: (event.delta as any).thinking || '' };
      }
    }
  } catch (e: any) {
    const msg = e.message || '';
    if (msg.includes('stream') || msg.includes('not support')) {
      const resp: any = await client.messages.create(streamParams as any);
      const text = resp?.content?.[0]?.text || '';
      if (text) yield { text };
    } else {
      throw e;
    }
  }
}

// ====== Gemini ======

export async function* chatGemini(
  config: ChatConfig,
  messages: Message[],
): AsyncGenerator<StreamChunk> {
  const genAI = new GoogleGenAI({ apiKey: config.apiKey || 'sk-placeholder' });

  const params = {
    model: config.model,
    contents: messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    config: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
      systemInstruction: messages.find((m) => m.role === 'system')?.content,
    },
  };

  try {
    const stream = await genAI.models.generateContentStream(params);
    for await (const chunk of stream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const p of parts) {
          if (p.text) yield { text: p.text };
          if ((p as any).thought) yield { thinking: (p as any).thought };
        }
      }
    }
  } catch (e: any) {
    const msg = e.message || '';
    if (msg.includes('stream') || msg.includes('not support')) {
      const resp = await genAI.models.generateContent(params);
      const text = resp.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) yield { text };
    } else {
      throw e;
    }
  }
}

// ====== Unified interface ======

export async function* streamChat(
  config: ChatConfig,
  messages: Message[],
): AsyncGenerator<StreamChunk> {
  const provider = PROVIDERS[config.provider];
  const format = provider.apiFormat;

  switch (format) {
    case 'openai':
      yield* chatOpenAI(config, messages);
      break;
    case 'anthropic':
      yield* chatAnthropic(config, messages);
      break;
    case 'gemini':
      yield* chatGemini(config, messages);
      break;
  }
}
