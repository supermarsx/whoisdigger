import debugModule from 'debug';
import { settings } from '../common/settings.js';

const debug = debugModule('ai.openaiSuggest');

async function ensureFetch(): Promise<void> {
  if (typeof globalThis.fetch === 'undefined') {
    const { default: fetchImpl } = await import('node-fetch');
    (globalThis as any).fetch = fetchImpl as unknown as typeof fetch;
  }
}

export async function suggestWords(prompt: string, count: number): Promise<string[]> {
  await ensureFetch();
  const { url, apiKey } = settings.ai.openai ?? {};
  if (!url || !apiKey) {
    debug('OpenAI API disabled');
    return [];
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        n: 1,
        max_tokens: 32
      })
    });
    if (!res.ok) {
      debug(`HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    const text: string = (
      data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.text ??
      ''
    ).trim();
    const words = text
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter(Boolean);
    return words.slice(0, count);
  } catch (e) {
    debug(`Request failed: ${e}`);
    return [];
  }
}
