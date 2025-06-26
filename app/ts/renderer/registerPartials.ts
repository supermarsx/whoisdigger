import Handlebars from 'handlebars/runtime';

import bwEntry from '../../compiled-templates/bwEntry.cjs';
import bwExport from '../../compiled-templates/bwExport.cjs';
import bwExportLoading from '../../compiled-templates/bwExportLoading.cjs';
import bwFileInputConfirm from '../../compiled-templates/bwFileInputConfirm.cjs';
import bwFileInputLoading from '../../compiled-templates/bwFileInputLoading.cjs';
import bwProcessing from '../../compiled-templates/bwProcessing.cjs';
import bwWordlistConfirm from '../../compiled-templates/bwWordlistConfirm.cjs';
import bwWordlistInput from '../../compiled-templates/bwWordlistInput.cjs';
import bwWordlistLoading from '../../compiled-templates/bwWordlistLoading.cjs';
import bwaAnalyser from '../../compiled-templates/bwaAnalyser.cjs';
import bwaEntry from '../../compiled-templates/bwaEntry.cjs';
import bwaFileInputLoading from '../../compiled-templates/bwaFileInputLoading.cjs';
import bwaFileinputconfirm from '../../compiled-templates/bwaFileinputconfirm.cjs';
import bwaProcess from '../../compiled-templates/bwaProcess.cjs';
import navBottom from '../../compiled-templates/navBottom.cjs';
import navTop from '../../compiled-templates/navTop.cjs';
import opEntry from '../../compiled-templates/opEntry.cjs';
import singlewhois from '../../compiled-templates/singlewhois.cjs';
import toEntry from '../../compiled-templates/toEntry.cjs';
import he from '../../compiled-templates/he.cjs';
import modals from '../../compiled-templates/modals.cjs';

export function registerPartials(): void {
  const partials: Record<string, any> = {
    bwEntry: Handlebars.template((bwEntry as any).default || (bwEntry as any)),
    bwExport: Handlebars.template((bwExport as any).default || (bwExport as any)),
    bwExportLoading: Handlebars.template(
      (bwExportLoading as any).default || (bwExportLoading as any)
    ),
    bwFileInputConfirm: Handlebars.template(
      (bwFileInputConfirm as any).default || (bwFileInputConfirm as any)
    ),
    bwFileInputLoading: Handlebars.template(
      (bwFileInputLoading as any).default || (bwFileInputLoading as any)
    ),
    bwProcessing: Handlebars.template((bwProcessing as any).default || (bwProcessing as any)),
    bwWordlistConfirm: Handlebars.template(
      (bwWordlistConfirm as any).default || (bwWordlistConfirm as any)
    ),
    bwWordlistInput: Handlebars.template(
      (bwWordlistInput as any).default || (bwWordlistInput as any)
    ),
    bwWordlistLoading: Handlebars.template(
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
    opEntry: Handlebars.template((opEntry as any).default || (opEntry as any)),
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
