import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import { trainFromSamples, predict } from '../scripts/train-ai';
import DomainStatus from '../app/ts/common/status';

describe('train-ai', () => {
  test('predicts labels after training', () => {
    const samples = [
      { text: 'No match for domain example.com', label: 'available' },
      { text: 'Domain Status:ok\nExpiry Date:2030-01-01', label: 'unavailable' }
    ];
    const model = trainFromSamples(samples);
    expect(predict(model, 'Domain Status:ok')).toBe(DomainStatus.Unavailable);
    expect(predict(model, 'No match for domain test')).toBe(DomainStatus.Available);
  });

  test('runs with default lists when none supplied', async () => {
    jest.resetModules();
    const lookupMock = jest.fn(async () => 'No match for domain example.com');
    jest.doMock('../app/ts/common/lookup.js', () => ({ __esModule: true, lookup: lookupMock }));
    jest.doMock('../app/ts/common/parser.js', () => ({ __esModule: true, toJSON: () => ({}) }));
    jest.doMock('../app/ts/common/availability.js', () => ({
      __esModule: true,
      isDomainAvailable: () => 'available'
    }));
    const readdirSpy = jest.spyOn(fs, 'readdirSync').mockReturnValue(['foo.list'] as any);
    const readFileSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue('example.com');
    const mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined as any);
    const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined as any);
    const { main } = await import('../scripts/train-ai');
    await expect(main()).resolves.toBeUndefined();
    expect(readFileSpy).toHaveBeenCalledWith(path.join('sample_lists', 'foo.list'), 'utf8');
    readdirSpy.mockRestore();
    readFileSpy.mockRestore();
    mkdirSpy.mockRestore();
    writeFileSpy.mockRestore();
  });
});
