var spawn = require('child_process').spawn;

exports.whois = function (ip, callback) {
	var prc = spawn('whois',  [ip]);
	var whoisObj = {};
	//noinspection JSUnresolvedFunction
	prc.stdout.setEncoding('utf8');
	prc.stdout.on('data', function (data) {
		var str = data.toString()
		var lines = str.split(/(\r?\n)/g);
		//console.log("whois:received data:" + lines.length);
		for (var i in lines){
			var line = lines[i];
			//console.log("data:" + line);
			//console.log("whois:processing line:" + (line && line.trim()) + ' '  + (line.indexOf('%') != 0) + '' +  (line.indexOf('#') != 0));
			if (line && line.trim() && line.indexOf('%') != 0 && line.indexOf('#') != 0){
				var dataValuePair =  line.split(":");
				if (dataValuePair.length == 2) {
				    var name = dataValuePair[0].trim()
				    , value = dataValuePair[1].trim();
				    if (whoisObj[name] instanceof Array) {
    						whoisObj[name].push(value);
                    } else { 
    				    if (whoisObj[name] && whoisObj[name] != value) { 
    				        //if there is serveral values with same name ogranizing them as array
    				        var tmp = whoisObj[name];
        					whoisObj[name] = [];
        					whoisObj[name].push(tmp);
        					whoisObj[name].push(value);
    				    }	
        				else 
    						whoisObj[name] = value;
                    }
				}
			}
			
		}
		//console.log(lines.join(""));
	});

	prc.on('close', function (code) {
		//console.log('process exit code ' + code);
		//console.log('whois ' + JSON.stringify(whoisObj, null, 4));
		callback(null, whoisObj);
	});
};

