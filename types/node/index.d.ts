// Minimal Node type stubs for compilation
declare module 'fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, options?: any): string;
  export function readFile(path: string, callback: (err: any, data: string) => void): void;
  export function writeFileSync(path: string, data: string): void;
  export function createReadStream(path: string): any;
}
declare module 'path' {
  export function join(...paths: string[]): string;
}
declare module 'dns' {
  export function resolve(
    hostname: string,
    rrtype: string,
    callback: (err: any, addresses: any) => void
  ): void;
}
declare module 'readline' {
  export function createInterface(options: any): any;
}
declare module 'url' {
  export function format(urlObject: any): string;
}

interface NodeModule {
  exports: any;
  require: any;
  id: string;
  filename: string;
  loaded: boolean;
  parent: NodeModule | null;
  children: NodeModule[];
  paths: string[];
}

declare var module: NodeModule;

export { NodeModule };
