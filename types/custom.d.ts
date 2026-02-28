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
  export function resetUiCounters(event: unknown): void;
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

declare const $: any;
declare const settings: any;

declare global {
  interface Window {
    $: any;
    jQuery: any;
  }
}

declare module 'papaparse' {
  const Papa: any;
  export default Papa;
}

