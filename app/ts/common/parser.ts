import * as changeCase from '../../vendor/change-case.js';
import { decode } from '../../vendor/html-entities/index.js';

export function preStringStrip(str: string): string {
  return str.toString().replace(/\:\t{1,2}/g, ': ');
}

function stripHTMLEntities(rawData: string): string {
  return decode(rawData);
}

function filterColonChar(rawData: string): string {
  return rawData.replace(/:\s*\n(?=((?!:).)*$)/gm, ': ');
}

export function parseRawData(rawData: string): Record<string, string> {
  const DELIMITER = ':';
  const result: Record<string, string> = {};

  rawData = stripHTMLEntities(rawData);
  rawData = filterColonChar(rawData);
  rawData = rawData.replace(/\r\n?/g, '\n');
  const lines = rawData.split(/\r?\n/);

  for (let i = 0; i < lines.length; ++i) {
    let line = lines[i].trim();

    if (line && line.includes(DELIMITER + ' ')) {
      const lineParts = line.split(DELIMITER);
      if (lineParts.length >= 2) {
        const key = changeCase.camelCase(lineParts[0]);
        const value = lineParts.splice(1).join(DELIMITER).trim();
        if (key in result) {
          result[key] += ` ${value}`;
        } else {
          result[key] = value;
        }
      }
    }
  }

  return result;
}

export function toJSON(
  resultsText: string | Record<string, unknown> | Array<{ data: string }>
): Record<string, unknown> | string {
  if (typeof resultsText === 'string' && resultsText.includes('lookup: timeout')) return 'timeout';

  if (typeof resultsText === 'object') {
    (resultsText as Array<{ data: string | Record<string, string> }>).map(function (data) {
      data.data = parseRawData(data.data as string);
      return data;
    });
    return resultsText as Record<string, unknown>;
  } else {
    return parseRawData(preStringStrip(resultsText));
  }
}

export default parseRawData;
