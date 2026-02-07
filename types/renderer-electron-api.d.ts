export interface RendererElectronAPI<
  RendererToMain extends Record<string, any[]> = any,
  MainToRenderer extends Record<string, any[]> = any
> {
  send<C extends keyof RendererToMain>(channel: C, ...args: RendererToMain[C]): void;
  invoke<C extends keyof RendererToMain>(channel: C, ...args: RendererToMain[C]): Promise<any>;
  on<C extends keyof MainToRenderer>(
    channel: C,
    listener: (...args: MainToRenderer[C]) => void
  ): void;
  off<C extends keyof MainToRenderer>(
    channel: C,
    listener: (...args: MainToRenderer[C]) => void
  ): void;

  // FS helpers (mirroring tauri-shim convenience methods)
  readFile: (p: string, opts?: any) => Promise<string>;
  writeFile: (p: string, content: string) => Promise<void>;
  stat: (p: string) => Promise<any>;
  readdir: (p: string, opts?: any) => Promise<string[]>;
  unlink: (p: string) => Promise<void>;
  access: (p: string) => Promise<void>;
  exists: (p: string) => Promise<boolean>;
  bwFileRead: (p: string) => Promise<any>;
  bwaFileRead: (p: string) => Promise<any>;
  watch: (p: string, ...args: any[]) => Promise<{ close: () => void }>;

  // App helpers
  getBaseDir: () => Promise<string>;
  openDataDir: () => Promise<any>;
  loadTranslations: (lang: string) => Promise<string>;
  startStats: (cfg: string, dir: string) => Promise<number>;
  refreshStats: (id: number) => Promise<void>;
  stopStats: (id: number) => Promise<void>;
  getStats: (cfg: string, dir: string) => Promise<any>;

  // Path helpers
  path: {
    join: (...args: string[]) => string | Promise<string>;
    basename: (p: string) => string | Promise<string>;
  };
}
