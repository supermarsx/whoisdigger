let decodeHtml: (input: string) => string;

function camelCase(input: string): string {
  const parts = input.replace(/^[^a-zA-Z0-9]+/, '').split(/[^a-zA-Z0-9]+/);
  return parts
    .filter(Boolean)
    .map((p, i) => (i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join('');
}

export function preStringStrip(str: string): string {
  return str.toString().replace(/\:\t{1,2}/g, ': ');
}

function stripHTMLEntities(rawData: string): string {
  if (!decodeHtml) {
    if (typeof window === 'undefined') {
      // Node/Electron main: use a minimal, synchronous HTML entity decoder
      const named: Record<string, string> = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'"
      };
      const decodeNumeric = (str: string): string =>
        str
          .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
          .replace(/&#x([\da-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
      decodeHtml = (input: string): string =>
        decodeNumeric(
          input.replace(/&([a-zA-Z]+);/g, (_, name) => (name in named ? named[name] : `&${name};`))
        );
    } else {
      const textarea = document.createElement('textarea');
      decodeHtml = (input: string): string => {
        textarea.innerHTML = input;
        return textarea.value;
      };
    }
  }
  return decodeHtml(rawData);
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
        const key = camelCase(lineParts[0]);
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
  resultsText:
    | string
    | Record<string, unknown>
    | Array<{ data: string } | { data: Record<string, string> }>
    | null
    | undefined
): Record<string, unknown> | string {
  if (resultsText == null) return {};
  if (typeof resultsText === 'string') {
    if (resultsText.includes('lookup: timeout')) return 'timeout';
    return parseRawData(preStringStrip(resultsText));
  }
  if (Array.isArray(resultsText)) {
    (resultsText as Array<{ data: string | Record<string, string> }>).map(function (item) {
      if (typeof item.data === 'string') {
        item.data = parseRawData(item.data as string);
      }
      return item;
    });
    return resultsText as unknown as Record<string, unknown>;
  }
  // Already an object; return as-is
  return resultsText as Record<string, unknown>;
}

export default parseRawData;
