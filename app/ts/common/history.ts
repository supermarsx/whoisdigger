import { IpcChannel } from './ipcChannels.js';

const electron = (window as any).electron;

export interface HistoryEntry {
  domain: string;
  timestamp: number;
  status: string;
}

export async function addEntry(domain: string, status: string): Promise<void> {
  // Usually handled by backend whois_lookup, but for consistency:
  if (electron) {
    // Note: our current whois_lookup already logs to history.
    // If we need to add explicitly:
    // await electron.invoke('history:add', domain, status);
  }
}

export async function addEntries(entries: { domain: string; status: string }[]): Promise<void> {
  if (electron) {
    // TODO: implement bulk history add in main.rs if needed
  }
}

export async function getHistory(limit = 50): Promise<HistoryEntry[]> {
  if (electron) {
    return await electron.invoke('history:get', limit);
  }
  return [];
}

export async function clearHistory(): Promise<void> {
  if (electron) {
    await electron.invoke('history:clear');
  }
}

export function closeHistory(): void {
  // No-op in Tauri
}

export async function getHistoryMode(): Promise<'tauri'> {
  return 'tauri';
}

export const useJsonFallback = false;

export default { addEntry, addEntries, getHistory, clearHistory, closeHistory };