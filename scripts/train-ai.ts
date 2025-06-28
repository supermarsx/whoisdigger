import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { settings, getUserDataPath } from '../app/ts/common/settings.js';
import { lookup } from '../app/ts/common/lookup.js';
import { toJSON } from '../app/ts/common/parser.js';
import { isDomainAvailable } from '../app/ts/common/availability.js';

type Label = 'available' | 'unavailable';

export interface TrainingSample {
  text: string;
  label: Label;
}

export interface Model {
  vocabulary: string[];
  classTotals: Record<Label, number>;
  tokenTotals: Record<Label, number>;
  tokenCounts: Record<Label, Record<string, number>>;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function trainFromSamples(samples: TrainingSample[]): Model {
  const vocabulary = new Set<string>();
  const classTotals: Record<Label, number> = { available: 0, unavailable: 0 };
  const tokenTotals: Record<Label, number> = { available: 0, unavailable: 0 };
  const tokenCounts: Record<Label, Record<string, number>> = {
    available: {},
    unavailable: {}
  };
  for (const sample of samples) {
    const tokens = tokenize(sample.text);
    classTotals[sample.label]++;
    tokenTotals[sample.label] += tokens.length;
    for (const t of tokens) {
      vocabulary.add(t);
      tokenCounts[sample.label][t] = (tokenCounts[sample.label][t] || 0) + 1;
    }
  }
  return {
    vocabulary: Array.from(vocabulary),
    classTotals,
    tokenTotals,
    tokenCounts
  };
}

export function predict(model: Model, text: string): Label {
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
}

async function trainDomains(domains: string[]): Promise<Model> {
  const samples: TrainingSample[] = [];
  for (const domain of domains) {
    try {
      const text = await lookup(domain);
      const json = toJSON(text) as Record<string, unknown>;
      const result = isDomainAvailable(text, json);
      if (result === 'available' || result === 'unavailable') {
        samples.push({ text, label: result });
      }
    } catch {
      // Ignore lookup errors
    }
  }
  if (!samples.length) throw new Error('no training data');
  return trainFromSamples(samples);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { lists: { type: 'string', multiple: true } }
  });
  let files: string[] = values.lists as string[];
  if (!files || files.length === 0) {
    files = fs.readdirSync('sample_lists').filter((f) => f.endsWith('.list'));
  }
  const domains: string[] = [];
  for (const f of files) {
    const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean);
    domains.push(...lines);
  }
  const model = await trainDomains(domains);
  const baseDir = path.resolve(getUserDataPath(), settings.ai.dataPath);
  const dest = path.resolve(baseDir, settings.ai.modelPath);
  if (dest !== baseDir && !dest.startsWith(baseDir + path.sep)) {
    throw new Error('Invalid model path');
  }
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.writeFile(dest, JSON.stringify(model));
  console.log(`Model written to ${dest}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
