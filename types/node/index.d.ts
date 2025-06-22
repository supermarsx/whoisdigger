// Minimal Node type stubs for compilation
declare module 'fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, options?: any): string;
  export function readFile(path: string, callback: (err: any, data: string) => void): void;
  export function writeFileSync(path: string, data: string): void;
  export function createReadStream(path: string): any;
}
declare module 'readline' {
  export function createInterface(options: any): any;
}
declare module 'url' {
  export function format(urlObject: any): string;
}
