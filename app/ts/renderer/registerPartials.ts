import Handlebars from '../../vendor/handlebars.runtime.js';
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.registerPartials');
debug('loaded');

import bwEntry from '../../compiled-templates/bulkwhoisEntry.js';
import bwExport from '../../compiled-templates/bulkwhoisExport.js';
import bwExportLoading from '../../compiled-templates/bulkwhoisExportLoading.js';
import bwFileInputConfirm from '../../compiled-templates/bulkwhoisFileInputConfirm.js';
import bwFileInputLoading from '../../compiled-templates/bulkwhoisFileInputLoading.js';
import bwProcessing from '../../compiled-templates/bulkwhoisProcessing.js';
import bwWordlistConfirm from '../../compiled-templates/bulkwhoisWordlistConfirm.js';
import bwWordlistInput from '../../compiled-templates/bulkwhoisWordlistInput.js';
import bwWordlistLoading from '../../compiled-templates/bulkwhoisWordlistLoading.js';
import bwaAnalyser from '../../compiled-templates/bwaAnalyser.js';
import bwaEntry from '../../compiled-templates/bwaEntry.js';
import bwaFileInputLoading from '../../compiled-templates/bwaFileInputLoading.js';
import bwaFileinputconfirm from '../../compiled-templates/bwaFileinputconfirm.js';
import bwaProcess from '../../compiled-templates/bwaProcess.js';
import navBottom from '../../compiled-templates/navBottom.js';
import navTop from '../../compiled-templates/navTop.js';
import settingsEntry from '../../compiled-templates/settingsEntry.js';
import singlewhois from '../../compiled-templates/singlewhois.js';
import toEntry from '../../compiled-templates/toEntry.js';
import he from '../../compiled-templates/he.js';
import modals from '../../compiled-templates/modals.js';

export function registerPartials(): void {
  const partials: Record<string, any> = {
    bulkwhoisEntry: Handlebars.template((bwEntry as any).default || (bwEntry as any)),
    bulkwhoisExport: Handlebars.template((bwExport as any).default || (bwExport as any)),
    bulkwhoisExportLoading: Handlebars.template(
      (bwExportLoading as any).default || (bwExportLoading as any)
    ),
    bulkwhoisFileInputConfirm: Handlebars.template(
      (bwFileInputConfirm as any).default || (bwFileInputConfirm as any)
    ),
    bulkwhoisFileInputLoading: Handlebars.template(
      (bwFileInputLoading as any).default || (bwFileInputLoading as any)
    ),
    bulkwhoisProcessing: Handlebars.template(
      (bwProcessing as any).default || (bwProcessing as any)
    ),
    bulkwhoisWordlistConfirm: Handlebars.template(
      (bwWordlistConfirm as any).default || (bwWordlistConfirm as any)
    ),
    bulkwhoisWordlistInput: Handlebars.template(
      (bwWordlistInput as any).default || (bwWordlistInput as any)
    ),
    bulkwhoisWordlistLoading: Handlebars.template(
      (bwWordlistLoading as any).default || (bwWordlistLoading as any)
    ),
    bwaAnalyser: Handlebars.template((bwaAnalyser as any).default || (bwaAnalyser as any)),
    bwaEntry: Handlebars.template((bwaEntry as any).default || (bwaEntry as any)),
    bwaFileInputLoading: Handlebars.template(
      (bwaFileInputLoading as any).default || (bwaFileInputLoading as any)
    ),
    bwaFileinputconfirm: Handlebars.template(
      (bwaFileinputconfirm as any).default || (bwaFileinputconfirm as any)
    ),
    bwaProcess: Handlebars.template((bwaProcess as any).default || (bwaProcess as any)),
    navBottom: Handlebars.template((navBottom as any).default || (navBottom as any)),
    navTop: Handlebars.template((navTop as any).default || (navTop as any)),
    settingsEntry: Handlebars.template((settingsEntry as any).default || (settingsEntry as any)),
    singlewhois: Handlebars.template((singlewhois as any).default || (singlewhois as any)),
    toEntry: Handlebars.template((toEntry as any).default || (toEntry as any)),
    he: Handlebars.template((he as any).default || (he as any)),
    modals: Handlebars.template((modals as any).default || (modals as any))
  };
  for (const [name, template] of Object.entries(partials)) {
    Handlebars.registerPartial(name, template);
  }
}

export default registerPartials;
