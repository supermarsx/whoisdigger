// Ensure global jQuery and DataTables are available for UMD plugins before feature modules.
import 'jquery';
import 'datatables.net';

import '../features/index.js';
import { debugFactory } from '../../common/logger.js';

const debug = debugFactory('renderer.core.featureRuntime');
debug('loaded');
