import * as conversions from '../../common/conversions.js';
import type { FileStats } from '../../common/fileStats.js';
import { settings } from '../settings-renderer.js';

export interface ElectronFs {
  bwFileRead: (p: string) => Promise<Buffer>;
  stat: (p: string) => Promise<any>;
  path: { basename: (p: string) => Promise<string> };
}

export async function readFileData(
  electron: ElectronFs,
  pathToFile: string
): Promise<{ stats: FileStats; contents: Buffer }> {
  const misc = settings.lookupMisc;
  const stats = (await electron.stat(pathToFile)) as FileStats;
  stats.filename = await electron.path.basename(pathToFile);
  stats.humansize = conversions.byteToHumanFileSize(stats.size, misc.useStandardSize);
  const contents = await electron.bwFileRead(pathToFile);
  stats.linecount = contents.toString().split('\n').length;
  stats.filepreview = contents.toString().substring(0, 50);
  return { stats, contents };
}

export function addEstimates(stats: FileStats): void {
  const lookup = { randomize: { timeBetween: settings.lookupRandomizeTimeBetween } };
  if (lookup.randomize.timeBetween.randomize === true) {
    stats.minestimate = conversions.msToHumanTime(
      stats.linecount! * lookup.randomize.timeBetween.minimum
    );
    stats.maxestimate = conversions.msToHumanTime(
      stats.linecount! * lookup.randomize.timeBetween.maximum
    );
  } else {
    stats.minestimate = conversions.msToHumanTime(
      stats.linecount! * settings.lookupGeneral.timeBetween
    );
  }
}
