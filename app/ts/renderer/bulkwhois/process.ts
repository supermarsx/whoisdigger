import { debugFactory } from '../../common/logger.js';
import { registerResultListener, getBulkResults } from './state.js';
import { registerStatusUpdates } from './status-handler.js';
import { bindProcessingEvents } from './event-bindings.js';

const debug = debugFactory('bulkwhois.process');
debug('loaded');

export { getBulkResults };

export function initialize(): void {
  registerResultListener();
  registerStatusUpdates();
  bindProcessingEvents();
}
