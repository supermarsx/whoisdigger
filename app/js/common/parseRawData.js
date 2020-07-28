// jshint esversion: 8

const	changeCase = require('change-case'),
	htmlEntities = require('html-entities').XmlEntities;

const DELIMITER = ':';

/*
	stripHTMLEntitites
		Strips HTML entities from a given string
	parameters
		rawData (string) - string to strip HTML entities from
 */
function stripHTMLEntitites(rawData) {
	var entities = new htmlEntities();
	return entities.decode(rawData);
}

/*
	filterColonChar
		Replaces empty space between a supposed key:value pair
	parameters
		rawData (string) - string to remove extra space from
 */
function filterColonChar(rawData) {
	return rawData.replace(/:\s*\n(?=((?!:).)*$)/gm, ': ');
}

/*
	parseRawData
		Parses raw data from a given string to a readable format
	parameters
		rawData (string) - string to parse raw data from
 */
function parseRawData(rawData) {
	var result = {};

	rawData = stripHTMLEntitites(rawData);
	rawData = filterColonChar(rawData);
	var lines = rawData.split('\n');

	for (var i = 0; i < lines.length; ++i) {
		line = lines[i].trim();

		if ( line && line.includes(DELIMITER+' ') ) {
			var lineParts = line.split(DELIMITER);

			// 'Greater than' since lines often have more than one colon, eg values with URLs
			if ( lineParts.length >= 2 ) {
				var key = changeCase.camelCase(lineParts[0]),
					value = lineParts.splice(1).join(DELIMITER).trim();

				// If multiple lines use the same key, combine the values
				if ( key in result ) {
					result[key] = `${result[key]} ${value}`;
				}
				result[key] = value;
			}
		}
	}

	return result;

}

module.exports = parseRawData;
