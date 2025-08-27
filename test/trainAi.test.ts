import fs from 'fs';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';

describe('trainModel', () => {
  test('builds vocabulary and class totals from dataset', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'train-'));
    jest.resetModules();
    jest.doMock('../app/ts/common/settings.js', () => {
      const actual = jest.requireActual('../app/ts/common/settings.js');
      return { ...actual, getUserDataPath: () => tmp };
    });
    const { trainModel } = await import('../app/ts/ai/trainModel.js');
    const { settings } = await import('../app/ts/common/settings.js');
    const dataset = path.join(tmp, 'dataset.json');
    const samples = [
      { text: 'No match for domain example.com', label: 'available' },
      { text: 'Domain Status:ok\nExpiry Date:2030-01-01', label: 'unavailable' }
    ];
    fs.writeFileSync(dataset, JSON.stringify(samples));
    await trainModel(dataset, 'model.json');
    const modelPath = path.join(tmp, settings.ai.dataPath, 'model.json');
    const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    expect(model.classTotals).toEqual({ available: 1, unavailable: 1 });
    expect(new Set(model.vocabulary)).toEqual(
      new Set([
        'no',
        'match',
        'for',
        'domain',
        'example',
        'com',
        'status',
        'ok',
        'expiry',
        'date',
        '2030',
        '01'
      ])
    );
  });
});
