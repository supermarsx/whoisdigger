import request from 'supertest';

jest.mock('../app/ts/common/lookup', () => ({
  lookup: jest.fn(async () => 'lookup-data')
}));

jest.mock('../app/ts/cli', () => ({
  lookupDomains: jest.fn(async () => ['bulk-data'])
}));

import { createServer } from '../app/ts/server/index';
import { lookup } from '../app/ts/common/lookup';
import { lookupDomains } from '../app/ts/cli';

let server: ReturnType<ReturnType<typeof createServer>['listen']>;

beforeEach(() => {
  const app = createServer();
  server = app.listen();
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('server routes', () => {
  test('missing domain returns 400', async () => {
    const res = await request(server).post('/lookup').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'domain required' });
  });

  test('valid single lookup', async () => {
    const res = await request(server).post('/lookup').send({ domain: 'example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ result: 'lookup-data' });
    expect(lookup).toHaveBeenCalledWith('example.com');
  });

  test('bulk lookup with valid payload', async () => {
    const payload = { domains: ['a.com'], tlds: ['com', 'net'], proxy: 'p' };
    const res = await request(server).post('/bulk-lookup').send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ result: ['bulk-data'] });
    expect(lookupDomains).toHaveBeenCalledWith({ ...payload, format: 'txt' });
  });

  test('bulk lookup with invalid payload', async () => {
    const res = await request(server).post('/bulk-lookup').send({ domains: 'a.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ result: ['bulk-data'] });
    expect(lookupDomains).toHaveBeenCalledWith({
      domains: [],
      tlds: ['com'],
      proxy: undefined,
      format: 'txt'
    });
  });
});
