import fs from 'fs';
import path from 'path';
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
});
