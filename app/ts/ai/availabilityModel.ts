import fs from 'fs';
import path from 'path';
import { debugFactory } from '../common/logger.js';
import { settings, getUserDataPath } from '../common/settings.js';

const debug = debugFactory('ai.availabilityModel');

export type Label = 'available' | 'unavailable';

export interface Model {
  vocabulary: string[];
  classTotals: Record<Label, number>;
  tokenTotals: Record<Label, number>;
  tokenCounts: Record<Label, Record<string, number>>;
}

let model: Model | undefined;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export async function loadModel(modelPath: string = settings.ai.modelPath): Promise<void> {
  const baseDir = path.resolve(getUserDataPath(), settings.ai.dataPath);
  const dest = path.resolve(baseDir, modelPath);
  if (dest !== baseDir && !dest.startsWith(baseDir + path.sep)) {
    throw new Error('Invalid model path');
  }
  const data = await fs.promises.readFile(dest, 'utf8');
  model = JSON.parse(data) as Model;
  debug('Model loaded');
}

export function predict(text: string): 'available' | 'unavailable' | 'error' {
  if (!model) return 'error';
  const m = model as Model;
  try {
    const tokens = tokenize(text);
    const vocabSize = m.vocabulary.length;
    const totalDocs = m.classTotals.available + m.classTotals.unavailable;
    function score(label: Label): number {
      let s = Math.log(m.classTotals[label] / totalDocs);
      for (const t of tokens) {
        const count = m.tokenCounts[label][t] || 0;
        s += Math.log((count + 1) / (m.tokenTotals[label] + vocabSize));
      }
      return s;
    }
    return score('available') > score('unavailable') ? 'available' : 'unavailable';
  } catch (e) {
    debug(`Prediction failed: ${e}`);
    return 'error';
  }
}
