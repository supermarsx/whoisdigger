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
declare module 'jquery' {
  const jq: any;
  export = jq;
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
  }
  export const BrowserWindow: any;
  export const Menu: any;
  export interface IpcMainEvent {}
  export const ipcMain: any;
  export const ipcRenderer: any;
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
declare module 'idna-uts46' {
  const uts46: { toAscii(domain: string, options?: any): string };
  export default uts46;
}
declare module 'whois' {
  export function lookup(domain: string, options: any, callback: (err: any, data: any) => void): void;
  export function lookup(domain: string, callback: (err: any, data: any) => void): void;
}
declare module 'app/js/common/parseRawData' {
  export function parseRawData(rawData: string): Record<string, string>;
  export default parseRawData;
}

declare module 'app/js/main/bw/auxiliary' {
  import type { IpcMainEvent } from 'electron';
  export function resetUiCounters(event: IpcMainEvent): void;
  export { resetUiCounters as rstUiCntrs };
}

declare module 'app/js/main/bw/process.defaults' {
  const defaults: any;
  export = defaults;
}

declare module 'app/js/common/resetObject' {
  export function resetObj<T>(defaultObject?: T): T;
  export { resetObj as resetObject };
declare module 'change-case' {
  export function camelCase(input: string): string;
}

declare module 'html-entities' {
  export class XmlEntities {
    decode(input: string): string;
  }
}

interface String {
  format(...args: any[]): string;
}
