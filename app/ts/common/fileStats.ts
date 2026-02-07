/** Base stat information mirroring Node's fs.Stats / Tauri's fs_stat */
export interface BaseStats {
  size: number;
  mtimeMs?: number;
  mtime?: string | Date;
  atime?: string | Date;
  isDirectory?: boolean | (() => boolean);
  isFile?: boolean | (() => boolean);
}

export interface FileStats extends BaseStats {
  filename?: string;
  humansize?: string;
  linecount?: number;
  minestimate?: string;
  maxestimate?: string;
  filepreview?: string;
  errors?: string;
}
