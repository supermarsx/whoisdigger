import registerPartials from '../ts/renderer/services/register-partials.js';

await registerPartials();
await import('../ts/mainPanel.js');
