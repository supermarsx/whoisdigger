import registerPartials from '../ts/renderer/registerPartials.js';

await registerPartials();
await import('../ts/mainPanel.js');
