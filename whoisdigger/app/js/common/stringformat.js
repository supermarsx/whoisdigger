// String format function
String.prototype.format = function() {
  var a = this;
  for (var k in arguments) {
    a = a.replace(new RegExp("\\{" + k + "\\}", 'g'), arguments[k]);
  }
  return a;
}

module.exports = String.prototype.format;
