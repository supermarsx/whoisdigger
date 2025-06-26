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

const app = createServer();

describe('server endpoints', () => {
  test('POST /lookup returns data', async () => {
    const res = await request(app).post('/lookup').send({ domain: 'example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ result: 'lookup-data' });
    expect(lookup).toHaveBeenCalledWith('example.com');
  });

  test('POST /bulk-lookup returns data', async () => {
    const res = await request(app)
      .post('/bulk-lookup')
      .send({ domains: ['a.com'] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ result: ['bulk-data'] });
    expect(lookupDomains).toHaveBeenCalled();
  });
});
