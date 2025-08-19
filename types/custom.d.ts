/// <reference path="./renderer-electron-api.d.ts" />
declare const require: any;
declare module 'fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, options?: any): string;
  export function readFile(path: string, callback: (err: any, data: string) => void): void;
  export function writeFileSync(path: string, data: string): void;
  export function createReadStream(path: string): any;
}
declare module 'url' {
  export function format(urlObject: any): string;
}
declare module 'readline' {
  export function createInterface(options: any): any;
}
declare module 'electron' {
  export const app: any;
  export class BrowserWindow {
    constructor(options?: any);
    loadURL(url: string): void;
    show(): void;
    once(event: string, listener: (...args: any[]) => void): void;
    on(event: string, listener: (...args: any[]) => void): void;
    minimize(): void;
    toggleDevTools(): void;
    webContents: {
      toggleDevTools(): void;
    };
  }
  export const Menu: any;
  export interface IpcMainEvent {}
  export interface IpcMainInvokeEvent extends IpcMainEvent {}
  export interface IpcRendererEvent {}

  interface RendererToMainIpc {
    'app:minimize': [];
    'app:isMinimized': [];
    'app:reload': [];
    'app:debug': [message: any];
    'bulkwhois:lookup': [string[], string[]];
    'bulkwhois:lookup.pause': [];
    'bulkwhois:lookup.continue': [];
    'bulkwhois:lookup.stop': [];
    'bulkwhois:export': [any, any];
    'bulkwhois:input.file': [];
    'bulkwhois:input.wordlist': [];
    ondragstart: [string];
    'singlewhois:lookup': [string];
    'singlewhois:openlink': [string];
    'stats:start': [string, string];
    'stats:refresh': [number];
    'stats:stop': [number];
    'stats:get': [string, string];
  }

  interface MainToRendererIpc {
    'bulkwhois:status.update': [string, any];
    'bulkwhois:fileinput.confirmation': [string | string[] | null, boolean?];
    'bulkwhois:wordlistinput.confirmation': [];
    'bulkwhois:result.receive': [any];
    'bulkwhois:export.cancel': [];
    'bulkwhois:export.error': [string];
    'singlewhois:results': [any];
    'singlewhois:copied': [];
    'stats:update': [any];
  }

  export interface IpcMain {
    on<C extends keyof RendererToMainIpc>(
      channel: C,
      listener: (event: IpcMainEvent, ...args: RendererToMainIpc[C]) => void
    ): void;
    handle<C extends keyof RendererToMainIpc>(
      channel: C,
      listener: (event: IpcMainEvent, ...args: RendererToMainIpc[C]) => any
    ): void;
  }

  export interface IpcRenderer {
    send<C extends keyof RendererToMainIpc>(channel: C, ...args: RendererToMainIpc[C]): void;
    on<C extends keyof MainToRendererIpc>(
      channel: C,
      listener: (...args: MainToRendererIpc[C]) => void
    ): void;
    off<C extends keyof MainToRendererIpc>(
      channel: C,
      listener: (...args: MainToRendererIpc[C]) => void
    ): void;
    invoke<C extends keyof RendererToMainIpc>(
      channel: C,
      ...args: RendererToMainIpc[C]
    ): Promise<any>;
  }

  export const ipcMain: IpcMain;
  export const ipcRenderer: IpcRenderer;
  export const dialog: any;
  export const remote: any;
  export const clipboard: any;
}
declare module 'debug' {
  export default function debug(namespace: string): (...args: any[]) => void;
}
declare module 'psl' {
  export function get(domain: string): string;
}
declare module 'punycode' {
  export function encode(input: string): string;
}
declare module 'punycode/punycode.js' {
  export function encode(input: string): string;
  export function toASCII(input: string): string;
}
declare module 'idna-uts46' {
  const uts46: { toAscii(domain: string, options?: any): string };
  export default uts46;
}
declare module 'whois' {
  export function lookup(
    domain: string,
    options: any,
    callback: (err: any, data: any) => void
  ): void;
  export function lookup(domain: string, callback: (err: any, data: any) => void): void;
}
declare module 'app/ts/common/parseRawData' {
  export function parseRawData(rawData: string): Record<string, string>;
  export default parseRawData;
}

declare module 'app/ts/common/proxy' {
  export interface ProxyInfo {
    ipaddress: string;
    port: number;
    auth?: { username: string; password: string };
  }
  export function getProxy(): ProxyInfo | undefined;
  export function resetProxyRotation(): void;
  export function reportProxyFailure(proxy: ProxyInfo): void;
}

declare module 'app/ts/main/bulkwhois/auxiliary' {
  import type { IpcMainEvent } from 'electron';
  export function resetUiCounters(event: IpcMainEvent): void;
  export { resetUiCounters as rstUiCntrs };
}

declare module 'app/ts/main/bulkwhois/process.defaults' {
  const defaults: any;
  export default defaults;
}

declare module 'app/ts/common/resetObject' {
  export function resetObj<T>(defaultObject?: T): T;
  export { resetObj as resetObject };
}

declare module 'change-case' {
  export function camelCase(input: string): string;
}

declare module 'html-entities' {
  export function decode(input: string): string;
}

declare const $: any;
declare const settings: any;

declare global {
  interface Window {
    $: any;
    jQuery: any;
    electron: {
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, listener: (...args: any[]) => void) => void;
      startStats: (cfg: string, dir: string) => Promise<number>;
      refreshStats: (id: number) => Promise<void>;
      stopStats: (id: number) => Promise<void>;
      getStats: (cfg: string, dir: string) => Promise<any>;
    };
  }
}

declare module '@electron/remote' {
  export const app: any;
  export const dialog: any;
  export const BrowserWindow: any;
  export function getCurrentWindow(): any;
  export function getCurrentWebContents(): any;
}

declare module '@electron/remote/main' {
  export function initialize(): void;
  export function enable(webContents: any): void;
}

declare module 'papaparse' {
  const Papa: any;
  export default Papa;
}
