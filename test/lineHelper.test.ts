import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { EventEmitter } from 'events';
import { lineCount, fileReadLines } from '../app/ts/common/lineHelper';

// Hoistable mocks for core modules used inside the implementation
const actualFs: typeof import('fs') = jest.requireActual('fs');
const actualReadline: typeof import('readline') = jest.requireActual('readline');
const mockCreateReadStream = jest.fn(actualFs.createReadStream.bind(actualFs));
const mockCreateInterface = jest.fn(actualReadline.createInterface.bind(actualReadline));
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    __esModule: true,
    default: actual,
    ...actual,
    createReadStream: (...args: any[]) => mockCreateReadStream(...args)
  };
});
jest.mock('readline', () => {
  const actual = jest.requireActual('readline');
  return {
    __esModule: true,
    default: actual,
    ...actual,
    createInterface: (...args: any[]) => mockCreateInterface(...args)
  };
});

describe('lineHelper', () => {
  test('lineCount handles Windows newline sequences', () => {
    const text = 'a\r\nb\r\nc\r\n';
    expect(lineCount(text, '\r\n')).toBe(3);
  });

  test('fileReadLines respects startLine parameter', async () => {
    const tmpPath = path.join(__dirname, 'tmpfile.txt');
    fs.writeFileSync(tmpPath, 'first\nsecond\nthird\nfourth\n');
    const result = await fileReadLines(tmpPath, 2, 1);
    expect(result).toEqual(['second', 'third']);
    fs.unlinkSync(tmpPath);
  });

  test('fileReadLines closes reader on error', async () => {
    process.once('uncaughtException', () => {});
    const lineEmitter = new EventEmitter() as any;
    lineEmitter.close = jest.fn();
    const fsStream = new EventEmitter() as any;

    mockCreateReadStream.mockReturnValueOnce(fsStream as any);
    mockCreateInterface.mockReturnValueOnce(lineEmitter as any);
    // Bind underlying input stream so error listener attaches to it
    (lineEmitter as any).input = fsStream;

    const promise = fileReadLines('dummy');
    // Defer to ensure listeners are attached
    setImmediate(() => fsStream.emit('error', new Error('fail')));

    await expect(promise).rejects.toThrow('fail');
    expect(lineEmitter.close).toHaveBeenCalled();
  });
});
