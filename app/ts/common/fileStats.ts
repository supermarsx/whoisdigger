import type { Stats } from 'fs';

export interface FileStats extends Stats {
  filename?: string;
  humansize?: string;
  linecount?: number;
  minestimate?: string;
  maxestimate?: string;
  filepreview?: string;
  errors?: string;
}
