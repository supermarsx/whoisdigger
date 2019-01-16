/**
 * Usage: node test.js
 */

var whois = require('./whois');
var assert = require('assert');

function eq(a, b) {
  console.log('Test: ' + a + ' === ' + b);
  assert.strictEqual.apply(null, arguments);
}

//
// Test mime lookups
//

whois.whois('139.130.4.5', function (err, data){
    console.log(JSON.stringify(data, null, 4));
	eq('AU', data.country);     // normal file
});

console.log('\nOK');
