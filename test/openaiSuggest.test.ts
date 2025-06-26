import { suggestWords } from '../app/ts/ai/openaiSuggest';
import { settings } from '../app/ts/common/settings';

describe('openai suggestions', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  test('returns suggestions when api reachable', async () => {
    settings.ai.openai.url = 'https://api';
    settings.ai.openai.apiKey = 'key';
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'one\ntwo\nthree' } }] })
    });
    const res = await suggestWords('hi', 2);
    expect(fetch).toHaveBeenCalled();
    expect(res).toEqual(['one', 'two']);
  });

  test('returns empty array when disabled', async () => {
    settings.ai.openai.url = '';
    settings.ai.openai.apiKey = '';
    const res = await suggestWords('hi', 3);
    expect((fetch as jest.Mock).mock.calls.length).toBe(0);
    expect(res).toEqual([]);
  });
});
