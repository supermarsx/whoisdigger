/**
 * Bridge — AI suggestions, predictions, and wordlist transforms.
 * @module bridge/ai
 */

import { tauriInvoke } from './_invoke.js';

export function aiSuggest(prompt: string, count: number): Promise<string[]> {
  return tauriInvoke<string[]>('ai_suggest', { prompt, count });
}

export function aiSuggestWithSettings(
  prompt: string,
  count: number,
  url?: string,
  apiKey?: string,
  model?: string,
): Promise<string[]> {
  return tauriInvoke<string[]>('ai_suggest_with_settings', {
    prompt,
    count,
    url: url ?? null,
    apiKey: apiKey ?? null,
    model: model ?? null,
  });
}

export function aiDownloadModel(): Promise<void> {
  return tauriInvoke('ai_download_model');
}

export function aiPredict(text: string): Promise<string> {
  return tauriInvoke<string>('ai_predict', { text });
}

// ─── Wordlist ───────────────────────────────────────────────────────────────

export function wordlistTransform(
  content: string,
  operation: string,
  arg1?: string,
  arg2?: string,
): Promise<string> {
  return tauriInvoke<string>('wordlist_transform', {
    content,
    operation,
    arg1: arg1 ?? null,
    arg2: arg2 ?? null,
  });
}
