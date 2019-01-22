
// Read lines from file
export function fileReadLines(filePath, lines = 2) {
  var lineReader = require('readline').createInterface({
    input: require('fs').createReadStream(filePath),
  });
  var lineCounter = 0;
  var wantedLines = [];
  lineReader.on('line', function(line) {
    lineCounter++;
    wantedLines.push(line);
    if (lineCounter == lines) {
      lineReader.close();
    }
  });
  lineReader.on('close', function() {
    wantedLines;
    return wantedLines;
    //process.exit(0);
  });
}

// Read range of lines from file
export function fileReadLinesRange(filePath, startline = 0, lines = 2) {
  var endline = startline + lines;
  var lineReader = require('readline').createInterface({
    input: require('fs').createReadStream(filePath),
  });
  var lineCounter = startline;
  var wantedLines = [];
  lineReader.on('line', function(line, endline) {
    lineCounter++;
    wantedLines.push(line);
    if (lineCounter == endline) {
      lineReader.close();
    }
  });
  lineReader.on('close', function() {
    wantedLines;
    return wantedLines;
    //process.exit(0);
  });
}

// Count lines from string
function lineCount(text, newlinechar = '\n') { // '\n' unix; '\r' macos; '\r\n' windows
  var nLines = 0;
  for (var i = 0, n = text.length; i < n; ++i) {
    if (text[i] === newlinechar) {
      ++nLines;
    }
  }
  return nLines;
}

export default function() {
  return null;
}
