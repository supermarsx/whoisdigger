import fs from 'fs';

export interface FileStats extends fs.Stats {
  filename?: string;
  humansize?: string;
  linecount?: number;
  minestimate?: string;
  maxestimate?: string;
  filepreview?: string;
  errors?: string;
}
