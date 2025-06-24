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
  export interface IpcMainInvokeEvent {}
  export interface IpcRendererEvent {}

  interface RendererToMainIpc {
    'app:minimize': [];
    'app:debug': [message: any];
    'bw:lookup': [string[], string[]];
    'bw:lookup.pause': [];
    'bw:lookup.continue': [];
    'bw:lookup.stop': [];
    'bw:export': [any, any];
    'bw:input.file': [];
    'bw:input.wordlist': [];
    ondragstart: [string];
    'singlewhois:lookup': [string];
    'singlewhois:openlink': [string];
  }

  interface MainToRendererIpc {
    'bw:status.update': [string, any];
    'bw:fileinput.confirmation': [string | string[] | null, boolean?];
    'bw:result.receive': [any];
    'bw:export.cancel': [];
    'bw:export.error': [string];
    'singlewhois:results': [any];
    'singlewhois:copied': [];
  }

  export interface IpcMain {
    on<C extends keyof RendererToMainIpc>(
      channel: C,
      listener: (event: IpcMainEvent, ...args: RendererToMainIpc[C]) => void
    ): void;
    handle<C extends keyof RendererToMainIpc>(
      channel: C,
      listener: (event: IpcMainInvokeEvent, ...args: RendererToMainIpc[C]) => any
    ): void;
  }

  export interface IpcRenderer {
    send<C extends keyof RendererToMainIpc>(channel: C, ...args: RendererToMainIpc[C]): void;
    on<C extends keyof MainToRendererIpc>(
      channel: C,
      listener: (event: IpcRendererEvent, ...args: MainToRendererIpc[C]) => void
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
declare module 'punycode/' {
  export function encode(input: string): string;
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
    type?: number;
  }
  export function getProxy(): ProxyInfo | undefined;
  export function resetProxyRotation(): void;
}

declare module 'app/ts/main/bw/auxiliary' {
  import type { IpcMainEvent } from 'electron';
  export function resetUiCounters(event: IpcMainEvent): void;
  export { resetUiCounters as rstUiCntrs };
}

declare module 'app/ts/main/bw/process.defaults' {
  const defaults: any;
  export = defaults;
}

declare module 'app/ts/common/resetObject' {
  export function resetObj<T>(defaultObject?: T): T;
  export { resetObj as resetObject };
}

declare module 'change-case' {
  export function camelCase(input: string): string;
}

declare module 'html-entities' {
  export class XmlEntities {
    decode(input: string): string;
  }
}

declare const $: any;
declare const settings: any;

declare global {
  interface Window {
    $: any;
    jQuery: any;
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

declare module 'datatables' {
  const datatables: any;
  export default datatables;
}
