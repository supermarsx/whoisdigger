export interface WatchOptions {
  persistent?: boolean;
  recursive?: boolean;
  encoding?: BufferEncoding;
}

export type WatchFn = (
  prefix: string,
  path: string,
  opts: WatchOptions,
  cb: (evt: string) => void
) => Promise<{ close: () => void }>;

export class FileWatcherManager {
  private watcher: { close: () => void } | undefined;
  constructor(private readonly watchFn: WatchFn) {}

  async watch(
    prefix: string,
    path: string,
    opts: WatchOptions,
    cb: (evt: string) => void
  ): Promise<void> {
    this.close();
    this.watcher = await this.watchFn(prefix, path, opts, cb);
  }

  close(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
  }
}
