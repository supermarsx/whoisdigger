/** Options accepted by the watch function (mirrors a subset of Node's fs.WatchOptions) */
export interface WatchOptions {
  persistent?: boolean;
  recursive?: boolean;
  encoding?: BufferEncoding | null;
}

export interface WatchEvent {
  event: string;
  filename: string | null;
}

export type WatchFn = (
  prefix: string,
  path: string,
  opts: WatchOptions,
  cb: (evt: WatchEvent) => void
) => Promise<{ close: () => void }>;

export class FileWatcherManager {
  private watcher: { close: () => void } | undefined;
  constructor(private readonly watchFn: WatchFn) {}

  async watch(
    prefix: string,
    path: string,
    opts: WatchOptions,
    cb: (evt: WatchEvent) => void
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
