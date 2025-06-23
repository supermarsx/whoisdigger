import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { EventEmitter } from 'events';
import { lineCount, fileReadLines } from '../app/ts/common/lineHelper';

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
    const lineEmitter = new EventEmitter() as any;
    lineEmitter.close = jest.fn();
    const fsStream = new EventEmitter() as any;

    const fsSpy = jest.spyOn(fs, 'createReadStream').mockReturnValue(fsStream);
    const rlSpy = jest
      .spyOn(readline, 'createInterface')
      .mockReturnValue(lineEmitter);

    const promise = fileReadLines('dummy');
    lineEmitter.emit('error', new Error('fail'));

    await expect(promise).rejects.toThrow('fail');
    expect(lineEmitter.close).toHaveBeenCalled();

    fsSpy.mockRestore();
    rlSpy.mockRestore();
  });
});
