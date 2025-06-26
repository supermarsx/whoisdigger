import fs from 'fs';
import path from 'path';
import '../test/electronMock';
import { settings, getUserDataPath } from '../app/ts/common/settings';
import { loadModel } from '../app/ts/ai/availabilityModel';
import { trainFromSamples } from '../scripts/train-ai';
import { isDomainAvailable } from '../app/ts/common/availability';

describe('isDomainAvailable with AI', () => {
  const dir = 'ai-int';

  beforeAll(async () => {
    settings.ai.enabled = true;
    settings.ai.dataPath = dir;
    settings.ai.modelPath = 'model.json';
    const base = path.join(getUserDataPath(), dir);
    const dest = path.join(base, 'model.json');
    const model = trainFromSamples([
      { text: 'Domain Status:ok', label: 'available' },
      { text: 'No match', label: 'unavailable' }
    ]);
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.writeFile(dest, JSON.stringify(model));
    await loadModel(settings.ai.modelPath);
  });

  afterAll(() => {
    settings.ai.enabled = false;
    fs.rmSync(path.join(getUserDataPath(), dir), { recursive: true, force: true });
  });

  test('returns ai prediction when enabled', () => {
    const res = isDomainAvailable('Domain Status:ok');
    expect(res).toBe('available');
  });
});
