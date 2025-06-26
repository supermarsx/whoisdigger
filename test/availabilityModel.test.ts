import fs from 'fs';
import path from 'path';
import '../test/electronMock';
import { loadModel, predict } from '../app/ts/ai/availabilityModel';
import { settings, getUserDataPath } from '../app/ts/common/settings';
import { trainFromSamples } from '../scripts/train-ai';

const modelDir = 'ai-test-model';

describe('availabilityModel', () => {
  beforeEach(() => {
    settings.ai.dataPath = modelDir;
    settings.ai.modelPath = 'model.json';
    fs.rmSync(path.join(getUserDataPath(), modelDir), { recursive: true, force: true });
  });

  test('loadModel rejects on missing file', async () => {
    await expect(loadModel(settings.ai.modelPath)).rejects.toThrow();
  });

  test('predict returns loaded result', async () => {
    const base = path.join(getUserDataPath(), modelDir);
    const dest = path.join(base, settings.ai.modelPath);
    const model = trainFromSamples([
      { text: 'Domain Status:ok', label: 'available' },
      { text: 'No match', label: 'unavailable' }
    ]);
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.writeFile(dest, JSON.stringify(model));

    await loadModel(settings.ai.modelPath);
    const res = predict('Domain Status:ok');
    expect(res).toBe('available');
  });
});
