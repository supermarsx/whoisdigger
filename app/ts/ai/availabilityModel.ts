import fs from 'fs';
import path from 'path';
import debugModule from 'debug';
import { settings, getUserDataPath } from '../common/settings';

const debug = debugModule('ai.availabilityModel');

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
  try {
    const tokens = tokenize(text);
    const vocabSize = model.vocabulary.length;
    const totalDocs = model.classTotals.available + model.classTotals.unavailable;
    function score(label: Label): number {
      let s = Math.log(model.classTotals[label] / totalDocs);
      for (const t of tokens) {
        const count = model.tokenCounts[label][t] || 0;
        s += Math.log((count + 1) / (model.tokenTotals[label] + vocabSize));
      }
      return s;
    }
    return score('available') > score('unavailable') ? 'available' : 'unavailable';
  } catch (e) {
    debug(`Prediction failed: ${e}`);
    return 'error';
  }
}
