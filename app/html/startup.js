const { default: registerPartials } = require('../ts/renderer/registerPartials.js');

registerPartials().then(() => {
  require('../ts/mainPanel.js');
});
