import { msToHumanTime } from '../../common/conversions.js';
import type { Settings } from '../../common/settings-base.js';

export function getTimeEstimates(
  lineCount: number,
  settings: Settings
): { min: string; max?: string } {
  if (settings.lookupRandomizeTimeBetween.randomize) {
    const minMs = lineCount * settings.lookupRandomizeTimeBetween.minimum;
    const maxMs = lineCount * settings.lookupRandomizeTimeBetween.maximum;
    return {
      min: msToHumanTime(minMs),
      max: msToHumanTime(maxMs)
    };
  }

  const ms = lineCount * settings.lookupGeneral.timeBetween;
  return { min: msToHumanTime(ms) };
}
