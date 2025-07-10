import { ensureFetch } from '../app/ts/utils/fetchCompat';

const nodeFetchMock = jest.fn();
jest.mock('node-fetch', () => ({ __esModule: true, default: nodeFetchMock }), { virtual: true });

describe('ensureFetch', () => {
  const originalFetch = (global as any).fetch;

  afterEach(() => {
    if (originalFetch === undefined) {
      delete (global as any).fetch;
    } else {
      (global as any).fetch = originalFetch;
    }
    nodeFetchMock.mockClear();
  });

  test('leaves existing fetch intact', async () => {
    const customFetch = jest.fn();
    (global as any).fetch = customFetch;
    await ensureFetch();
    expect((global as any).fetch).toBe(customFetch);
  });

  test('assigns node-fetch when fetch missing', async () => {
    delete (global as any).fetch;
    await ensureFetch();
    expect((global as any).fetch).toBe(nodeFetchMock);
  });
});
