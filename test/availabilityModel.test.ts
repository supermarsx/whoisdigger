/**
 * Tests for availabilityModel (app/ts/ai/availabilityModel.ts)
 */

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

jest.mock('../app/ts/common/settings.js', () => ({
  settings: {
    ai: {
      enabled: true,
      modelPath: 'test-model.json',
      dataPath: 'ai',
    },
  },
  getUserDataPath: () => '/tmp',
}));

// Mock fs for loadModel
const mockReadFile = jest.fn();
jest.mock('fs', () => ({
  promises: {
    readFile: (...args: unknown[]) => mockReadFile(...args),
  },
}));

import { predict, loadModel, type Model } from '../app/ts/ai/availabilityModel.js';

const sampleModel: Model = {
  vocabulary: ['no', 'match', 'domain', 'status', 'ok', 'registrar', 'expiry'],
  classTotals: { available: 50, unavailable: 50 },
  tokenTotals: { available: 200, unavailable: 200 },
  tokenCounts: {
    available: { no: 40, match: 35, domain: 10 },
    unavailable: { status: 30, ok: 25, registrar: 20, expiry: 15 },
  },
};

describe('predict()', () => {
  it('returns error when no model is loaded', () => {
    expect(predict('No match for domain')).toBe('error');
  });

  it('returns available for text with available-like tokens after model load', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(sampleModel));
    await loadModel('test-model.json');

    const result = predict('No match for domain example.com');
    expect(result).toBe('available');
  });

  it('returns unavailable for text with unavailable-like tokens', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(sampleModel));
    await loadModel('test-model.json');

    const result = predict('Domain Status ok Registrar GoDaddy Expiry 2030');
    expect(result).toBe('unavailable');
  });

  it('handles empty text', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(sampleModel));
    await loadModel('test-model.json');

    const result = predict('');
    // With no tokens, prior probabilities are equal, so it depends on log(prior)
    expect(['available', 'unavailable']).toContain(result);
  });

  it('handles unknown tokens gracefully', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(sampleModel));
    await loadModel('test-model.json');

    const result = predict('xyz abc 123 unknown tokens everywhere');
    expect(['available', 'unavailable']).toContain(result);
  });
});

describe('loadModel()', () => {
  it('loads model from file', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(sampleModel));
    await expect(loadModel('model.json')).resolves.toBeUndefined();
  });

  it('throws on invalid model path (path traversal)', async () => {
    await expect(loadModel('../../etc/passwd')).rejects.toThrow('Invalid model path');
  });

  it('throws on file read error', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    await expect(loadModel('nonexistent.json')).rejects.toThrow('ENOENT');
  });
});
