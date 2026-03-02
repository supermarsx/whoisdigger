/**
 * @deprecated AI model training is now handled by the Rust wd-ai crate.
 * WHOIS lookups, parsing, and availability checks all run in the Rust backend.
 * This file retains only the pure ML helper functions for reference/testing.
 * To train a model, use the Tauri `ai_train` command from the application UI.
 */

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
