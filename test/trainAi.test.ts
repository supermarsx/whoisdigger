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
});
