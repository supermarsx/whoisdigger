declare module 'fs' {
  interface ReadFileOptions {
    encoding?: BufferEncoding | null;
    flag?: string | number;
  }
  interface ReaddirOptions {
    encoding?: BufferEncoding | null;
    withFileTypes?: boolean;
    recursive?: boolean;
  }
}
