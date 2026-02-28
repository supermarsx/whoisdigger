import { historyGet, historyClear } from './tauriBridge.js';

export interface HistoryEntry {
  domain: string;
  timestamp: number;
  status: string;
}

export async function addEntry(domain: string, status: string): Promise<void> {
  // Usually handled by backend whois_lookup, but for consistency:
  // Note: our current whois_lookup already logs to history.
  // If we need to add explicitly:
  // await historyAdd(domain, status);
}

export async function addEntries(entries: { domain: string; status: string }[]): Promise<void> {
  // TODO: implement bulk history add in main.rs if needed
}

export async function getHistory(limit = 50): Promise<HistoryEntry[]> {
  return await historyGet(limit) as HistoryEntry[];
}

export async function clearHistory(): Promise<void> {
  await historyClear();
}

export function closeHistory(): void {
  // No-op in Tauri
}

export async function getHistoryMode(): Promise<'tauri'> {
  return 'tauri';
}

export const useJsonFallback = false;

export default { addEntry, addEntries, getHistory, clearHistory, closeHistory };