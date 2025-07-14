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

const mockLookup = lookup as jest.Mock;
const mockLookupDomains = lookupDomains as jest.Mock;

const app = createServer();

describe('server endpoints', () => {
  test('POST /lookup returns data', async () => {
    const res = await request(app).post('/lookup').send({ domain: 'example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ result: 'lookup-data' });
    expect(lookup).toHaveBeenCalledWith('example.com');
  });

  test('POST /lookup without domain returns 400', async () => {
    const res = await request(app).post('/lookup').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'domain required' });
  });

  test('POST /lookup handles errors', async () => {
    mockLookup.mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).post('/lookup').send({ domain: 'bad.com' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'fail' });
  });

  test('POST /bulk-lookup returns data', async () => {
    const res = await request(app)
      .post('/bulk-lookup')
      .send({ domains: ['a.com'] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ result: ['bulk-data'] });
    expect(lookupDomains).toHaveBeenCalled();
  });

  test('POST /bulk-lookup handles errors', async () => {
    mockLookupDomains.mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).post('/bulk-lookup').send({ domains: [] });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'fail' });
  });

  test('rejects bodies over 1mb', async () => {
    const large = 'a'.repeat(1024 * 1024 + 1);
    const res = await request(app).post('/lookup').send({ big: large });
    expect(res.status).toBe(413);
  });

  test('bulk-lookup rejects bodies over 1mb', async () => {
    const large = 'a'.repeat(1024 * 1024 + 1);
    const res = await request(app).post('/bulk-lookup').send({ big: large });
    expect(res.status).toBe(413);
  });
});
