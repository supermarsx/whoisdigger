const os = require('os'),
	log = console.log.bind(console),
	changeCase = require('change-case'),
	htmlEntities = require('html-entities').XmlEntities;

const DELIMITER = ':';

var stripHTMLEntitites = function(rawData){
	var entities = new htmlEntities();
	return entities.decode(rawData);
}

var parseRawData = function(rawData) {

	var result = {};

	rawData = stripHTMLEntitites(rawData)
	rawData = rawData.replace(/:\s*\n(?=((?!:).)*$)/gm, ': ');
	var lines = rawData.split('\n');
	console.log(rawData);


	for (var i = 0; i < lines.length; ++i) {
		line = lines[i].trim();

		if ( line && line.includes(DELIMITER+' ') ) {
			var lineParts = line.split(DELIMITER);

			// 'Greater than' since lines often have more than one colon, eg values with URLs
			if ( lineParts.length >= 2 ) {
				var key = changeCase.camelCase(lineParts[0]),
					value = lineParts.splice(1).join(DELIMITER).trim()

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
