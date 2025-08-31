import path from 'path';
import fs from 'fs';
import { dialog } from 'electron';
import { handle } from './ipc.js';
import { IpcChannel } from '../common/ipcChannels.js';
import { getUserDataPath } from './settings-main.js';

function sanitizeAscii(name: string): string {
  try {
    const ascii = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    return ascii || 'unnamed';
  } catch {
    return 'unnamed';
  }
}

function profilesDir(): string {
  return path.join(getUserDataPath(), 'profiles');
}

function safeSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'profile';
}

async function ensureDir(p: string): Promise<void> {
  await fs.promises.mkdir(p, { recursive: true });
}

async function listProfiles(): Promise<{ id: string; name: string; file: string; mtime?: number }[]> {
  const dir = profilesDir();
  await ensureDir(dir);
  const items = await fs.promises.readdir(dir).catch(() => []);
  // If there are no profiles, create a default one from current config
  if (!items.some((f) => f.endsWith('.json'))) {
    const defId = 'default';
    const file = path.join(dir, `${defId}.json`);
    let content: any = {};
    try {
      const currentFile = path.join(getUserDataPath(), 'appconfig.js');
      const raw = await fs.promises.readFile(currentFile, 'utf8');
      content = JSON.parse(raw);
    } catch {
      content = {};
    }
    content.profileName = 'Default Profile';
    if (!content.configName) content.configName = 'Default Config';
    const baseHist = 'history-default.sqlite';
    content.database = content.database || {};
    content.database.historyName = content.database.historyName || baseHist;
    try {
      await fs.promises.writeFile(file, JSON.stringify(content, null, 2));
    } catch {
      /* ignore */
    }
  }
  const files = await fs.promises.readdir(dir).catch(() => []);
  const results: { id: string; name: string; file: string; mtime?: number }[] = [];
  for (const fname of files) {
    if (!fname.endsWith('.json')) continue;
    const file = path.join(dir, fname);
    try {
      const raw = await fs.promises.readFile(file, 'utf8');
      const json = JSON.parse(raw) as any;
      const st = await fs.promises.stat(file);
      results.push({ id: path.basename(fname, '.json'), name: json.profileName ?? fname, file, mtime: st.mtimeMs });
    } catch {
      /* ignore invalid */
    }
  }
  results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return results;
}

handle(IpcChannel.ProfilesList, async () => {
  return listProfiles();
});

handle(IpcChannel.ProfilesCreate, async (_e, name: string, cloneCurrent = true) => {
  const dir = profilesDir();
  await ensureDir(dir);
  const base = safeSlug(name);
  let id = base;
  let i = 1;
  while (fs.existsSync(path.join(dir, `${id}.json`))) {
    id = `${base}-${i++}`;
  }
  const file = path.join(dir, `${id}.json`);
  let content: any = {};
  if (cloneCurrent) {
    // Copy current config file if available
    try {
      const currentFile = path.join(getUserDataPath(), 'appconfig.js');
      const raw = await fs.promises.readFile(currentFile, 'utf8');
      content = JSON.parse(raw);
    } catch {
      content = {};
    }
  }
  content.profileName = name;
  if (!content.configName) content.configName = `${name} Config`;
  // Set a per-profile history database name and ensure uniqueness
  const baseDb = `history-${safeSlug(name)}.sqlite`;
  let dbName = baseDb;
  let k = 1;
  while (fs.existsSync(path.join(getUserDataPath(), dbName))) {
    dbName = `history-${safeSlug(name)}-${k++}.sqlite`;
  }
  content.database = content.database || {};
  content.database.historyName = dbName;
  await fs.promises.writeFile(file, JSON.stringify(content, null, 2));
  return { id };
});

handle(IpcChannel.ProfilesRename, async (_e, id: string, newName: string) => {
  const dir = profilesDir();
  const file = path.join(dir, `${id}.json`);
  const raw = await fs.promises.readFile(file, 'utf8');
  const json = JSON.parse(raw) as any;
  json.profileName = newName;
  await fs.promises.writeFile(file, JSON.stringify(json, null, 2));
});

