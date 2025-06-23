
import * as changeCase from 'change-case';
import { XmlEntities } from 'html-entities';

/*
       stripHTMLEntities
		Strips HTML entities from a given string
	parameters
		rawData (string) - string to strip HTML entities from
 */
function stripHTMLEntities(rawData: string): string {
        const entities = new XmlEntities();
        return entities.decode(rawData);
}

/*
	filterColonChar
		Replaces empty space between a supposed key:value pair
	parameters
		rawData (string) - string to remove extra space from
 */
function filterColonChar(rawData: string): string {
        return rawData.replace(/:\s*\n(?=((?!:).)*$)/gm, ': ');
}

/*
	parseRawData
		Parses raw data from a given string to a readable format
	parameters
		rawData (string) - string to parse raw data from
 */
export function parseRawData(rawData: string): Record<string, string> {
        const DELIMITER = ':';
        const result: Record<string, string> = {};

       rawData = stripHTMLEntities(rawData);
	rawData = filterColonChar(rawData);
        const lines = rawData.split('\n');

        for (let i = 0; i < lines.length; ++i) {
                let line = lines[i].trim();

		if ( line && line.includes(DELIMITER + ' ') ) {
                        const lineParts = line.split(DELIMITER);

			// 'Greater than' since lines often have more than one colon, eg values with URLs
			if ( lineParts.length >= 2 ) {
                                const key = changeCase.camelCase(lineParts[0]);
                                const value = lineParts.splice(1).join(DELIMITER).trim();

                                // If multiple lines use the same key, combine the values
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

export default parseRawData;
