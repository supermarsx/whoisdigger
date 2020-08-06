// jshint esversion: 8

/*
  lineCount
    Count lines within a string
  parameters
    text (string) - string to count lines from
    newLineChar (string) - new line character
 */
function lineCount(text, newLineChar = '\n') { // '\n' unix; '\r' macos; '\r\n' windows
  var lines = 0;
  for (var char in text) lines += (lines[char] == newLineChar) ? 1 : 0;

  return lines;
}

/*
  fileReadLines
    Read a determined quantity of lines from a specific file
  parameters
    filePath (string) - file path to read lines from
    lines (integer) - line quantity to read from file
    startLine (integer) - line to start reading from
 */
function fileReadLines(filePath, lines = 2, startLine = 0) {
  var lineCounter = startLine,
    endLine = startLine + lines,
    linesRead = [],
    lineReader = require('readline').createInterface({
      input: require('fs').createReadStream(filePath),
    });

  lineReader.on('line', function(line) {
    lineCounter++;
    linesRead.push(line);
    if (lineCounter == lines) lineReader.close();
  });

  lineReader.on('close', function() {
    return linesRead;
  });

  return 0;
}

module.exports = {
  lineCount: lineCount,
  fileReadLines: fileReadLines
};
