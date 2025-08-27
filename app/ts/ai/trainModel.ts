import fs from 'fs';
import path from 'path';
import { debugFactory } from '../common/logger.js';
import { settings, getUserDataPath } from '../common/settings.js';
import type { Label, Model } from './availabilityModel.js';

const debug = debugFactory('ai.trainModel');

interface Sample {
  text: string;
  label: Label;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function trainFromSamples(samples: Sample[]): Model {
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

async function readDataset(file: string): Promise<Sample[]> {
  const ext = path.extname(file).toLowerCase();
  const raw = await fs.promises.readFile(file, 'utf8');
  if (ext === '.json') {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data as Sample[];
    throw new Error('Invalid JSON dataset');
  }
  if (ext === '.csv') {
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const header = lines.shift();
    if (!header) return [];
    const cols = header.split(',');
    const textIdx = cols.indexOf('text');
    const labelIdx = cols.indexOf('label');
    if (textIdx === -1 || labelIdx === -1) throw new Error('Invalid CSV header');
    return lines.map((l) => {
      const parts = l.split(',');
      return { text: parts[textIdx] ?? '', label: parts[labelIdx] as Label };
    });
  }
  throw new Error('Unsupported dataset format');
}

export async function trainModel(datasetPath: string, outPath: string): Promise<void> {
  const samples = await readDataset(datasetPath);
  if (!samples.length) throw new Error('No training data');
  const model = trainFromSamples(samples);
  const baseDir = path.resolve(getUserDataPath(), settings.ai.dataPath);
  const dest = path.resolve(baseDir, outPath);
  if (dest !== baseDir && !dest.startsWith(baseDir + path.sep)) {
    throw new Error('Invalid model path');
  }
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.writeFile(dest, JSON.stringify(model));
  debug(`Model written to ${dest}`);
}

export type { Model } from './availabilityModel.js';
