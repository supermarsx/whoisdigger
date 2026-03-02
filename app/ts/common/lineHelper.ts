/*
  lineCount
    Count lines within a string
  parameters
    text (string) - string to count lines from
    newLineChar (string) - new line character
 */
export function lineCount(text: string, newLineChar = '\n'): number {
  // '\n' unix; '\r' macos; '\r\n' windows
  if (newLineChar === '') {
    return 0;
  }
  return text.split(newLineChar).length - 1;
}

const LineHelper = {
  lineCount,
};

export default LineHelper;