handle(IpcChannel.ProfilesDelete, async (_e, id: string) => {
  const dir = profilesDir();
  const file = path.join(dir, `${id}.json`);
  await fs.promises.unlink(file);
});

handle(IpcChannel.ProfilesSetCurrent, async (_e, id: string) => {
  const dir = profilesDir();
  const src = path.join(dir, `${id}.json`);
  const dst = path.join(getUserDataPath(), 'appconfig.js');
  await ensureDir(path.dirname(dst));
  try {
    const raw = await fs.promises.readFile(src, 'utf8');
    const json = JSON.parse(raw) as any;
    if (!json.configName && json.profileName) json.configName = `${json.profileName} Config`;
    // Ensure database historyName exists and is unique
    json.database = json.database || {};
    if (!json.database.historyName) {
      let base = `history-${id}.sqlite`;
      let z = 1;
      while (fs.existsSync(path.join(getUserDataPath(), base))) {
        base = `history-${id}-${z++}.sqlite`;
      }
      json.database.historyName = base;
    }
    await fs.promises.writeFile(dst, JSON.stringify(json, null, 2));
  } catch {
    await fs.promises.copyFile(src, dst);
  }
  return;
});

handle(IpcChannel.ConfigExport, async () => {
  const cfg = path.join(getUserDataPath(), 'appconfig.js');
  let name = 'config';
  try {
    const raw = await fs.promises.readFile(cfg, 'utf8');
    const json = JSON.parse(raw) as any;
    if (typeof json.configName === 'string' && json.configName.trim()) name = json.configName;
  } catch {
    /* ignore */
  }
  const safe = sanitizeAscii(name);
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Configuration',
    defaultPath: path.join(getUserDataPath(), `config-${safe}.json`),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return '';
  await fs.promises.copyFile(cfg, filePath);
  return filePath;
});

handle(IpcChannel.ConfigImport, async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import Configuration',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePaths?.[0]) return;
  const src = filePaths[0];
  const dst = path.join(getUserDataPath(), 'appconfig.js');
  await fs.promises.copyFile(src, dst);
});

handle(IpcChannel.ProfilesExport, async (_e, id?: string) => {
  const dir = profilesDir();
  let src: string;
  let baseName: string;
  if (id) {
    src = path.join(dir, `${id}.json`);
    try {
      const raw = await fs.promises.readFile(src, 'utf8');
      const json = JSON.parse(raw) as any;
      const n = sanitizeAscii(json.profileName || id);
      baseName = `profile-${n}.json`;
    } catch {
      baseName = `profile-${id}.json`;
    }
  } else {
    src = path.join(getUserDataPath(), 'appconfig.js');
    let name = 'config';
    try {
      const raw = await fs.promises.readFile(src, 'utf8');
      const json = JSON.parse(raw) as any;
      if (typeof json.configName === 'string' && json.configName.trim()) name = json.configName;
    } catch {
      /* ignore */
    }
    baseName = `config-${sanitizeAscii(name)}.json`;
  }
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Profile',
    defaultPath: path.join(getUserDataPath(), baseName),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return '';
  await fs.promises.copyFile(src, filePath);
  return filePath;
});

handle(IpcChannel.ProfilesImport, async () => {
  const dir = profilesDir();
  await ensureDir(dir);
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import Profile',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePaths?.[0]) return undefined;
  const src = filePaths[0];
  const raw = await fs.promises.readFile(src, 'utf8');
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const name = json.profileName || path.basename(src, path.extname(src));
  const base = safeSlug(name);
  let id = base;
  let i = 1;
  while (fs.existsSync(path.join(dir, `${id}.json`))) id = `${base}-${i++}`;
  const dst = path.join(dir, `${id}.json`);
  await fs.promises.writeFile(dst, JSON.stringify(json, null, 2));
  return { id };
});
