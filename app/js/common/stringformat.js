// jshint esversion: 8

/*
  .format String Prototype
    formats a given string with input parameters
  parameters
    string + x (string) - String to include in string
 */
String.prototype.format = function() {
  var a = this;
  for (var k in arguments) {
    a = a.replace(new RegExp("\\{" + k + "\\}", 'g'), arguments[k]);
  }
  return a;
};

exports = String.prototype.format;
