import debugModule from 'debug';
import { settings } from '../common/settings';

const debug = debugModule('ai.openaiSuggest');

export async function suggestWords(prompt: string, count: number): Promise<string[]> {
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
