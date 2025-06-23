
import * as readline from 'readline';
import * as fs from 'fs';

/*
  lineCount
    Count lines within a string
  parameters
    text (string) - string to count lines from
    newLineChar (string) - new line character
 */
export function lineCount(text: string, newLineChar = '\n'): number { // '\n' unix; '\r' macos; '\r\n' windows
  if (newLineChar === '') {
    return 0;
  }
  return text.split(newLineChar).length - 1;
}

/*
  fileReadLines
    Read a determined quantity of lines from a specific file
  parameters
    filePath (string) - file path to read lines from
    lines (integer) - line quantity to read from file
    startLine (integer) - line to start reading from
 */
export function fileReadLines(filePath: string, lines = 2, startLine = 0): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let lineCounter = 0;
    const linesRead: string[] = [];
    const lineReader = readline.createInterface({
      input: fs.createReadStream(filePath),
    });

    lineReader.on('line', (line: string) => {
      if (lineCounter >= startLine && linesRead.length < lines) {
        linesRead.push(line);
        if (linesRead.length >= lines) {
          lineReader.close();
          return;
        }
      }
      lineCounter++;
    });

    lineReader.on('close', () => {
      resolve(linesRead);
    });

    lineReader.on('error', (err: Error) => {
      lineReader.close();
      reject(err);
    });
  });
}

const LineHelper = {
  lineCount,
  fileReadLines,
};

export default LineHelper;
