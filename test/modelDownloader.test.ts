import fs from 'fs';
import path from 'path';
import { PassThrough, EventEmitter } from 'stream';

jest.mock('https', () => ({ get: jest.fn() }));

const getMock = require('https').get as jest.Mock;

import { settings, getUserDataPath } from '../app/ts/common/settings';
import { downloadModel } from '../app/ts/ai/modelDownloader';

describe('model downloader', () => {
  const baseDir = path.join(getUserDataPath(), 'ai-test');
  const dest = 'model.onnx';
  const destPath = path.join(baseDir, dest);

  beforeEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
    settings.ai.dataPath = 'ai-test';
    getMock.mockReset();
  });

  afterAll(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  test('writes downloaded data to file', async () => {
    const stream = new PassThrough();
    getMock.mockImplementation((_url, cb) => {
      cb(stream);
      return new EventEmitter();
    });
    const promise = downloadModel('https://example.com/model.onnx', dest);
    stream.end('abc');
    await promise;
    const data = await fs.promises.readFile(destPath, 'utf8');
    expect(data).toBe('abc');
  });

  test('propagates request errors', async () => {
    getMock.mockImplementation(() => {
      const req = new EventEmitter();
      process.nextTick(() => req.emit('error', new Error('fail')));
      return req;
    });
    await expect(downloadModel('https://bad', dest)).rejects.toThrow('fail');
    expect(fs.existsSync(destPath)).toBe(false);
  });
});
